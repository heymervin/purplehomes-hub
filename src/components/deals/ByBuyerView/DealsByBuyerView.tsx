/**
 * DealsByBuyerView - Deals grouped by buyer
 *
 * Shows an accordion/collapsible list of buyers with their deals.
 */

import { useMemo } from 'react';
import { useDealsByBuyer } from '@/services/dealsApi';
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
import type { Deal, DealsByBuyer } from '@/types/deals';
import type { DealPipelineFilters } from '@/pages/DealPipeline';
import { Home, ChevronRight } from 'lucide-react';
import { isToday } from 'date-fns';

interface DealsByBuyerViewProps {
  filters?: DealPipelineFilters;
  onViewDeal?: (deal: Deal) => void;
}

export function DealsByBuyerView({ filters, onViewDeal }: DealsByBuyerViewProps) {
  const { data: buyerGroups, isLoading, error } = useDealsByBuyer();

  // Filter by all filter criteria
  const filteredGroups = useMemo(() => {
    if (!buyerGroups) return [];

    return buyerGroups
      .map((group) => {
        // First filter deals within each group
        let filteredDeals = [...group.deals];

        // Filter by search (buyer name or property address)
        if (filters?.search) {
          const searchLower = filters.search.toLowerCase();
          const buyerName = `${group.buyer.firstName} ${group.buyer.lastName}`.toLowerCase();
          const buyerMatches = buyerName.includes(searchLower);

          if (!buyerMatches) {
            // Only show deals that match property address
            filteredDeals = filteredDeals.filter((deal) =>
              deal.property?.address?.toLowerCase().includes(searchLower) ||
              deal.property?.city?.toLowerCase().includes(searchLower)
            );
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
            // Parse date-only strings (YYYY-MM-DD) as local time, not UTC
            const dateStr = sentDate.split('T')[0];
            const [year, month, day] = dateStr.split('-').map(Number);
            const localDate = new Date(year, month - 1, day);
            return isToday(localDate);
          });
        }

        return {
          ...group,
          deals: filteredDeals,
          totalDeals: filteredDeals.length,
          totalValue: filteredDeals.reduce((sum, deal) => sum + (deal.property?.price || 0), 0),
        };
      })
      .filter((group) => group.deals.length > 0); // Only show groups with matching deals
  }, [buyerGroups, filters]);

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
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-5 w-40 mb-1" />
                  <Skeleton className="h-4 w-24" />
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
  if (!buyerGroups || buyerGroups.length === 0) {
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
        {filteredGroups.length} buyer{filteredGroups.length !== 1 ? 's' : ''} with active deals
        {hasActiveFilters && buyerGroups && filteredGroups.length !== buyerGroups.length && (
          <span> of {buyerGroups.length}</span>
        )}
      </p>

      <Accordion type="multiple" className="space-y-2">
        {filteredGroups.map((group) => (
          <AccordionItem
            key={group.buyer.contactId || group.buyer.recordId}
            value={group.buyer.contactId || group.buyer.recordId || ''}
            className="border rounded-lg px-4"
          >
            <AccordionTrigger className="hover:no-underline py-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <BuyerAvatar
                  firstName={group.buyer.firstName}
                  lastName={group.buyer.lastName}
                  size="md"
                />
                <div className="flex-1 min-w-0 text-left">
                  <BuyerName
                    firstName={group.buyer.firstName}
                    lastName={group.buyer.lastName}
                    qualified={group.buyer.qualified}
                    className="font-medium truncate"
                  />
                  <p className="text-xs text-muted-foreground">
                    {group.buyer.email}
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Home className="h-3 w-3" />
                    {group.totalDeals}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {formatPipelineValue(group.totalValue)}
                  </span>
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
                    {deal.property?.heroImage ? (
                      <img
                        src={deal.property.heroImage}
                        alt=""
                        className="h-12 w-16 object-cover rounded flex-shrink-0"
                      />
                    ) : (
                      <div className="h-12 w-16 bg-muted rounded flex items-center justify-center flex-shrink-0">
                        <Home className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {deal.property?.address || 'Unknown Property'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {deal.property?.city}, {deal.property?.state}
                        {deal.property?.price && (
                          <> &bull; {formatPipelineValue(deal.property.price)}</>
                        )}
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
