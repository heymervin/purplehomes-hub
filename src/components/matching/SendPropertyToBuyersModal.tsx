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
                ? `Propiedad Encontrada de Purple Homes`
                : `Property Match from Purple Homes`,
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

      // Step 4: Sync server-side cache
      try {
        await fetch('/api/cache?action=sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cacheKey: 'matches' }),
        });
        console.log('[SendPropertyToBuyers] Server cache synced');
      } catch (cacheError) {
        console.warn('[SendPropertyToBuyers] Failed to sync server cache:', cacheError);
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

      // Force refetch of the property's buyers to update UI immediately
      await queryClient.refetchQueries({ queryKey: ['property-buyers'] });

      // Step 6: Show appropriate toast based on results
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Send Property to Buyers</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
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
