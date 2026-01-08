/**
 * DealsByPropertyView - Deals grouped by property
 *
 * Shows properties with their interested buyers.
 */

import { useMemo } from 'react';
import { useDealsByProperty } from '@/services/dealsApi';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { StageBadge } from '@/components/matching/StageBadge';
import { MatchScoreBadge } from '@/components/matching/MatchScoreBadge';
import { BuyerAvatar } from '../Shared/BuyerAvatar';
import { BuyerName } from '../Shared/BuyerName';
import { NoDealsEmptyState, NoResultsEmptyState } from '../Shared/DealEmptyState';
import { formatPipelineValue } from '../Overview/MetricCard';
import { MATCH_DEAL_STAGES } from '@/types/associations';
import type { Deal } from '@/types/deals';
import type { DealPipelineFilters } from '@/pages/DealPipeline';
import type { MatchDealStage } from '@/types/associations';
import { Home, Users, ChevronRight } from 'lucide-react';
import { isToday } from 'date-fns';

interface DealsByPropertyViewProps {
  filters?: DealPipelineFilters;
  onViewDeal?: (deal: Deal) => void;
}

export function DealsByPropertyView({ filters, onViewDeal }: DealsByPropertyViewProps) {
  const { data: propertyGroups, isLoading, error } = useDealsByProperty();

  // Filter by all filter criteria
  const filteredGroups = useMemo(() => {
    if (!propertyGroups) return [];

    return propertyGroups
      .map((group) => {
        // First filter deals within each group
        let filteredDeals = [...group.deals];

        // Filter by search (property address or buyer name)
        if (filters?.search) {
          const searchLower = filters.search.toLowerCase();
          const propertyMatches =
            group.property?.address?.toLowerCase().includes(searchLower) ||
            group.property?.city?.toLowerCase().includes(searchLower);

          if (!propertyMatches) {
            // Only show deals that match buyer name
            filteredDeals = filteredDeals.filter((deal) => {
              const buyerName = `${deal.buyer?.firstName} ${deal.buyer?.lastName}`.toLowerCase();
              return buyerName.includes(searchLower);
            });
          }
        }

        // Filter by stage
        if (filters?.stage && filters.stage !== 'all') {
          filteredDeals = filteredDeals.filter((deal) => deal.status === filters.stage);
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

        // Filter by sent today - check dateSent field (when deal was sent to buyer)
        if (filters?.sentToday) {
          filteredDeals = filteredDeals.filter((deal) => {
            const sentDate = deal.dateSent || deal.createdAt;
            if (!sentDate) return false;
            return isToday(new Date(sentDate));
          });
        }

        // Find the furthest stage among filtered deals
        const furthestStage = filteredDeals.reduce((maxStage, deal) => {
          const dealStageOrder = MATCH_DEAL_STAGES.indexOf(deal.status as MatchDealStage);
          const maxStageOrder = MATCH_DEAL_STAGES.indexOf(maxStage);
          return dealStageOrder > maxStageOrder ? (deal.status as MatchDealStage) : maxStage;
        }, filteredDeals[0]?.status as MatchDealStage || 'Sent to Buyer');

        return {
          ...group,
          deals: filteredDeals,
          totalBuyers: filteredDeals.length,
          highestScore: Math.max(...filteredDeals.map((d) => d.score), 0),
          furthestStage,
        };
      })
      .filter((group) => group.deals.length > 0); // Only show groups with matching deals
  }, [propertyGroups, filters]);

  // Check if filters are active
  const hasActiveFilters = filters && (
    filters.search !== '' ||
    filters.stage !== 'all' ||
    filters.minScore !== 'all' ||
    filters.staleOnly ||
    filters.sentToday
  );

  // Loading state
  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="border rounded-lg p-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-16 w-24 rounded" />
                <div className="flex-1">
                  <Skeleton className="h-5 w-48 mb-1" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className="p-6">
        <p className="text-red-500">Failed to load deals: {(error as Error).message}</p>
      </Card>
    );
  }

  // No deals
  if (!propertyGroups || propertyGroups.length === 0) {
    if (!hasActiveFilters) {
      return <NoDealsEmptyState />;
    }
  }

  // No filter results
  if (filteredGroups.length === 0 && hasActiveFilters) {
    return (
      <Card className="p-6">
        <NoResultsEmptyState />
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <p className="text-sm text-muted-foreground mb-4">
        {filteredGroups.length} propert{filteredGroups.length !== 1 ? 'ies' : 'y'} with active deals
        {hasActiveFilters && propertyGroups && filteredGroups.length !== propertyGroups.length && (
          <span> of {propertyGroups.length}</span>
        )}
      </p>

      <Accordion type="multiple" className="space-y-2">
        {filteredGroups.map((group) => (
          <AccordionItem
            key={group.property.recordId || group.property.propertyCode}
            value={group.property.recordId || group.property.propertyCode || ''}
            className="border rounded-lg px-4"
          >
            <AccordionTrigger className="hover:no-underline py-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {group.property.heroImage ? (
                  <img
                    src={group.property.heroImage}
                    alt=""
                    className="h-16 w-24 object-cover rounded flex-shrink-0"
                  />
                ) : (
                  <div className="h-16 w-24 bg-muted rounded flex items-center justify-center flex-shrink-0">
                    <Home className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0 text-left">
                  <p className="font-medium truncate">
                    {group.property.address || 'Unknown Property'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {group.property.city}, {group.property.state}
                    {group.property.price && (
                      <> &bull; {formatPipelineValue(group.property.price)}</>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {group.totalBuyers}
                  </Badge>
                  <StageBadge stage={group.furthestStage} size="sm" />
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2 pb-2">
                {group.deals.map((deal) => (
                  <div
                    key={deal.id}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group"
                    onClick={() => onViewDeal?.(deal)}
                  >
                    <BuyerAvatar
                      firstName={deal.buyer?.firstName}
                      lastName={deal.buyer?.lastName}
                      size="md"
                    />
                    <div className="flex-1 min-w-0">
                      <BuyerName
                        firstName={deal.buyer?.firstName}
                        lastName={deal.buyer?.lastName}
                        qualified={deal.buyer?.qualified}
                        className="text-sm font-medium truncate"
                      />
                      <p className="text-xs text-muted-foreground truncate">
                        {deal.buyer?.email}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <MatchScoreBadge score={deal.score} size="sm" />
                      <StageBadge stage={deal.status} size="sm" />
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </Card>
  );
}
