/**
 * MatchDetailModal - Main modal for viewing and managing a buyer-property match
 *
 * Displays property details, match score, deal progress, quick actions,
 * match reasoning, and activity timeline in a comprehensive modal view.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Home,
  Bed,
  Bath,
  Square,
  Building,
  User,
  MapPin,
  ArrowRight,
} from 'lucide-react';
import { AIInsightCard } from './AIInsightCard';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { MatchScoreBadge } from '@/components/matching/MatchScoreBadge';
import {
  ScoreBreakdown,
  MatchDetailsList,
  extractReasoningSummary,
} from '@/components/matching/MatchTags';
import { DealProgressKanban } from './DealProgressKanban';
import { MatchQuickActions } from './MatchQuickActions';
import {
  PropertyMatch,
  PropertyDetails,
  BuyerCriteria,
} from '@/types/matching';
import { MatchDealStage } from '@/types/associations';

export interface MatchWithDetails extends PropertyMatch {
  property?: PropertyDetails;
  buyer?: BuyerCriteria;
}

interface MatchDetailModalProps {
  match: MatchWithDetails | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStageChange?: (matchId: string, newStage: MatchDealStage) => Promise<void>;
  onAddNote?: (matchId: string, note: string) => Promise<void>;
  onSendEmail?: (matchId: string) => Promise<void>;
  viewMode?: 'buyer-centric' | 'property-centric';
}

export function MatchDetailModal({
  match,
  open,
  onOpenChange,
  onStageChange,
  onAddNote,
  onSendEmail,
  viewMode = 'buyer-centric',
}: MatchDetailModalProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const navigate = useNavigate();

  if (!match) return null;

  // Check if match is in pipeline (has a status set)
  const isInPipeline = match.status && match.status !== 'Sent to Buyer';

  const handleViewInPipeline = () => {
    onOpenChange(false);
    navigate(`/deals?dealId=${match.id}`);
  };

  const { property, buyer } = match;

  const handleStageChange = async (newStage: MatchDealStage) => {
    if (!onStageChange) return;
    setIsUpdating(true);
    try {
      await onStageChange(match.id, newStage);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAddNote = async (note: string) => {
    if (!onAddNote) return;
    await onAddNote(match.id, note);
  };

  const handleSendEmail = async () => {
    if (!onSendEmail) return;
    await onSendEmail(match.id);
  };

  // Get current stage (default to 'Sent to Buyer' if not set)
  const currentStage: MatchDealStage = match.status || 'Sent to Buyer';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full h-[100dvh] sm:h-auto sm:max-w-4xl sm:max-h-[90vh] p-0 overflow-hidden rounded-none sm:rounded-lg">
        <ScrollArea className="h-[100dvh] sm:max-h-[90vh]">
          {/* Hero Image with Overlay */}
          <div className="relative h-64 sm:h-72 bg-gradient-to-br from-purple-100 to-purple-50">
            {property?.heroImage ? (
              <img
                src={property.heroImage}
                alt={property.address}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Home className="h-20 w-20 text-purple-200" />
              </div>
            )}

            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

            {/* Property/Buyer Info on image */}
            <div className="absolute bottom-0 left-0 right-0 p-6">
              <div className="flex items-end justify-between gap-4">
                <div>
                  {property?.price && (
                    <div className="text-3xl sm:text-4xl font-bold text-white mb-1">
                      ${property.price.toLocaleString()}
                    </div>
                  )}
                  <h2 className="text-xl sm:text-2xl font-semibold text-white">
                    {property?.address || 'Unknown Property'}
                  </h2>
                  <p className="text-white/80">
                    {property?.city}
                    {property?.state && `, ${property.state}`}
                    {property?.zipCode && ` ${property.zipCode}`}
                  </p>
                </div>
                {match.score && <MatchScoreBadge score={match.score} size="lg" />}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Buyer Info (if available) */}
            {buyer && (
              <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-lg">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">
                    {buyer.firstName} {buyer.lastName}
                  </p>
                  <p className="text-sm text-muted-foreground">{buyer.email}</p>
                </div>
                {buyer.location && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    {buyer.location}
                  </div>
                )}
              </div>
            )}

            {/* Property Stats Grid */}
            {property && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="flex flex-col items-center p-4 bg-white border border-gray-200 rounded-xl">
                  <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center mb-2">
                    <Bed className="h-5 w-5 text-purple-600" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{property.beds}</p>
                  <p className="text-xs text-gray-600">Bedrooms</p>
                </div>
                <div className="flex flex-col items-center p-4 bg-white border border-gray-200 rounded-xl">
                  <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center mb-2">
                    <Bath className="h-5 w-5 text-purple-600" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{property.baths}</p>
                  <p className="text-xs text-gray-600">Bathrooms</p>
                </div>
                {property.sqft && (
                  <div className="flex flex-col items-center p-4 bg-white border border-gray-200 rounded-xl">
                    <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center mb-2">
                      <Square className="h-5 w-5 text-purple-600" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{property.sqft.toLocaleString()}</p>
                    <p className="text-xs text-gray-600">Sqft</p>
                  </div>
                )}
                {property.stage && (
                  <div className="flex flex-col items-center p-4 bg-white border border-gray-200 rounded-xl">
                    <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center mb-2">
                      <Building className="h-5 w-5 text-purple-600" />
                    </div>
                    <p className="text-lg font-bold text-gray-900">{property.stage}</p>
                    <p className="text-xs text-gray-600">Stage</p>
                  </div>
                )}
              </div>
            )}

            {/* Deal Progress Section - Only show if stage management is enabled */}
            {onStageChange && (
              <>
                <Separator />

                <div>
                  <h3 className="text-base font-semibold mb-4">Deal Progress</h3>
                  <DealProgressKanban
                    currentStage={currentStage}
                    onStageChange={handleStageChange}
                    onNotInterested={() => handleStageChange('Not Interested')}
                    isUpdating={isUpdating}
                  />
                </div>

                <Separator />

                {/* Quick Actions Section */}
                <div>
                  <h3 className="text-base font-semibold mb-4">Quick Actions</h3>
                  <MatchQuickActions
                    currentStage={currentStage}
                    onAdvanceStage={handleStageChange}
                    onSendEmail={onSendEmail ? handleSendEmail : undefined}
                    onAddNote={onAddNote ? handleAddNote : undefined}
                    onMarkNotInterested={() => handleStageChange('Not Interested')}
                    isLoading={isUpdating}
                  />
                </div>
              </>
            )}

            <Separator />

            {/* Match Reasoning Section */}
            {(match.reasoning ||
              (match.highlights && match.highlights.length > 0) ||
              (match.concerns && match.concerns.length > 0)) && (
              <>
                <div className="bg-muted/30 rounded-xl p-5 space-y-4">
                  <h3 className="text-base font-semibold">Why This Property Matches</h3>

                  {/* Summary Statement */}
                  {match.reasoning && (
                    <p className="text-sm font-medium">
                      {extractReasoningSummary(match.reasoning)}
                    </p>
                  )}

                  {/* Score Breakdown - Clean one-line-per-category */}
                  <ScoreBreakdown reasoning={match.reasoning} />

                  {/* Highlights & Concerns */}
                  <MatchDetailsList
                    highlights={match.highlights}
                    concerns={match.concerns}
                  />
                </div>

                <Separator />
              </>
            )}

            {/* AI Insight Section */}
            {buyer && property && match.score && (
              <>
                <AIInsightCard
                  buyerName={`${buyer.firstName} ${buyer.lastName}`}
                  propertyAddress={property.address}
                  score={match.score}
                  highlights={match.highlights}
                  concerns={match.concerns}
                  distanceMiles={match.distance}
                  stage={currentStage}
                  price={property.price}
                  beds={property.beds}
                  baths={property.baths}
                  matchId={match.id}
                />

                <Separator />
              </>
            )}

            {/* Property Notes */}
            {property?.notes && (
              <>
                <Separator />
                <div>
                  <h3 className="text-base font-semibold mb-2">Property Notes</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {property.notes}
                  </p>
                </div>
              </>
            )}

            {/* Footer Info */}
            <div className="text-xs text-muted-foreground pt-4 border-t flex justify-between items-center">
              <div className="flex items-center gap-2">
                {property?.propertyCode && (
                  <span>Property Code: {property.propertyCode}</span>
                )}
                {/* View in Pipeline button - shows when match is in pipeline */}
                {isInPipeline && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleViewInPipeline}
                    className="ml-2 gap-1"
                  >
                    View in Pipeline
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                )}
              </div>
              <div>
                {match.distance && (
                  <Badge variant="secondary">
                    {match.distance.toFixed(1)} miles away
                  </Badge>
                )}
                {match.isPriority && (
                  <Badge variant="default" className="ml-2">
                    Priority
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

export default MatchDetailModal;
