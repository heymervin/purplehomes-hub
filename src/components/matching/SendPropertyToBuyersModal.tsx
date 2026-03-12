import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Send, Home, Loader2, Sparkles, AlertCircle, MessageSquare, Mail, ChevronDown, ChevronUp, Edit, User, Users } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { sendPropertyEmail, sendPropertySMS, generatePropertySMS } from '@/services/emailService';
import { convertPropertyDetailsToProperty } from '@/lib/propertyTypeAdapter';
import { syncMatchStageToGhl } from '@/services/ghlAssociationsApi';
import { STAGE_ASSOCIATION_IDS } from '@/types/associations';
import type { ScoredBuyer, PropertyDetails, MatchActivity, MatchActivityType } from '@/types/matching';

const AIRTABLE_API_BASE = '/api/airtable';
const GHL_API_BASE = '/api/ghl';
const GHL_PROPERTY_SENT_WEBHOOK = 'https://services.leadconnectorhq.com/hooks/fJgopVh0YwOMQJtUeQRk/webhook-trigger/ee28f7b1-eb36-45cb-a349-e855b2aa0c07';

// GHL Custom Field ID for CB Sent Properties
const GHL_CB_SENT_PROPERTIES_FIELD_ID = 'qjcg3hcF47rNRA3wmnsc';

/**
 * Property sent record structure for CB Sent Properties field
 */
interface SentPropertyRecord {
  propertyRecordId: string;
  address: string;
  city: string;
  state: string;
  price: number;
  beds: number;
  baths: number;
  dateSent: string;
  sendMethod: 'sms' | 'email' | 'sms-email';
  matchScore?: number;
}

/**
 * Update the "CB Sent Properties" field on each buyer record in both Airtable and GHL
 * Fetches current data from BOTH systems in parallel, appends new property, then updates both
 */
async function updateBuyerSentProperties(
  property: PropertyDetails,
  buyers: ScoredBuyer[],
  sendMethod: 'sms' | 'email' | 'sms-email'
): Promise<{ updated: number; failed: number; ghlSynced: number }> {
  let updated = 0;
  let failed = 0;
  let ghlSynced = 0;

  console.log(`[CB Sent Properties] Starting update for ${buyers.length} buyers, property: ${property.address}`);

  const newPropertyRecord: SentPropertyRecord = {
    propertyRecordId: property.recordId,
    address: property.address,
    city: property.city || '',
    state: property.state || '',
    price: property.price || 0,
    beds: property.beds || 0,
    baths: property.baths || 0,
    dateSent: new Date().toISOString(),
    sendMethod,
  };

  for (const sb of buyers) {
    console.log(`[CB Sent Properties] Processing buyer: ${sb.buyer.email}, recordId: ${sb.buyer.recordId}, contactId: ${sb.buyer.contactId}`);

    // Add the match score for this specific buyer
    const propertyWithScore: SentPropertyRecord = {
      ...newPropertyRecord,
      matchScore: sb.score.score,
    };

    // Fetch current values from both Airtable and GHL in parallel
    const [airtableResult, ghlResult] = await Promise.all([
      // Fetch from Airtable if recordId exists
      sb.buyer.recordId
        ? fetch(`${AIRTABLE_API_BASE}?action=get-record&table=Buyers&recordId=${sb.buyer.recordId}`)
            .then(async (res) => {
              console.log(`[CB Sent Properties] Airtable GET response status: ${res.status}`);
              if (!res.ok) return { existing: [] as SentPropertyRecord[], error: `Status ${res.status}` };
              const data = await res.json();
              console.log(`[CB Sent Properties] Airtable GET raw data keys:`, Object.keys(data.record?.fields || {}));
              const currentValue = data.record?.fields?.['CB Sent Properties'];
              console.log(`[CB Sent Properties] Airtable CB Sent Properties value:`, currentValue ? `${String(currentValue).substring(0, 100)}...` : 'empty');
              if (currentValue) {
                try {
                  const parsed = JSON.parse(currentValue);
                  return { existing: Array.isArray(parsed) ? parsed : [] };
                } catch (e) {
                  console.error(`[CB Sent Properties] Airtable JSON parse error:`, e);
                  return { existing: [] as SentPropertyRecord[] };
                }
              }
              return { existing: [] as SentPropertyRecord[] };
            })
            .catch((err) => {
              console.error(`[CB Sent Properties] Airtable fetch error:`, err);
              return { existing: [] as SentPropertyRecord[], error: String(err) };
            })
        : Promise.resolve({ existing: [] as SentPropertyRecord[], error: 'No recordId' }),

      // Fetch from GHL if contactId exists
      sb.buyer.contactId
        ? fetch(`${GHL_API_BASE}?resource=contacts&action=get&id=${sb.buyer.contactId}`)
            .then(async (res) => {
              console.log(`[CB Sent Properties] GHL GET response status: ${res.status}`);
              if (!res.ok) return { existing: [] as SentPropertyRecord[], error: `Status ${res.status}` };
              const data = await res.json();
              // GHL returns custom fields in contact.customFields or contact.customField
              const customFields = data.contact?.customFields || data.contact?.customField || [];
              console.log(`[CB Sent Properties] GHL customFields count:`, Array.isArray(customFields) ? customFields.length : 'not array');
              // Find the CB Sent Properties field by ID
              const cbField = Array.isArray(customFields)
                ? customFields.find((f: { id?: string }) => f.id === GHL_CB_SENT_PROPERTIES_FIELD_ID)
                : null;
              console.log(`[CB Sent Properties] GHL CB field found:`, cbField ? JSON.stringify(cbField).substring(0, 200) : 'not found');
              const currentValue = cbField?.value || cbField?.field_value;
              console.log(`[CB Sent Properties] GHL CB Sent Properties value:`, currentValue ? `${String(currentValue).substring(0, 100)}...` : 'empty');
              if (currentValue) {
                try {
                  const parsed = JSON.parse(currentValue);
                  return { existing: Array.isArray(parsed) ? parsed : [] };
                } catch (e) {
                  console.error(`[CB Sent Properties] GHL JSON parse error:`, e);
                  return { existing: [] as SentPropertyRecord[] };
                }
              }
              return { existing: [] as SentPropertyRecord[] };
            })
            .catch((err) => {
              console.error(`[CB Sent Properties] GHL fetch error:`, err);
              return { existing: [] as SentPropertyRecord[], error: String(err) };
            })
        : Promise.resolve({ existing: [] as SentPropertyRecord[], error: 'No contactId' }),
    ]);

    console.log(`[CB Sent Properties] Fetched - Airtable: ${airtableResult.existing.length} existing, GHL: ${ghlResult.existing.length} existing`);

    // Build updated values for each system independently
    const airtableUpdated = [...airtableResult.existing, propertyWithScore];
    const ghlUpdated = [...ghlResult.existing, propertyWithScore];

    console.log(`[CB Sent Properties] Will write to Airtable: ${airtableUpdated.length} properties (${JSON.stringify(airtableUpdated).length} bytes)`);
    console.log(`[CB Sent Properties] Will write to GHL: ${ghlUpdated.length} properties (${JSON.stringify(ghlUpdated).length} bytes)`);

    // Update both systems in parallel
    const [airtableUpdateResult, ghlUpdateResult] = await Promise.all([
      // Update Airtable
      sb.buyer.recordId
        ? (async () => {
            console.log(`[CB Sent Properties] Updating Airtable for buyer ${sb.buyer.email}, recordId: ${sb.buyer.recordId}`);
            try {
              const updateResponse = await fetch(
                `${AIRTABLE_API_BASE}?action=update-record&table=Buyers&recordId=${sb.buyer.recordId}`,
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    fields: {
                      'CB Sent Properties': JSON.stringify(airtableUpdated),
                    },
                  }),
                }
              );
              console.log(`[CB Sent Properties] Airtable response status: ${updateResponse.status}`);
              if (updateResponse.ok) {
                console.log(`[CB Sent Properties] Airtable update SUCCESS for buyer ${sb.buyer.email}`);
                return { success: true };
              } else {
                const errText = await updateResponse.text().catch(() => null);
                console.error('[CB Sent Properties] Airtable update FAILED for buyer', sb.buyer.email, 'Status:', updateResponse.status, 'Error:', errText);
                return { success: false, error: errText };
              }
            } catch (err) {
              console.error('[CB Sent Properties] Airtable update error for buyer:', sb.buyer.email, err);
              return { success: false, error: String(err) };
            }
          })()
        : Promise.resolve({ success: false, error: 'No recordId' }),

      // Update GHL
      sb.buyer.contactId
        ? (async () => {
            console.log(`[CB Sent Properties] Updating GHL for buyer ${sb.buyer.email}, contactId: ${sb.buyer.contactId}`);
            try {
              const ghlResponse = await fetch(
                `${GHL_API_BASE}?resource=contacts&action=update&id=${sb.buyer.contactId}`,
                {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    customFields: [
                      {
                        id: GHL_CB_SENT_PROPERTIES_FIELD_ID,
                        field_value: JSON.stringify(ghlUpdated),
                      },
                    ],
                  }),
                }
              );
              console.log(`[CB Sent Properties] GHL response status: ${ghlResponse.status}`);
              if (ghlResponse.ok) {
                console.log(`[CB Sent Properties] GHL update SUCCESS for buyer ${sb.buyer.email}`);
                return { success: true };
              } else {
                const ghlErr = await ghlResponse.text().catch(() => null);
                console.error('[CB Sent Properties] GHL update FAILED for buyer', sb.buyer.email, 'Status:', ghlResponse.status, 'Error:', ghlErr);
                return { success: false, error: ghlErr };
              }
            } catch (err) {
              console.error('[CB Sent Properties] GHL sync error for buyer:', sb.buyer.email, err);
              return { success: false, error: String(err) };
            }
          })()
        : Promise.resolve({ success: false, error: 'No contactId' }),
    ]);

    // Track results
    if (airtableUpdateResult.success) {
      updated++;
    } else if (sb.buyer.recordId) {
      failed++;
    }

    if (ghlUpdateResult.success) {
      ghlSynced++;
    }
  }

  console.log(`[SendPropertyToBuyers] Updated CB Sent Properties: ${updated} Airtable, ${ghlSynced} GHL, ${failed} failed`);
  return { updated, failed, ghlSynced };
}

/**
 * Trigger GHL webhook when a property is sent to buyers
 * This enables follow-up sequences in GHL
 */
async function triggerPropertySentWebhook(
  property: PropertyDetails,
  buyers: ScoredBuyer[],
  sendMethod: 'sms' | 'email' | 'sms-email'
): Promise<void> {
  // Trigger webhook for each buyer to enable individual follow-up sequences
  for (const sb of buyers) {
    try {
      const payload = {
        event: 'property_sent_to_buyer',
        timestamp: new Date().toISOString(),
        buyer: {
          contactId: sb.buyer.contactId,
          recordId: sb.buyer.recordId,
          firstName: sb.buyer.firstName,
          lastName: sb.buyer.lastName,
          email: sb.buyer.email,
          phone: sb.buyer.phone,
          language: sb.buyer.language || 'English',
        },
        properties: [{
          recordId: property.recordId,
          address: property.address,
          city: property.city,
          state: property.state,
          price: property.price,
          beds: property.beds,
          baths: property.baths,
          matchScore: sb.score.score,
          isPriority: sb.score.isPriority || false,
        }],
        sendMethod,
        propertyCount: 1,
      };

      await fetch(GHL_PROPERTY_SENT_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      console.warn('[SendPropertyToBuyers] Failed to trigger GHL webhook for buyer:', sb.buyer.email, error);
      // Don't fail the whole operation if webhook fails
    }
  }
  console.log(`[SendPropertyToBuyers] GHL webhooks triggered for ${buyers.length} buyers`);
}

interface SendPropertyToBuyersModalProps {
  property: PropertyDetails;
  buyers: ScoredBuyer[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSendSuccess?: () => void;
}

/**
 * Update or create match records when a property is sent to buyers
 * This is the "trigger" that moves matches into the Deal Pipeline
 */
async function updateBuyerMatchStages(
  property: PropertyDetails,
  buyers: ScoredBuyer[],
  activityType: MatchActivityType = 'email-sent',
  customMessage?: string
): Promise<{ updated: number; created: number; synced: number; failed: number }> {
  let updated = 0;
  let created = 0;
  let synced = 0;
  let failed = 0;

  for (const sb of buyers) {
    try {
      // Determine the activity details based on type
      const activityDetails = activityType === 'sms-sent'
        ? `SMS sent with property ${property.address}`
        : activityType === 'sms-email-sent'
        ? `SMS and Email sent with property ${property.address}`
        : `Email sent with property ${property.address}`;

      const newActivity: MatchActivity = {
        id: `act_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: activityType,
        timestamp: new Date().toISOString(),
        details: activityDetails,
        metadata: {
          recipientEmail: sb.buyer.email,
          recipientPhone: sb.buyer.phone,
          propertyCount: 1,
          customMessage: customMessage || undefined,
        },
      };

      if (sb.matchId) {
        // Update existing match record
        // First, get current activities
        const getResponse = await fetch(
          `${AIRTABLE_API_BASE}?action=get-record&table=${encodeURIComponent('Property-Buyer Matches')}&recordId=${sb.matchId}`
        );

        let currentActivities: MatchActivity[] = [];
        if (getResponse.ok) {
          const currentMatch = await getResponse.json();
          try {
            currentActivities = currentMatch.record?.fields?.Activities
              ? JSON.parse(currentMatch.record.fields.Activities)
              : [];
          } catch {
            currentActivities = [];
          }
        }

        // Update the match with new stage, date sent, and activity
        const updateResponse = await fetch(
          `${AIRTABLE_API_BASE}?action=update-record&table=${encodeURIComponent('Property-Buyer Matches')}&recordId=${sb.matchId}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fields: {
                'Match Stage': 'Sent to Buyer',
                'Date Sent': new Date().toISOString().split('T')[0],
                Activities: JSON.stringify([...currentActivities, newActivity]),
              },
            }),
          }
        );

        if (updateResponse.ok) {
          updated++;
        } else {
          // Log details for debugging and increment failure count
          const errText = await updateResponse.text().catch(() => null);
          console.error('[SendPropertyToBuyers] Failed to update match', sb.matchId, updateResponse.status, errText);
          failed++;
        }
      } else {
        // Create new match record
        const createResponse = await fetch(
          `${AIRTABLE_API_BASE}?action=create-record&table=${encodeURIComponent('Property-Buyer Matches')}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fields: {
                'Contact ID': [sb.buyer.recordId], // Link to buyer record
                'Property Code': [property.recordId], // Link to property record
                'Match Score': sb.score.score,
                'Match Notes': sb.score.reasoning || '',
                'Match Status': 'Active',
                'Match Stage': 'Sent to Buyer',
                'Date Sent': new Date().toISOString().split('T')[0],
                'Is Priority': sb.score.isPriority || false,
                'Distance': sb.score.distanceMiles || null,
                Activities: JSON.stringify([newActivity]),
              },
            }),
          }
        );

        if (createResponse.ok) {
          created++;
        } else {
          const errText = await createResponse.text().catch(() => null);
          console.error('[SendPropertyToBuyers] Failed to create match for buyer', sb.buyer.email, createResponse.status, errText);
          failed++;
        }
      }

      // Sync to GHL
      try {
        const relationId = await syncMatchStageToGhl({
          stage: 'Sent to Buyer',
          contactId: sb.buyer.contactId,
          propertyAddress: property.address,
          opportunityId: property.opportunityId,
          stageAssociationIds: STAGE_ASSOCIATION_IDS,
        });

        if (relationId) {
          synced++;
        }
      } catch (ghlError) {
        console.warn('[SendPropertyToBuyers] GHL sync failed for buyer:', sb.buyer.email, ghlError);
        // Don't fail the whole operation if GHL sync fails
      }
    } catch (error) {
      console.error('[SendPropertyToBuyers] Failed to update match for buyer:', sb.buyer.email, error);
    }
  }

  return { updated, created, synced, failed };
}

/**
 * Generate SMS message for a single property to a buyer
 */
function generateSinglePropertySMS(
  buyerFirstName: string,
  property: PropertyDetails,
  language: 'English' | 'Spanish' = 'English'
): string {
  const convertedProperty = convertPropertyDetailsToProperty(property);
  return generatePropertySMS(buyerFirstName, [convertedProperty], language);
}

export function SendPropertyToBuyersModal({
  property,
  buyers,
  open,
  onOpenChange,
  onSendSuccess,
}: SendPropertyToBuyersModalProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [customMessage, setCustomMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  // SMS/Email send options
  const [sendViaSMS, setSendViaSMS] = useState(true); // Default ON
  const [sendViaEmail, setSendViaEmail] = useState(false); // Default OFF
  const [smsMessage, setSmsMessage] = useState('');
  const [showSMSPreview, setShowSMSPreview] = useState(false);

  // Count buyers with phone/email
  const buyersWithPhone = useMemo(() => buyers.filter(sb => !!sb.buyer.phone), [buyers]);
  const buyersWithEmail = useMemo(() => buyers.filter(sb => !!sb.buyer.email), [buyers]);

  const canSendSMS = buyersWithPhone.length > 0;
  const canSendEmail = buyersWithEmail.length > 0;

  // Generate SMS message when preview is opened (use first buyer as template)
  useEffect(() => {
    if (showSMSPreview && buyers.length > 0) {
      // Use placeholder for buyer name since it will be personalized per buyer
      setSmsMessage(generateSinglePropertySMS('{Name}', property, 'English'));
    }
  }, [showSMSPreview, property, buyers.length]);

  // AI recommendation: Suggest top 3 when many buyers selected
  const showAiRecommendation = buyers.length > 5;
  const topMatches = useMemo(() => {
    return [...buyers].sort((a, b) => b.score.score - a.score.score).slice(0, 3);
  }, [buyers]);

  const avgTopScore = useMemo(() => {
    if (topMatches.length === 0) return 0;
    return Math.round(
      topMatches.reduce((sum, b) => sum + b.score.score, 0) / topMatches.length
    );
  }, [topMatches]);

  const handleSend = async () => {
    // Validate at least one send method is selected and has recipients
    const willSendSMS = sendViaSMS && canSendSMS;
    const willSendEmail = sendViaEmail && canSendEmail;

    if (!willSendSMS && !willSendEmail) {
      toast.error('Please select at least one send method with available recipients');
      return;
    }

    setIsSending(true);
    try {
      const convertedProperty = convertPropertyDetailsToProperty(property);
      const sentMethods: string[] = [];
      let smsCount = 0;
      let emailCount = 0;

      // Step 1: Send SMS to buyers with phone numbers
      if (willSendSMS) {
        for (const sb of buyersWithPhone) {
          try {
            // Generate personalized message for each buyer
            const personalizedMessage = smsMessage
              ? smsMessage.replace('{Name}', sb.buyer.firstName)
              : generateSinglePropertySMS(sb.buyer.firstName, property, sb.buyer.language || 'English');

            await sendPropertySMS(
              { contactId: sb.buyer.contactId, firstName: sb.buyer.firstName, phone: sb.buyer.phone },
              personalizedMessage
            );
            smsCount++;
          } catch (error) {
            console.error(`[SendPropertyToBuyers] SMS failed for ${sb.buyer.email}:`, error);
          }
        }
        if (smsCount > 0) {
          sentMethods.push(`SMS (${smsCount})`);
        }
      }

      // Step 2: Send Email to buyers with email addresses
      if (willSendEmail) {
        const isSpanish = false; // Could be personalized per buyer in future

        for (const sb of buyersWithEmail) {
          try {
            await sendPropertyEmail({
              contactId: sb.buyer.contactId,
              contactName: `${sb.buyer.firstName} ${sb.buyer.lastName}`,
              contactEmail: sb.buyer.email,
              properties: [convertedProperty],
              subject: isSpanish
                ? `🏡 Casas que encontramos para ti`
                : `🏡 Homes we found for you`,
              customMessage: customMessage || undefined,
              language: sb.buyer.language || 'English',
            });
            emailCount++;
          } catch (error) {
            console.error(`[SendPropertyToBuyers] Email failed for ${sb.buyer.email}:`, error);
          }
        }
        if (emailCount > 0) {
          sentMethods.push(`Email (${emailCount})`);
        }
      }

      // Determine activity type based on what was sent
      const activityType: MatchActivityType = willSendSMS && willSendEmail
        ? 'sms-email-sent'
        : willSendSMS
        ? 'sms-sent'
        : 'email-sent';

      // Step 3: Update match stages for ALL selected buyers (creates deals in pipeline)
      const { updated, created, synced, failed } = await updateBuyerMatchStages(
        property,
        buyers,
        activityType,
        customMessage
      );

      console.log(`[SendPropertyToBuyers] Updated ${updated} matches, created ${created} new matches, synced ${synced} to GHL, failed ${failed}`);

      // Step 3.5: Update "CB Sent Properties" field on each buyer record
      console.log(`[SendPropertyToBuyers] === STARTING CB Sent Properties update ===`);
      console.log(`[SendPropertyToBuyers] Property:`, property.address, property.recordId);
      console.log(`[SendPropertyToBuyers] Buyers count:`, buyers.length);
      console.log(`[SendPropertyToBuyers] Buyers with recordId:`, buyers.filter(b => b.buyer.recordId).length);
      console.log(`[SendPropertyToBuyers] Buyers with contactId:`, buyers.filter(b => b.buyer.contactId).length);

      const cbSendMethod = willSendSMS && willSendEmail
        ? 'sms-email'
        : willSendSMS
        ? 'sms'
        : 'email';
      console.log(`[SendPropertyToBuyers] Send method:`, cbSendMethod);

      try {
        const cbResult = await updateBuyerSentProperties(property, buyers, cbSendMethod);
        console.log(`[SendPropertyToBuyers] CB Sent Properties: ${cbResult.updated} Airtable, ${cbResult.ghlSynced} GHL, ${cbResult.failed} failed`);
      } catch (cbError) {
        console.error(`[SendPropertyToBuyers] CB Sent Properties ERROR:`, cbError);
      }
      console.log(`[SendPropertyToBuyers] === FINISHED CB Sent Properties update ===`);

      // Step 4: Trigger GHL webhook for follow-up sequences
      const webhookSendMethod = willSendSMS && willSendEmail
        ? 'sms-email'
        : willSendSMS
        ? 'sms'
        : 'email';
      await triggerPropertySentWebhook(property, buyers, webhookSendMethod);

      // Step 5: Sync server-side cache
      try {
        await fetch('/api/cache?action=sync&cacheKey=matches', {
          method: 'POST',
        });
        console.log('[SendPropertyToBuyers] Server cache synced');
      } catch (cacheError) {
        console.warn('[SendPropertyToBuyers] Failed to sync server cache:', cacheError);
      }

      // Step 6: Invalidate and refetch queries so UI updates immediately
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['deals'] }),
        queryClient.invalidateQueries({ queryKey: ['pipeline-stats'] }),
        queryClient.invalidateQueries({ queryKey: ['deals-by-stage'] }),
        queryClient.invalidateQueries({ queryKey: ['deals-by-buyer'] }),
        queryClient.invalidateQueries({ queryKey: ['stale-deals'] }),
        queryClient.invalidateQueries({ queryKey: ['buyers-with-matches'] }),
        queryClient.invalidateQueries({ queryKey: ['buyer-properties'] }),
        queryClient.invalidateQueries({ queryKey: ['property-buyers'] }),
        queryClient.invalidateQueries({ queryKey: ['cache', 'matches'] }),
        queryClient.invalidateQueries({ queryKey: ['match-stats'] }),
      ]);

      // Force refetch of the property's buyers to update UI immediately
      await queryClient.refetchQueries({ queryKey: ['property-buyers'] });

      // Step 7: Show appropriate toast based on results
      const sentDescription = sentMethods.join(' & ') + ' sent';
      const totalSuccessful = updated + created;

      if (totalSuccessful > 0) {
        // At least some operations succeeded
        toast.success(
          `Sent property to ${buyers.length} ${buyers.length === 1 ? 'buyer' : 'buyers'}!`,
          {
            description: synced > 0
              ? `${sentDescription} • ${totalSuccessful} deals added to pipeline • Synced to GHL`
              : `${sentDescription} • ${totalSuccessful} deals added to pipeline`,
            duration: 6000,
            action: {
              label: 'View in Pipeline',
              onClick: () => navigate('/deals'),
            },
          }
        );

        if (failed > 0) {
          toast.error(`${failed} match${failed === 1 ? '' : 'es'} failed to update — check console or server logs`);
        }

        // Call success callback and close modal
        onSendSuccess?.();
        onOpenChange(false);
      } else {
        // All operations failed
        toast.error(
          `Failed to send property to ${buyers.length === 1 ? 'buyer' : 'buyers'}`,
          {
            description: 'Could not update match records. Check console or server logs for details.',
            duration: 8000,
          }
        );
      }

      // Reset form
      setCustomMessage('');
      setSmsMessage('');
      setShowSMSPreview(false);
    } catch (error) {
      console.error('Failed to send property to buyers:', error);
      toast.error('Failed to send property', {
        description: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md flex flex-col max-h-[90vh] overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle>Send Property to Buyers</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4 overflow-y-auto flex-1 min-h-0 pr-1">
          {/* AI Recommendation Banner - Show when >5 buyers */}
          {showAiRecommendation && (
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-3">
              <div className="flex items-start gap-3">
                <div className="p-1.5 rounded-lg bg-indigo-100 shrink-0">
                  <Sparkles className="h-4 w-4 text-indigo-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-indigo-900">
                    Sending to {buyers.length} buyers
                  </p>
                  <p className="text-xs text-indigo-700 mt-0.5">
                    Consider focusing on top matches for better response rates.
                    Your top 3 average {avgTopScore}% match score.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Warning for many buyers */}
          {buyers.length > 10 && (
            <div className="flex items-start gap-2 p-2 rounded-lg bg-amber-50 border border-amber-200">
              <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800">
                Sending to {buyers.length} buyers at once. This may take a moment.
              </p>
            </div>
          )}

          {/* Property Info */}
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-lg overflow-hidden bg-purple-100 flex items-center justify-center shrink-0">
                {property.heroImage ? (
                  <img
                    src={property.heroImage}
                    alt={property.address}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Home className="h-6 w-6 text-purple-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-purple-900 truncate">
                  {property.address}
                </p>
                <p className="text-xs text-purple-700">
                  {property.city}{property.state && `, ${property.state}`}
                </p>
                <p className="text-xs text-purple-600 mt-1">
                  ${property.price?.toLocaleString()} • {property.beds} bed • {property.baths} bath
                </p>
              </div>
            </div>
          </div>

          {/* Recipients Count */}
          <div className="bg-muted/50 rounded-lg p-3 space-y-2">
            <p className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-purple-500" />
              {buyers.length} {buyers.length === 1 ? 'Buyer' : 'Buyers'} Selected
            </p>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>{buyersWithPhone.length} with phone number</p>
              <p>{buyersWithEmail.length} with email address</p>
            </div>
            <p className="text-xs text-purple-700">
              These will be added to your Deal Pipeline after sending
            </p>
          </div>

          {/* Send Via Options */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Send Via:</Label>

            {/* SMS Option */}
            <div
              className={cn(
                'border rounded-lg transition-colors',
                sendViaSMS && canSendSMS ? 'border-green-300 bg-green-50' : 'hover:bg-muted/50',
                !canSendSMS && 'opacity-50'
              )}
            >
              <div
                className="flex items-center space-x-3 p-3 cursor-pointer"
                onClick={() => canSendSMS && setSendViaSMS(!sendViaSMS)}
              >
                <Checkbox
                  checked={sendViaSMS && canSendSMS}
                  onCheckedChange={(checked) => canSendSMS && setSendViaSMS(checked as boolean)}
                  disabled={!canSendSMS}
                />
                <div className="flex-1">
                  <label className="text-sm font-medium flex items-center gap-2 cursor-pointer">
                    <MessageSquare className="h-4 w-4 text-green-600" />
                    SMS
                    {sendViaSMS && canSendSMS && (
                      <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                        {buyersWithPhone.length} recipients
                      </span>
                    )}
                  </label>
                  <p className="text-xs text-muted-foreground">
                    {canSendSMS ? 'Recommended - faster response' : 'No buyers have phone numbers'}
                  </p>
                </div>
              </div>

              {/* Expandable SMS Preview */}
              {sendViaSMS && canSendSMS && (
                <div className="px-3 pb-3 space-y-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    type="button"
                    onClick={() => setShowSMSPreview(!showSMSPreview)}
                    className="w-full justify-between h-8 text-xs"
                  >
                    <span className="flex items-center gap-1">
                      <Edit className="h-3 w-3" />
                      {showSMSPreview ? 'Hide Preview' : 'Preview & Edit Message'}
                    </span>
                    {showSMSPreview ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>

                  {showSMSPreview && (
                    <div className="space-y-2">
                      <Textarea
                        value={smsMessage}
                        onChange={(e) => setSmsMessage(e.target.value)}
                        rows={6}
                        className="text-sm font-mono bg-white"
                        placeholder="SMS message..."
                      />
                      <div className="flex justify-between text-xs">
                        <span className={smsMessage.length > 160 ? 'text-amber-600 font-medium' : 'text-muted-foreground'}>
                          {smsMessage.length} characters
                        </span>
                        <span className="text-muted-foreground">
                          {Math.ceil(smsMessage.length / 160) || 1} SMS segment{Math.ceil(smsMessage.length / 160) !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Use {'{Name}'} to personalize for each buyer
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Email Option */}
            <div
              className={cn(
                'border rounded-lg transition-colors',
                sendViaEmail && canSendEmail ? 'border-blue-300 bg-blue-50' : 'hover:bg-muted/50',
                !canSendEmail && 'opacity-50'
              )}
            >
              <div
                className="flex items-center space-x-3 p-3 cursor-pointer"
                onClick={() => canSendEmail && setSendViaEmail(!sendViaEmail)}
              >
                <Checkbox
                  checked={sendViaEmail && canSendEmail}
                  onCheckedChange={(checked) => canSendEmail && setSendViaEmail(checked as boolean)}
                  disabled={!canSendEmail}
                />
                <div className="flex-1">
                  <label className="text-sm font-medium flex items-center gap-2 cursor-pointer">
                    <Mail className="h-4 w-4 text-blue-600" />
                    Email
                    {sendViaEmail && canSendEmail && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                        {buyersWithEmail.length} recipients
                      </span>
                    )}
                  </label>
                  <p className="text-xs text-muted-foreground">
                    {canSendEmail ? 'Includes detailed property information' : 'No buyers have email addresses'}
                  </p>
                </div>
              </div>

              {/* Email Custom Message */}
              {sendViaEmail && canSendEmail && (
                <div className="px-3 pb-3 space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="custom-message" className="text-xs">
                      Custom Message (Optional)
                    </Label>
                    <Textarea
                      id="custom-message"
                      placeholder="Add a personal note to include in the email..."
                      value={customMessage}
                      onChange={(e) => setCustomMessage(e.target.value)}
                      rows={2}
                      className="resize-none text-sm"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="shrink-0 border-t pt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={isSending || ((!sendViaSMS || !canSendSMS) && (!sendViaEmail || !canSendEmail))}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {isSending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                {sendViaSMS && canSendSMS && sendViaEmail && canSendEmail
                  ? 'Send SMS & Email'
                  : sendViaSMS && canSendSMS
                  ? 'Send SMS'
                  : sendViaEmail && canSendEmail
                  ? 'Send Email'
                  : 'Send'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
