/**
 * EnhancedMatchDetailModal - Premium modal for viewing and managing buyer-property matches
 *
 * Features:
 * - Two-column layout on desktop (property left, management right)
 * - Tabbed interface on mobile
 * - Sticky header with key info
 * - Sticky footer with primary actions
 * - Smooth transitions and animations
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Home,
  Bed,
  Bath,
  Square,
  User,
  MapPin,
  X,
  DollarSign,
  Target,
  Clock,
  Mail,
  Phone,
  ArrowRight,
  ExternalLink,
  ClipboardList,
  ChevronDown,
  Calculator,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { MatchScoreBadge } from './MatchScoreBadge';
import { StageBadge } from './StageBadge';
import {
  ScoreBreakdown,
  MatchDetailsList,
  extractReasoningSummary,
} from './MatchTags';
import { DealProgressKanban } from './DealProgressKanban';
import { MatchNotesPanel, type NoteEntry } from './MatchNotesPanel';
import { AIInsightCard } from './AIInsightCard';
import { ConfirmFinalPropertyCard } from './ConfirmFinalPropertyCard';
import { useConfirmFinalProperty, useRemoveFinalProperty } from '@/services/finalPropertyApi';
import {
  PropertyMatch,
  PropertyDetails,
  BuyerCriteria,
  MatchActivity,
} from '@/types/matching';
import { MatchDealStage } from '@/types/associations';
import type { Deal } from '@/types/deals';
import { DealCalculatorModal } from '@/components/calculator';

export interface EnhancedMatchWithDetails extends PropertyMatch {
  property?: PropertyDetails;
  buyer?: BuyerCriteria;
  activities?: MatchActivity[];
  notes?: NoteEntry[];
}

interface EnhancedMatchDetailModalProps {
  match: EnhancedMatchWithDetails | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStageChange?: (matchId: string, newStage: MatchDealStage) => Promise<void>;
  onAddNote?: (matchId: string, note: string) => Promise<void>;
  onEditNote?: (matchId: string, noteId: string, newText: string) => Promise<void>;
  onDeleteNote?: (matchId: string, noteId: string) => Promise<void>;
  onSendEmail?: (matchId: string) => Promise<void>;
}

export function EnhancedMatchDetailModal({
  match,
  open,
  onOpenChange,
  onStageChange,
  onAddNote,
  onEditNote,
  onDeleteNote,
  onSendEmail,
}: EnhancedMatchDetailModalProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState<'property' | 'progress' | 'activity'>('property');
  // Local state for the stage to provide immediate UI feedback after updates
  const [localStage, setLocalStage] = useState<MatchDealStage | null>(null);
  const [calculatorOpen, setCalculatorOpen] = useState(false);
  const navigate = useNavigate();

  // Final property mutation hooks
  const confirmFinalProperty = useConfirmFinalProperty();
  const removeFinalProperty = useRemoveFinalProperty();

  // Sync local stage with prop when match changes (e.g., opening a different deal)
  useEffect(() => {
    setLocalStage(null);
  }, [match?.id]);

  if (!match) return null;

  const { property, buyer, activities = [], notes = [] } = match;
  // Use local stage if set (after an update), otherwise use the prop value
  const currentStage: MatchDealStage = localStage ?? match.status ?? 'Sent to Buyer';

  // Cross-navigation handlers
  const handleViewInPipeline = () => {
    onOpenChange(false);
    navigate(`/deals?dealId=${match.id}`);
  };

  const handleViewMatchDetails = () => {
    onOpenChange(false);
    navigate(`/matching?buyerId=${buyer?.contactId}`);
  };

  const handleStageChange = async (newStage: MatchDealStage) => {
    if (!onStageChange) return;
    setIsUpdating(true);
    try {
      await onStageChange(match.id, newStage);
      // Update local state immediately to reflect the change in the UI
      setLocalStage(newStage);
    } finally {
      setIsUpdating(false);
    }
  };

  // Note handlers for MatchNotesPanel
  const handleAddNote = async (text: string) => {
    if (!onAddNote) return;
    await onAddNote(match.id, text);
  };

  const handleEditNote = async (noteId: string, newText: string) => {
    if (!onEditNote) return;
    await onEditNote(match.id, noteId, newText);
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!onDeleteNote) return;
    await onDeleteNote(match.id, noteId);
  };

  const handleSendEmail = async () => {
    if (!onSendEmail) return;
    await onSendEmail(match.id);
  };

  // Final property handlers
  const handleConfirmFinalProperty = async () => {
    if (!match || !property || !buyer?.contactId) return;

    await confirmFinalProperty.mutateAsync({
      matchId: match.id,
      contactId: buyer.contactId,
      propertyAddress: property.address,
      propertyOpportunityId: property.opportunityId || property.recordId || '',
      propertyPrice: property.price || 0,
    });
  };

  const handleRemoveFinalProperty = async () => {
    if (!match || !buyer?.contactId) return;

    await removeFinalProperty.mutateAsync({
      matchId: match.id,
      contactId: buyer.contactId,
    });
  };

  // Format price
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(price);
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full h-[100dvh] sm:h-auto sm:w-[1400px] sm:max-w-[95vw] sm:max-h-[95vh] p-0 gap-0 overflow-hidden flex flex-col rounded-none sm:rounded-lg">
        {/* Sticky Header */}
        <div className="sticky top-0 z-20 bg-background border-b px-6 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <DialogTitle className="text-xl font-bold truncate">
                  {property?.address || 'Property Details'}
                </DialogTitle>
                <MatchScoreBadge score={match.score} size="md" />
                <StageBadge stage={currentStage} size="md" />
              </div>
              <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground flex-wrap">
                {property?.price && (
                  <span className="font-semibold text-foreground">
                    {formatPrice(property.price)}
                  </span>
                )}
                {property?.beds && (
                  <span className="flex items-center gap-1">
                    <Bed className="h-4 w-4" />
                    {property.beds} bed
                  </span>
                )}
                {property?.baths && (
                  <span className="flex items-center gap-1">
                    <Bath className="h-4 w-4" />
                    {property.baths} bath
                  </span>
                )}
                {property?.sqft && (
                  <span className="flex items-center gap-1">
                    <Square className="h-4 w-4" />
                    {property.sqft.toLocaleString()} sqft
                  </span>
                )}
                {match.distance && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {match.distance.toFixed(1)} mi
                  </span>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-5 w-5" />
              <span className="sr-only">Close</span>
            </Button>
          </div>
        </div>

        {/* Main Content - Two Column on Desktop, Tabs on Mobile */}
        <div className="flex-1 overflow-hidden">
          {/* Desktop: Two Column Layout */}
          <div className="hidden lg:grid lg:grid-cols-2 h-full">
            {/* Left Column - Property Info */}
            <ScrollArea className="h-[calc(95vh-180px)] border-r">
              <div className="p-6 space-y-6">
                {/* Hero Image */}
                <div className="relative aspect-video rounded-xl overflow-hidden bg-gradient-to-br from-purple-100 to-purple-50">
                  {property?.heroImage ? (
                    <img
                      src={property.heroImage}
                      alt={property.address}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Home className="h-16 w-16 text-purple-300" />
                    </div>
                  )}
                  {match.isPriority && (
                    <Badge className="absolute top-3 left-3 bg-purple-600">
                      <Target className="h-3 w-3 mr-1" />
                      Priority Match
                    </Badge>
                  )}
                </div>

                {/* Location */}
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>
                    {property?.city}
                    {property?.state && `, ${property.state}`}
                    {property?.zipCode && ` ${property.zipCode}`}
                  </span>
                </div>

                {/* Match Reasoning */}
                {(match.reasoning || match.highlights?.length || match.concerns?.length) && (
                  <div className="bg-muted/30 rounded-xl p-5 space-y-4">
                    <h3 className="text-base font-semibold flex items-center gap-2">
                      <Target className="h-4 w-4 text-purple-600" />
                      Why This Property Matches
                    </h3>

                    {match.reasoning && (
                      <p className="text-sm">
                        {extractReasoningSummary(match.reasoning)}
                      </p>
                    )}

                    <ScoreBreakdown reasoning={match.reasoning} />

                    <MatchDetailsList
                      highlights={match.highlights}
                      concerns={match.concerns}
                    />
                  </div>
                )}

                {/* AI Insight */}
                {buyer && property && match.score && (
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
                )}

                {/* Property Notes */}
                {property?.notes && (
                  <div className="space-y-2">
                    <h3 className="text-base font-semibold">Property Notes</h3>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {property.notes}
                    </p>
                  </div>
                )}

                {/* Property Code */}
                {property?.propertyCode && (
                  <div className="text-xs text-muted-foreground pt-4 border-t">
                    Property Code: {property.propertyCode}
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Right Column - Management */}
            <ScrollArea className="h-[calc(95vh-180px)]">
              <div className="p-6 space-y-6">
                {/* Buyer Info */}
                {buyer && (
                  <div className="bg-purple-50 rounded-xl p-4 space-y-3">
                    <h3 className="text-base font-semibold flex items-center gap-2">
                      <User className="h-4 w-4 text-purple-600" />
                      Buyer Information
                    </h3>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">
                          {buyer.firstName} {buyer.lastName}
                        </p>
                        {buyer.qualified && (
                          <Badge variant="default" className="bg-green-600 text-xs">
                            Qualified
                          </Badge>
                        )}
                      </div>
                      {buyer.email && (
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                          <Mail className="h-3 w-3" />
                          {buyer.email}
                        </p>
                      )}
                      {buyer.phone && (
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                          <Phone className="h-3 w-3" />
                          {buyer.phone}
                        </p>
                      )}
                      {buyer.location && (
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                          <MapPin className="h-3 w-3" />
                          {buyer.location}
                        </p>
                      )}
                    </div>
                    {/* Buyer Preferences */}
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-purple-200">
                      {buyer.desiredBeds && (
                        <Badge variant="secondary" className="text-xs">
                          <Bed className="h-3 w-3 mr-1" />
                          {buyer.desiredBeds} beds
                        </Badge>
                      )}
                      {buyer.desiredBaths && (
                        <Badge variant="secondary" className="text-xs">
                          <Bath className="h-3 w-3 mr-1" />
                          {buyer.desiredBaths} baths
                        </Badge>
                      )}
                      {buyer.downPayment && (
                        <Badge variant="secondary" className="text-xs">
                          <DollarSign className="h-3 w-3 mr-1" />
                          {formatPrice(buyer.downPayment)} budget
                        </Badge>
                      )}
                      {buyer.monthlyIncome && (
                        <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                          <TrendingUp className="h-3 w-3 mr-1" />
                          {formatPrice(buyer.monthlyIncome)}/mo income
                        </Badge>
                      )}
                      {buyer.monthlyLiabilities && (
                        <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-700">
                          <DollarSign className="h-3 w-3 mr-1" />
                          {formatPrice(buyer.monthlyLiabilities)}/mo liabilities
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                {/* Deal Progress */}
                <div className="space-y-4">
                  <h3 className="text-base font-semibold flex items-center gap-2">
                    <Clock className="h-4 w-4 text-purple-600" />
                    Deal Progress
                  </h3>
                  <DealProgressKanban
                    currentStage={currentStage}
                    onStageChange={handleStageChange}
                    onNotInterested={() => handleStageChange('Not Interested')}
                    isUpdating={isUpdating}
                  />
                </div>

                {/* Confirm Final Property Card */}
                {buyer && property && currentStage !== 'Not Interested' && (
                  <ConfirmFinalPropertyCard
                    currentStage={currentStage}
                    isFinalProperty={match.isFinalProperty ?? false}
                    propertyAddress={property.address}
                    propertyPrice={property.price || 0}
                    buyerName={`${buyer.firstName} ${buyer.lastName}`}
                    onConfirm={handleConfirmFinalProperty}
                    onRemove={handleRemoveFinalProperty}
                    isConfirming={confirmFinalProperty.isPending}
                    isRemoving={removeFinalProperty.isPending}
                  />
                )}

                <Separator />

                {/* Notes Panel */}
                {onAddNote && (
                  <MatchNotesPanel
                    notes={notes}
                    onAddNote={handleAddNote}
                    onEditNote={onEditNote ? handleEditNote : undefined}
                    onDeleteNote={onDeleteNote ? handleDeleteNote : undefined}
                    maxHeight="200px"
                  />
                )}

                {/* Activity History - Collapsible */}
                {activities.length > 0 && (
                  <>
                    <Separator />
                    <Collapsible>
                      <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-left hover:bg-muted/50 rounded-lg px-2 -mx-2">
                        <div className="flex items-center gap-2">
                          <ClipboardList className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">Activity History</span>
                          <Badge variant="secondary" className="text-xs">
                            {activities.length}
                          </Badge>
                        </div>
                        <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
                      </CollapsibleTrigger>
                      <CollapsibleContent className="pt-2">
                        <div className="space-y-2 text-sm">
                          {activities.slice(0, 5).map((activity) => (
                            <div key={activity.id} className="flex items-start gap-2 text-muted-foreground">
                              <span className="text-xs whitespace-nowrap">
                                {new Date(activity.timestamp).toLocaleDateString()}
                              </span>
                              <span className="truncate">{activity.details}</span>
                            </div>
                          ))}
                          {activities.length > 5 && (
                            <p className="text-xs text-muted-foreground">
                              +{activities.length - 5} more activities
                            </p>
                          )}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Mobile: Tabbed Layout */}
          <div className="lg:hidden h-full flex flex-col">
            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as typeof activeTab)}
              className="flex-1 flex flex-col"
            >
              <TabsList className="grid w-full grid-cols-3 mx-6 mt-2" style={{ width: 'calc(100% - 48px)' }}>
                <TabsTrigger value="property">Property</TabsTrigger>
                <TabsTrigger value="progress">Progress</TabsTrigger>
                <TabsTrigger value="activity">Activity</TabsTrigger>
              </TabsList>

              <ScrollArea className="flex-1 h-[calc(95vh-260px)]">
                <TabsContent value="property" className="p-6 space-y-6 mt-0">
                  {/* Hero Image */}
                  <div className="relative aspect-video rounded-xl overflow-hidden bg-gradient-to-br from-purple-100 to-purple-50">
                    {property?.heroImage ? (
                      <img
                        src={property.heroImage}
                        alt={property.address}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Home className="h-16 w-16 text-purple-300" />
                      </div>
                    )}
                  </div>

                  {/* Stats Grid */}
                  {property && (
                    <div className="grid grid-cols-4 gap-2">
                      <div className="flex flex-col items-center p-3 bg-muted/50 rounded-lg">
                        <Bed className="h-4 w-4 text-purple-600 mb-1" />
                        <span className="text-lg font-bold">{property.beds}</span>
                        <span className="text-xs text-muted-foreground">Beds</span>
                      </div>
                      <div className="flex flex-col items-center p-3 bg-muted/50 rounded-lg">
                        <Bath className="h-4 w-4 text-purple-600 mb-1" />
                        <span className="text-lg font-bold">{property.baths}</span>
                        <span className="text-xs text-muted-foreground">Baths</span>
                      </div>
                      {property.sqft && (
                        <div className="flex flex-col items-center p-3 bg-muted/50 rounded-lg">
                          <Square className="h-4 w-4 text-purple-600 mb-1" />
                          <span className="text-lg font-bold">{(property.sqft / 1000).toFixed(1)}k</span>
                          <span className="text-xs text-muted-foreground">Sqft</span>
                        </div>
                      )}
                      {match.distance && (
                        <div className="flex flex-col items-center p-3 bg-muted/50 rounded-lg">
                          <MapPin className="h-4 w-4 text-purple-600 mb-1" />
                          <span className="text-lg font-bold">{match.distance.toFixed(1)}</span>
                          <span className="text-xs text-muted-foreground">Miles</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Match Reasoning */}
                  {match.reasoning && (
                    <div className="bg-muted/30 rounded-xl p-4 space-y-3">
                      <h3 className="text-sm font-semibold">Why This Matches</h3>
                      <ScoreBreakdown reasoning={match.reasoning} />
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="progress" className="p-6 space-y-6 mt-0">
                  {/* Buyer Info */}
                  {buyer && (
                    <div className="bg-purple-50 rounded-xl p-4 space-y-2">
                      <h3 className="text-sm font-semibold">Buyer</h3>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">
                          {buyer.firstName} {buyer.lastName}
                        </p>
                        {buyer.qualified && (
                          <Badge variant="default" className="bg-green-600 text-xs">
                            Qualified
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{buyer.email}</p>
                    </div>
                  )}

                  {/* Deal Progress */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold">Deal Progress</h3>
                    <DealProgressKanban
                      currentStage={currentStage}
                      onStageChange={handleStageChange}
                      onNotInterested={() => handleStageChange('Not Interested')}
                      isUpdating={isUpdating}
                    />
                  </div>

                  {/* Confirm Final Property Card - Mobile */}
                  {buyer && property && currentStage !== 'Not Interested' && (
                    <ConfirmFinalPropertyCard
                      currentStage={currentStage}
                      isFinalProperty={match.isFinalProperty ?? false}
                      propertyAddress={property.address}
                      propertyPrice={property.price || 0}
                      buyerName={`${buyer.firstName} ${buyer.lastName}`}
                      onConfirm={handleConfirmFinalProperty}
                      onRemove={handleRemoveFinalProperty}
                      isConfirming={confirmFinalProperty.isPending}
                      isRemoving={removeFinalProperty.isPending}
                    />
                  )}
                </TabsContent>

                <TabsContent value="activity" className="p-6 mt-0 space-y-4">
                  {/* Notes Panel - Mobile */}
                  {onAddNote && (
                    <MatchNotesPanel
                      notes={notes}
                      onAddNote={handleAddNote}
                      onEditNote={onEditNote ? handleEditNote : undefined}
                      onDeleteNote={onDeleteNote ? handleDeleteNote : undefined}
                      maxHeight="200px"
                    />
                  )}

                  {/* Activity History - Mobile Collapsible */}
                  {activities.length > 0 && (
                    <>
                      <Separator />
                      <Collapsible>
                        <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-left hover:bg-muted/50 rounded-lg px-2 -mx-2">
                          <div className="flex items-center gap-2">
                            <ClipboardList className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">Activity History</span>
                            <Badge variant="secondary" className="text-xs">
                              {activities.length}
                            </Badge>
                          </div>
                          <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
                        </CollapsibleTrigger>
                        <CollapsibleContent className="pt-2">
                          <div className="space-y-2 text-sm">
                            {activities.slice(0, 5).map((activity) => (
                              <div key={activity.id} className="flex items-start gap-2 text-muted-foreground">
                                <span className="text-xs whitespace-nowrap">
                                  {new Date(activity.timestamp).toLocaleDateString()}
                                </span>
                                <span className="truncate">{activity.details}</span>
                              </div>
                            ))}
                            {activities.length > 5 && (
                              <p className="text-xs text-muted-foreground">
                                +{activities.length - 5} more activities
                              </p>
                            )}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    </>
                  )}
                </TabsContent>
              </ScrollArea>
            </Tabs>
          </div>
        </div>

        {/* Sticky Footer */}
        <div className="sticky bottom-0 z-20 bg-background border-t px-6 py-3">
          <div className="flex items-center justify-between gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={() => setCalculatorOpen(true)}
              className="gap-1 bg-purple-600 hover:bg-purple-700"
            >
              <Calculator className="h-4 w-4" />
              Deal Calculator
            </Button>
            <div className="flex items-center gap-2">
              {match.status && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleViewInPipeline}
                  className="gap-1"
                >
                  View in Pipeline
                  <ArrowRight className="h-3 w-3" />
                </Button>
              )}
              {buyer?.contactId && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleViewMatchDetails}
                  className="gap-1 text-muted-foreground"
                >
                  <ExternalLink className="h-3 w-3" />
                  All Matches
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* Deal Calculator Modal */}
    <DealCalculatorModal
      open={calculatorOpen}
      onOpenChange={setCalculatorOpen}
      property={property ? {
        price: property.price,
        beds: property.beds,
        baths: property.baths,
        sqft: property.sqft,
        address: property.address,
        propertyCode: property.propertyCode,
      } : undefined}
      buyerContactId={buyer?.contactId}
    />
  </>
  );
}

export default EnhancedMatchDetailModal;
