/**
 * Final Property API - React Query hooks for confirming/removing final property selection
 *
 * When a buyer decides to move forward with a specific property (out of potentially many matches),
 * this service handles:
 * 1. Marking the match as "final" in Airtable
 * 2. Syncing the final property details to the buyer's GHL opportunity
 * 3. Adding a note to the buyer's GHL contact with property details
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const GHL_API_BASE = '/api/ghl';
const AIRTABLE_API_BASE = '/api/airtable';

interface ConfirmFinalPropertyParams {
  matchId: string;
  contactId: string;
  propertyAddress: string;
  propertyOpportunityId: string;
  propertyPrice: number;
}

interface RemoveFinalPropertyParams {
  matchId: string;
  contactId: string;
}

interface GHLOpportunity {
  id: string;
  name: string;
  contactId: string;
  pipelineId: string;
  pipelineStageId: string;
  status: string;
  monetaryValue?: number;
}

/**
 * Find a buyer's opportunity in the Buyer Disposition pipeline
 */
async function findBuyerOpportunity(contactId: string): Promise<GHLOpportunity | null> {
  console.log('[Final Property API] Searching for buyer opportunity:', contactId);

  const response = await fetch(
    `${GHL_API_BASE}?resource=opportunities&pipelineType=buyer-disposition&contactId=${encodeURIComponent(contactId)}`
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to search opportunities' }));
    throw new Error(error.error || 'Failed to find buyer opportunity');
  }

  const data = await response.json();
  const opportunities = data.opportunities || [];

  console.log('[Final Property API] Found opportunities:', opportunities.length);

  // Return the first opportunity for this contact (should typically be one)
  return opportunities.length > 0 ? opportunities[0] : null;
}

/**
 * Update GHL opportunity with final property custom fields
 */
async function updateOpportunityCustomFields(
  opportunityId: string,
  customFields: {
    final_property_address: string;
    final_property_opportunity_id: string;
    final_property_price: number | string;
  }
): Promise<void> {
  console.log('[Final Property API] Updating opportunity custom fields:', opportunityId, customFields);

  const response = await fetch(`${GHL_API_BASE}?resource=opportunities&id=${opportunityId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customFields,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to update opportunity' }));
    throw new Error(error.error || 'Failed to update GHL opportunity');
  }

  console.log('[Final Property API] Opportunity updated successfully');
}

/**
 * Add a note to the buyer's GHL contact about the final property selection
 */
async function addContactNote(contactId: string, noteBody: string): Promise<void> {
  console.log('[Final Property API] Adding note to contact:', contactId);

  const response = await fetch(`${GHL_API_BASE}?resource=notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contactId, body: noteBody }),
  });

  if (!response.ok) {
    // Non-critical — log but don't throw so it doesn't block the rest of the flow
    const error = await response.json().catch(() => ({ error: 'Failed to add note' }));
    console.warn('[Final Property API] Failed to add contact note:', error);
    return;
  }

  console.log('[Final Property API] Contact note added successfully');
}

/**
 * Update Airtable match record with Is Final Property flag
 */
async function updateAirtableMatch(matchId: string, isFinalProperty: boolean): Promise<void> {
  console.log('[Final Property API] Updating Airtable match:', matchId, { isFinalProperty });

  const response = await fetch(
    `${AIRTABLE_API_BASE}?action=update-record&table=${encodeURIComponent('Property-Buyer Matches')}&recordId=${matchId}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: { 'Is Final Property': isFinalProperty },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to update match' }));
    throw new Error(error.error || 'Failed to update Airtable match');
  }

  console.log('[Final Property API] Airtable match updated successfully');
}

/**
 * Hook for confirming a property as the buyer's final selection
 *
 * This mutation:
 * 1. Updates Airtable match: Is Final Property = true
 * 2. Finds buyer opportunity in GHL Buyer Disposition pipeline
 * 3. Updates GHL opportunity with final property custom fields
 * 4. Adds a note to the buyer's GHL contact with property details
 */
export function useConfirmFinalProperty() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      matchId,
      contactId,
      propertyAddress,
      propertyOpportunityId,
      propertyPrice,
    }: ConfirmFinalPropertyParams): Promise<{ success: boolean; ghlOpportunityId?: string }> => {
      console.log('[Final Property API] Confirming final property:', {
        matchId,
        contactId,
        propertyAddress,
        propertyOpportunityId,
        propertyPrice,
      });

      // Step 1: Update Airtable
      await updateAirtableMatch(matchId, true);

      // Step 2: Find buyer's opportunity in GHL
      const opportunity = await findBuyerOpportunity(contactId);

      if (!opportunity) {
        console.warn('[Final Property API] No GHL opportunity found for contact:', contactId);
        // Still return success - Airtable was updated
        toast.warning('Property confirmed but GHL opportunity not found');
        return { success: true };
      }

      // Step 3: Update GHL opportunity with final property fields
      await updateOpportunityCustomFields(opportunity.id, {
        final_property_address: propertyAddress,
        final_property_opportunity_id: propertyOpportunityId,
        final_property_price: propertyPrice,
      });

      // Step 4: Add a note to the buyer's contact with property details
      const formattedPrice = propertyPrice
        ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(propertyPrice)
        : 'N/A';
      const noteBody = [
        '🏠 Final Property Selected',
        '',
        `Address: ${propertyAddress}`,
        `Price: ${formattedPrice}`,
        `Property ID: ${propertyOpportunityId || 'N/A'}`,
        '',
        `Selected on ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`,
      ].join('\n');

      await addContactNote(contactId, noteBody);

      return { success: true, ghlOpportunityId: opportunity.id };
    },
    onSuccess: () => {
      toast.success('Property confirmed as final selection');
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['buyers-with-matches'] });
      queryClient.invalidateQueries({ queryKey: ['properties-with-matches'] });
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['deals-by-stage'] });
    },
    onError: (error: Error) => {
      console.error('[Final Property API] Confirm final property failed:', error);
      toast.error(`Failed to confirm property: ${error.message}`);
    },
  });
}

/**
 * Hook for removing/cancelling the final property selection
 *
 * This mutation:
 * 1. Updates Airtable match: Is Final Property = false
 * 2. Finds buyer opportunity in GHL Buyer Disposition pipeline
 * 3. Clears GHL opportunity custom fields (set to empty string)
 */
export function useRemoveFinalProperty() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      matchId,
      contactId,
    }: RemoveFinalPropertyParams): Promise<{ success: boolean; ghlOpportunityId?: string }> => {
      console.log('[Final Property API] Removing final property:', { matchId, contactId });

      // Step 1: Update Airtable
      await updateAirtableMatch(matchId, false);

      // Step 2: Find buyer's opportunity in GHL
      const opportunity = await findBuyerOpportunity(contactId);

      if (!opportunity) {
        console.warn('[Final Property API] No GHL opportunity found for contact:', contactId);
        // Still return success - Airtable was updated
        toast.warning('Selection removed but GHL opportunity not found');
        return { success: true };
      }

      // Step 3: Clear GHL opportunity custom fields
      await updateOpportunityCustomFields(opportunity.id, {
        final_property_address: '',
        final_property_opportunity_id: '',
        final_property_price: '',
      });

      return { success: true, ghlOpportunityId: opportunity.id };
    },
    onSuccess: () => {
      toast.success('Final property selection removed');
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['buyers-with-matches'] });
      queryClient.invalidateQueries({ queryKey: ['properties-with-matches'] });
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['deals-by-stage'] });
    },
    onError: (error: Error) => {
      console.error('[Final Property API] Remove final property failed:', error);
      toast.error(`Failed to remove selection: ${error.message}`);
    },
  });
}
