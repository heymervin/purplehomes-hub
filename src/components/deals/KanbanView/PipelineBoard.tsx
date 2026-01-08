/**
 * PipelineBoard - Kanban board for deal pipeline
 *
 * Features:
 * - 7 columns (main stages) + optional "Not Interested" column
 * - HTML5 drag-and-drop for stage changes
 * - GHL sync on stage change
 * - Undo toast
 */

import { useState, useMemo } from 'react';
import { useDealsByStage, useUpdateDealStage } from '@/services/dealsApi';
import { MATCH_DEAL_STAGES, STAGE_CONFIGS } from '@/types/associations';
import type { MatchDealStage } from '@/types/associations';
import type { Deal } from '@/types/deals';
import type { DealPipelineFilters } from '@/pages/DealPipeline';
import { DealCard } from './DealCard';
import { EmptyStageState, NoDealsEmptyState, NoResultsEmptyState } from '../Shared/DealEmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Eye, EyeOff } from 'lucide-react';
import { isToday } from 'date-fns';

// Column colors matching stage colors
const COLUMN_COLORS: Record<string, string> = {
  'Sent to Buyer': 'border-t-blue-500',
  'Buyer Responded': 'border-t-cyan-500',
  'Showing Scheduled': 'border-t-amber-500',
  'Property Viewed': 'border-t-purple-500',
  'Underwriting': 'border-t-orange-500',
  'Contracts': 'border-t-indigo-500',
  'Qualified': 'border-t-teal-500',
  'Closed Deal / Won': 'border-t-emerald-500',
  'Not Interested': 'border-t-red-400',
};

interface PipelineBoardProps {
  filters?: DealPipelineFilters;
  onViewDeal?: (deal: Deal) => void;
}

export function PipelineBoard({ filters, onViewDeal }: PipelineBoardProps) {
  const { data: dealsByStage, isLoading, error } = useDealsByStage();
  const updateStage = useUpdateDealStage();

  // Show/hide "Not Interested" column
  const [showNotInterested, setShowNotInterested] = useState(false);

  // Track dragging state
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);

  // Filter deals by all filter criteria
  const filteredDealsByStage = useMemo(() => {
    if (!dealsByStage) return null;

    const filtered: Record<string, Deal[]> = {};

    Object.entries(dealsByStage).forEach(([stage, deals]) => {
      let filteredDeals = [...deals];

      // Filter by search (buyer name or property address)
      if (filters?.search) {
        const searchLower = filters.search.toLowerCase();
        filteredDeals = filteredDeals.filter(
          (deal) =>
            deal.property?.address?.toLowerCase().includes(searchLower) ||
            deal.property?.city?.toLowerCase().includes(searchLower) ||
            `${deal.buyer?.firstName} ${deal.buyer?.lastName}`
              .toLowerCase()
              .includes(searchLower)
        );
      }

      // Filter by stage (when stage filter is set, only show that stage's column)
      if (filters?.stage && filters.stage !== 'all') {
        if (stage !== filters.stage) {
          filteredDeals = [];
        }
      }

      // Filter by min score
      if (filters?.minScore && filters.minScore !== 'all') {
        const minScore = parseInt(filters.minScore, 10);
        filteredDeals = filteredDeals.filter((deal) => deal.score >= minScore);
      }

      // Filter by stale only
      if (filters?.staleOnly) {
        filteredDeals = filteredDeals.filter((deal) => deal.isStale);
      }

      // Filter by sent today
      if (filters?.sentToday) {
        filteredDeals = filteredDeals.filter((deal) => {
          if (!deal.createdAt) return false;
          return isToday(new Date(deal.createdAt));
        });
      }

      filtered[stage] = filteredDeals;
    });

    return filtered as Record<MatchDealStage, Deal[]>;
  }, [dealsByStage, filters]);

  // Check if filters are active
  const hasActiveFilters = filters && (
    filters.search !== '' ||
    filters.stage !== 'all' ||
    filters.minScore !== 'all' ||
    filters.staleOnly ||
    filters.sentToday
  );

  // Handle drop - stage change
  const handleDrop = async (e: React.DragEvent, toStage: MatchDealStage) => {
    e.preventDefault();
    setDragOverStage(null);

    try {
      const dealData = e.dataTransfer.getData('deal');
      if (!dealData) return;

      const deal: Deal = JSON.parse(dealData);

      // No change needed if same stage
      if (deal.status === toStage) return;

      const fromStage = deal.status;

      // Show optimistic update message
      toast.loading(`Moving to ${toStage}...`, { id: 'stage-update' });

      // Perform the update
      const result = await updateStage.mutateAsync({
        dealId: deal.id,
        fromStage,
        toStage,
        contactId: deal.buyer?.contactId,
        propertyAddress: deal.property?.address,
        opportunityId: deal.property?.opportunityId,
        syncToGhl: true,
        ghlRelationId: deal.ghlRelationId, // Pass previous relation ID to delete
      });

      // Show success with undo option
      toast.success(
        `Moved to ${toStage}${result.ghlRelationId ? ' (synced to GHL)' : ''}`,
        {
          id: 'stage-update',
          duration: 5000,
          action: {
            label: 'Undo',
            onClick: async () => {
              try {
                await updateStage.mutateAsync({
                  dealId: deal.id,
                  fromStage: toStage,
                  toStage: fromStage,
                  contactId: deal.buyer?.contactId,
                  propertyAddress: deal.property?.address,
                  opportunityId: deal.property?.opportunityId,
                  syncToGhl: true,
                  ghlRelationId: result.ghlRelationId, // Pass new relation ID to delete when undoing
                });
                toast.success('Undone');
              } catch {
                toast.error('Failed to undo');
              }
            },
          },
        }
      );
    } catch (err) {
      toast.error('Failed to update stage', { id: 'stage-update' });
      console.error('[PipelineBoard] Drop error:', err);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {[...Array(7)].map((_, i) => (
          <div key={i} className="flex-shrink-0 w-72">
            <Skeleton className="h-10 w-full mb-2" />
            <div className="space-y-2">
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-500">Failed to load deals: {(error as Error).message}</p>
      </div>
    );
  }

  // Check if any deals exist
  const totalDeals = Object.values(filteredDealsByStage || {}).reduce(
    (sum, deals) => sum + deals.length,
    0
  );

  const originalTotalDeals = dealsByStage
    ? Object.values(dealsByStage).reduce((sum, deals) => sum + deals.length, 0)
    : 0;

  if (originalTotalDeals === 0 && !hasActiveFilters) {
    return <NoDealsEmptyState />;
  }

  if (totalDeals === 0 && hasActiveFilters) {
    return (
      <Card className="p-6">
        <NoResultsEmptyState />
      </Card>
    );
  }

  // Get stages to show
  const stagesToShow = showNotInterested
    ? [...MATCH_DEAL_STAGES, 'Not Interested' as const]
    : MATCH_DEAL_STAGES;

  return (
    <div className="space-y-4">
      {/* Toggle for Not Interested column */}
      <div className="flex justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowNotInterested(!showNotInterested)}
          className="text-muted-foreground"
        >
          {showNotInterested ? (
            <>
              <EyeOff className="h-4 w-4 mr-1" />
              Hide Lost
            </>
          ) : (
            <>
              <Eye className="h-4 w-4 mr-1" />
              Show Lost ({filteredDealsByStage?.['Not Interested']?.length || 0})
            </>
          )}
        </Button>
      </div>

      {/* Kanban board - horizontal scroll with snap on mobile */}
      <ScrollArea className="w-full">
        <div className="flex gap-4 pb-4 min-w-max snap-x snap-mandatory md:snap-none overflow-x-auto scroll-smooth">
          {stagesToShow.map((stage) => {
            const deals = filteredDealsByStage?.[stage] || [];
            const config = STAGE_CONFIGS.find((c) => c.id === stage);
            const isDropTarget = dragOverStage === stage;

            return (
              <div
                key={stage}
                className={cn(
                  'flex-shrink-0 w-[85vw] sm:w-72 bg-muted/30 rounded-lg border-t-4 transition-colors snap-center',
                  COLUMN_COLORS[stage] || 'border-t-gray-400',
                  isDropTarget && 'bg-muted/60 ring-2 ring-primary/20'
                )}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverStage(stage);
                }}
                onDragLeave={() => setDragOverStage(null)}
                onDrop={(e) => handleDrop(e, stage)}
              >
                {/* Column header */}
                <div className="p-3 font-semibold flex justify-between items-center sticky top-0 bg-inherit">
                  <span className="truncate">{config?.shortLabel || stage}</span>
                  <span className="text-sm text-muted-foreground font-normal">
                    {deals.length}
                  </span>
                </div>

                {/* Column content */}
                <div className="p-2 space-y-2 min-h-[200px]">
                  {deals.length === 0 ? (
                    <EmptyStageState stageName={config?.shortLabel || stage} />
                  ) : (
                    deals.map((deal) => (
                      <DealCard
                        key={deal.id}
                        deal={deal}
                        onClick={() => onViewDeal?.(deal)}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
