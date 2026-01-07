import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Send, FileText, Loader2, Sparkles, AlertCircle, MessageSquare, Mail, ChevronDown, ChevronUp, Edit, Phone } from 'lucide-react';
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
import { EmailPreview } from './EmailPreview';
import type { ScoredProperty, BuyerCriteria, MatchActivity, MatchActivityType } from '@/types/matching';

const AIRTABLE_API_BASE = '/api/airtable';

interface SendPropertiesModalProps {
  buyer: BuyerCriteria;
  properties: ScoredProperty[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSendSuccess?: () => void;
  onSelectTopMatches?: (count: number) => void;
}

/**
 * Update or create match records when properties are sent
 * This is the "trigger" that moves matches into the Deal Pipeline
 */
async function updateMatchStages(
  buyer: BuyerCriteria,
  properties: ScoredProperty[],
  activityType: MatchActivityType = 'email-sent',
  customMessage?: string
): Promise<{ updated: number; created: number; synced: number; failed: number }> {
  let updated = 0;
  let created = 0;
  let synced = 0;
  let failed = 0;

  // Determine the activity details based on type
  const activityDetails = activityType === 'sms-sent'
    ? `SMS sent to ${buyer.firstName} ${buyer.lastName}`
    : activityType === 'sms-email-sent'
    ? `SMS and Email sent to ${buyer.firstName} ${buyer.lastName}`
    : `Properties email sent to ${buyer.firstName} ${buyer.lastName}`;

  for (const sp of properties) {
    try {
      const newActivity: MatchActivity = {
        id: `act_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: activityType,
        timestamp: new Date().toISOString(),
        details: activityDetails,
        metadata: {
          recipientEmail: buyer.email,
          recipientPhone: buyer.phone,
          propertyCount: properties.length,
          customMessage: customMessage || undefined,
        },
      };

      if (sp.matchId) {
        // Update existing match record
        // First, get current activities
        const getResponse = await fetch(
          `${AIRTABLE_API_BASE}?action=get-record&table=${encodeURIComponent('Property-Buyer Matches')}&recordId=${sp.matchId}`
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
          `${AIRTABLE_API_BASE}?action=update-record&table=${encodeURIComponent('Property-Buyer Matches')}&recordId=${sp.matchId}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fields: {
                'Match Stage': 'Sent to Buyer',
                'Date Sent': new Date().toISOString(),
                Activities: JSON.stringify([...currentActivities, newActivity]),
              },
            }),
          }
        );

        if (updateResponse.ok) {
          updated++;
        } else {
          const errText = await updateResponse.text().catch(() => null);
          console.error('[SendProperties] Failed to update match', sp.matchId, updateResponse.status, errText);
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
                'Contact ID': [buyer.recordId], // Link to buyer record
                'Property Code': [sp.property.recordId], // Link to property record
                'Match Score': sp.score.score,
                'Match Notes': sp.score.reasoning || '',
                'Match Status': 'Active',
                'Match Stage': 'Sent to Buyer',
                'Date Sent': new Date().toISOString(),
                'Is Priority': sp.score.isPriority || false,
                'Distance': sp.score.distanceMiles || null,
                Activities: JSON.stringify([newActivity]),
              },
            }),
          }
        );

        if (createResponse.ok) {
          created++;
        } else {
          const errText = await createResponse.text().catch(() => null);
          console.error('[SendProperties] Failed to create match for property', sp.property.address, createResponse.status, errText);
          failed++;
        }
      }

      // Sync to GHL
      try {
        const relationId = await syncMatchStageToGhl({
          stage: 'Sent to Buyer',
          contactId: buyer.contactId,
          propertyAddress: sp.property.address,
          opportunityId: sp.property.opportunityId,
          stageAssociationIds: STAGE_ASSOCIATION_IDS,
        });

        if (relationId) {
          synced++;
          // Optionally update the match record with GHL relation ID
          // (skipping for now to reduce API calls)
        }
      } catch (ghlError) {
        console.warn('[SendProperties] GHL sync failed for property:', sp.property.address, ghlError);
        // Don't fail the whole operation if GHL sync fails
      }
    } catch (error) {
      console.error('[SendProperties] Failed to update match for property:', sp.property.address, error);
    }
  }

  return { updated, created, synced, failed };
}

export function SendPropertiesModal({
  buyer,
  properties,
  open,
  onOpenChange,
  onSendSuccess,
  onSelectTopMatches,
}: SendPropertiesModalProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [customMessage, setCustomMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  // SMS/Email send options
  const [sendViaSMS, setSendViaSMS] = useState(true); // Default ON
  const [sendViaEmail, setSendViaEmail] = useState(false); // Default OFF
  const [smsMessage, setSmsMessage] = useState('');
  const [showSMSPreview, setShowSMSPreview] = useState(false);

  // Check if buyer has phone/email
  const canSendSMS = !!buyer.phone;
  const canSendEmail = !!buyer.email;

  // Generate SMS message when properties change or preview is opened
  useEffect(() => {
    if (showSMSPreview && properties.length > 0) {
      const convertedProperties = properties.map(sp =>
        convertPropertyDetailsToProperty(sp.property)
      );
      setSmsMessage(generatePropertySMS(buyer.firstName, convertedProperties, buyer.language || 'English'));
    }
  }, [showSMSPreview, properties, buyer.firstName, buyer.language]);

  // AI recommendation: Suggest top 3 when many properties selected
  const showAiRecommendation = properties.length > 3;
  const topMatches = useMemo(() => {
    return [...properties].sort((a, b) => b.score.score - a.score.score).slice(0, 3);
  }, [properties]);

  const avgTopScore = useMemo(() => {
    if (topMatches.length === 0) return 0;
    return Math.round(
      topMatches.reduce((sum, p) => sum + p.score.score, 0) / topMatches.length
    );
  }, [topMatches]);

  const handleSend = async () => {
    // Validate at least one send method is selected
    const willSendSMS = sendViaSMS && canSendSMS;
    const willSendEmail = sendViaEmail && canSendEmail;

    if (!willSendSMS && !willSendEmail) {
      toast.error('Please select at least one send method');
      return;
    }

    setIsSending(true);
    try {
      // Convert properties for services
      const convertedProperties = properties.map(sp =>
        convertPropertyDetailsToProperty(sp.property)
      );

      const sentMethods: string[] = [];

      // Step 1: Send SMS if enabled
      if (willSendSMS) {
        const messageToSend = smsMessage || generatePropertySMS(buyer.firstName, convertedProperties, buyer.language || 'English');
        await sendPropertySMS(
          { contactId: buyer.contactId, firstName: buyer.firstName, phone: buyer.phone },
          messageToSend
        );
        sentMethods.push('SMS');
      }

      // Step 2: Send Email if enabled
      if (willSendEmail) {
        const isSpanish = buyer.language === 'Spanish';
        await sendPropertyEmail({
          contactId: buyer.contactId,
          contactName: `${buyer.firstName} ${buyer.lastName}`,
          contactEmail: buyer.email,
          properties: convertedProperties,
          subject: isSpanish
            ? `Tus ${properties.length} Propiedades Encontradas de Purple Homes`
            : `Your ${properties.length} Matched Properties from Purple Homes`,
          customMessage: customMessage || undefined,
          language: buyer.language || 'English',
        });
        sentMethods.push('Email');
      }

      // Determine activity type
      const activityType: MatchActivityType = willSendSMS && willSendEmail
        ? 'sms-email-sent'
        : willSendSMS
        ? 'sms-sent'
        : 'email-sent';

      // Step 3: Update match stages (this creates deals in the pipeline)
      const { updated, created, synced, failed } = await updateMatchStages(
        buyer,
        properties,
        activityType,
        customMessage
      );

      console.log(`[SendProperties] Updated ${updated} matches, created ${created} new matches, synced ${synced} to GHL, failed ${failed}`);

      // Step 4: Sync server-side cache so matching page reflects changes
      try {
        await fetch('/api/cache?action=sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cacheKey: 'matches' }),
        });
        console.log('[SendProperties] Server cache synced');
      } catch (cacheError) {
        console.warn('[SendProperties] Failed to sync server cache:', cacheError);
      }

      // Step 5: Invalidate and refetch queries so UI updates immediately
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
      ]);

      // Force refetch of the buyer's properties to update UI immediately
      await queryClient.refetchQueries({ queryKey: ['buyer-properties'] });

      // Step 6: Show success toast with View in Pipeline action
      const sentDescription = sentMethods.join(' & ') + ' sent';
      toast.success(
        `Sent ${properties.length} ${properties.length === 1 ? 'property' : 'properties'} to ${buyer.firstName}!`,
        {
          description: synced > 0
            ? `${sentDescription} • ${updated + created} deals added to pipeline • Synced to GHL`
            : `${sentDescription} • ${updated + created} deals added to pipeline`,
          duration: 6000,
          action: {
            label: 'View in Pipeline',
            onClick: () => navigate('/deals'),
          },
        }
      );
      if (typeof failed === 'number' && failed > 0) {
        toast.error(`${failed} match${failed === 1 ? '' : 'es'} failed to update — check console or server logs`);
      }
      // Call success callback
      onSendSuccess?.();

      // Close modal
      onOpenChange(false);

      // Reset form
      setCustomMessage('');
      setSmsMessage('');
      setShowSMSPreview(false);
    } catch (error) {
      console.error('Failed to send properties:', error);
      toast.error('Failed to send properties', {
        description: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Send Properties to {buyer.firstName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* AI Recommendation Banner - Show when >3 properties */}
          {showAiRecommendation && onSelectTopMatches && (
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-3">
              <div className="flex items-start gap-3">
                <div className="p-1.5 rounded-lg bg-indigo-100 shrink-0">
                  <Sparkles className="h-4 w-4 text-indigo-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-indigo-900">
                    Recommendation: Focus on best matches
                  </p>
                  <p className="text-xs text-indigo-700 mt-0.5">
                    Sending fewer, higher-quality matches often gets better responses.
                    Your top 3 average {avgTopScore}% match score.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2 h-7 text-xs bg-white border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                    onClick={() => {
                      onSelectTopMatches(3);
                      onOpenChange(false);
                    }}
                  >
                    <Sparkles className="h-3 w-3 mr-1" />
                    Select Top 3 Instead
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Warning for many properties */}
          {properties.length > 5 && (
            <div className="flex items-start gap-2 p-2 rounded-lg bg-amber-50 border border-amber-200">
              <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800">
                Sending {properties.length} properties at once may overwhelm the buyer.
                Consider focusing on fewer, better matches for higher engagement.
              </p>
            </div>
          )}

          {/* Recipient Info */}
          <div className="bg-muted/50 rounded-lg p-3 space-y-1">
            <p className="text-sm font-medium">Recipient:</p>
            <p className="text-sm text-muted-foreground">
              {buyer.firstName} {buyer.lastName}
            </p>
            {buyer.phone && (
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {buyer.phone}
              </p>
            )}
            {buyer.email && (
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Mail className="h-3 w-3" />
                {buyer.email}
              </p>
            )}
          </div>

          {/* Properties Count */}
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
            <p className="text-sm font-medium text-purple-900">
              <FileText className="h-4 w-4 inline mr-1" />
              {properties.length} {properties.length === 1 ? 'Property' : 'Properties'} Selected
            </p>
            <p className="text-xs text-purple-700 mt-1">
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
                      <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">Default</span>
                    )}
                  </label>
                  <p className="text-xs text-muted-foreground">
                    {canSendSMS ? 'Recommended - faster response' : 'No phone number on file'}
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
                        rows={8}
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
                    Email with PDF
                  </label>
                  <p className="text-xs text-muted-foreground">
                    {canSendEmail ? 'Includes detailed property PDF' : 'No email on file'}
                  </p>
                </div>
              </div>

              {/* Email Custom Message & Preview */}
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
                  <EmailPreview
                    buyer={buyer}
                    properties={properties}
                    customMessage={customMessage}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
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
