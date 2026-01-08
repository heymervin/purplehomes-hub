/**
 * DealsListView - Sortable table view of all deals
 *
 * Features:
 * - Filter by stage, score, stale status
 * - Sortable columns
 * - Click row to open deal detail
 */

import { useState, useMemo } from 'react';
import { useDeals } from '@/services/dealsApi';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowUpDown, ChevronUp, ChevronDown } from 'lucide-react';
import { StageBadge } from '@/components/matching/StageBadge';
import { MatchScoreBadge } from '@/components/matching/MatchScoreBadge';
import { BuyerAvatar } from '../Shared/BuyerAvatar';
import { BuyerName } from '../Shared/BuyerName';
import { UrgencyIndicator, getUrgencyType } from '../Shared/UrgencyIndicator';
import { NoDealsEmptyState, NoResultsEmptyState } from '../Shared/DealEmptyState';
import { MATCH_DEAL_STAGES } from '@/types/associations';
import type { Deal, DealSortField, DealSortDirection } from '@/types/deals';
import type { DealPipelineFilters } from '@/pages/DealPipeline';
import { formatDistanceToNow, isToday } from 'date-fns';

interface DealsListViewProps {
  filters?: DealPipelineFilters;
  onViewDeal?: (deal: Deal) => void;
}

export function DealsListView({
  filters,
  onViewDeal,
}: DealsListViewProps) {
  // Sort state
  const [sortField, setSortField] = useState<DealSortField>('lastActivity');
  const [sortDirection, setSortDirection] = useState<DealSortDirection>('desc');

  // Fetch all deals
  const { data: deals, isLoading, error } = useDeals();

  // Filter and sort deals
  const filteredAndSortedDeals = useMemo(() => {
    if (!deals) return [];

    let filtered = [...deals];

    // Apply search filter (buyer name or property address)
    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter((deal) => {
        const buyerName = `${deal.buyer?.firstName || ''} ${deal.buyer?.lastName || ''}`.toLowerCase();
        const propertyAddress = (deal.property?.address || '').toLowerCase();
        const propertyCity = (deal.property?.city || '').toLowerCase();
        return (
          buyerName.includes(searchLower) ||
          propertyAddress.includes(searchLower) ||
          propertyCity.includes(searchLower)
        );
      });
    }

    // Apply stage filter
    if (filters?.stage && filters.stage !== 'all') {
      filtered = filtered.filter((deal) => deal.status === filters.stage);
    }

    // Apply min score filter
    if (filters?.minScore && filters.minScore !== 'all') {
      const minScore = parseInt(filters.minScore, 10);
      filtered = filtered.filter((deal) => deal.score >= minScore);
    }

    // Apply stale only filter
    if (filters?.staleOnly) {
      filtered = filtered.filter((deal) => deal.isStale);
    }

    // Apply sent today filter - check dateSent field (when deal was sent to buyer)
    if (filters?.sentToday) {
      filtered = filtered.filter((deal) => {
        // Use dateSent (when sent to buyer) or fall back to createdAt
        const sentDate = deal.dateSent || deal.createdAt;
        if (!sentDate) return false;
        // Parse date-only strings (YYYY-MM-DD) as local time, not UTC
        // new Date("2025-01-08") parses as UTC midnight, causing timezone issues
        const dateStr = sentDate.split('T')[0]; // Get just the date part
        const [year, month, day] = dateStr.split('-').map(Number);
        const localDate = new Date(year, month - 1, day);
        return isToday(localDate);
      });
    }

    // Sort filtered deals
    return filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'lastActivity':
          const aDate = a.lastActivityAt ? new Date(a.lastActivityAt).getTime() : 0;
          const bDate = b.lastActivityAt ? new Date(b.lastActivityAt).getTime() : 0;
          comparison = aDate - bDate;
          break;
        case 'score':
          comparison = a.score - b.score;
          break;
        case 'stage':
          const stageOrder = MATCH_DEAL_STAGES.indexOf(a.status as any) -
            MATCH_DEAL_STAGES.indexOf(b.status as any);
          comparison = stageOrder;
          break;
        case 'createdAt':
          const aCreated = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bCreated = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          comparison = aCreated - bCreated;
          break;
        case 'buyerName':
          comparison = `${a.buyer?.firstName} ${a.buyer?.lastName}`.localeCompare(
            `${b.buyer?.firstName} ${b.buyer?.lastName}`
          );
          break;
        case 'propertyAddress':
          comparison = (a.property?.address || '').localeCompare(
            b.property?.address || ''
          );
          break;
        case 'price':
          comparison = (a.property?.price || 0) - (b.property?.price || 0);
          break;
        default:
          comparison = 0;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [deals, filters, sortField, sortDirection]);

  // Check if filters are active
  const hasActiveFilters = filters && (
    filters.search !== '' ||
    filters.stage !== 'all' ||
    filters.minScore !== 'all' ||
    filters.staleOnly ||
    filters.sentToday
  );

  // Handle sort click
  const handleSort = (field: DealSortField) => {
    if (sortField === field) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Sort indicator
  const SortIndicator = ({ field }: { field: DealSortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-3 w-3 ml-1 opacity-30" />;
    }
    return sortDirection === 'asc' ? (
      <ChevronUp className="h-3 w-3 ml-1" />
    ) : (
      <ChevronDown className="h-3 w-3 ml-1" />
    );
  };

  // Loading state
  if (isLoading) {
    return (
      <Card className="p-6">
        <Skeleton className="h-5 w-24 mb-4" />
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
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

  // No deals at all
  if (!deals || deals.length === 0) {
    if (!hasActiveFilters) {
      return <NoDealsEmptyState />;
    }
  }

  // No results after filtering
  if (filteredAndSortedDeals.length === 0 && hasActiveFilters) {
    return (
      <Card className="p-6">
        <NoResultsEmptyState />
      </Card>
    );
  }

  return (
    <Card className="p-6">
      {/* Results count */}
      <p className="text-sm text-muted-foreground mb-4">
        {filteredAndSortedDeals.length} deal{filteredAndSortedDeals.length !== 1 ? 's' : ''}
        {hasActiveFilters && deals && filteredAndSortedDeals.length !== deals.length && (
          <span> of {deals.length}</span>
        )}
      </p>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10"></TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 font-medium hover:bg-transparent"
                  onClick={() => handleSort('propertyAddress')}
                >
                  Property
                  <SortIndicator field="propertyAddress" />
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 font-medium hover:bg-transparent"
                  onClick={() => handleSort('buyerName')}
                >
                  Buyer
                  <SortIndicator field="buyerName" />
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 font-medium hover:bg-transparent"
                  onClick={() => handleSort('stage')}
                >
                  Stage
                  <SortIndicator field="stage" />
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 font-medium hover:bg-transparent"
                  onClick={() => handleSort('score')}
                >
                  Score
                  <SortIndicator field="score" />
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 font-medium hover:bg-transparent"
                  onClick={() => handleSort('lastActivity')}
                >
                  Last Activity
                  <SortIndicator field="lastActivity" />
                </Button>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedDeals.map((deal) => (
              <TableRow
                key={deal.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => onViewDeal?.(deal)}
              >
                <TableCell>
                  <UrgencyIndicator
                    type={getUrgencyType(deal.isStale, deal.daysSinceActivity)}
                  />
                </TableCell>
                <TableCell>
                  <div className="min-w-0">
                    <p className="font-medium truncate max-w-xs">
                      {deal.property?.address || 'Unknown'}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {deal.property?.city}, {deal.property?.state}
                    </p>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <BuyerAvatar
                      firstName={deal.buyer?.firstName}
                      lastName={deal.buyer?.lastName}
                      size="sm"
                    />
                    <BuyerName
                      firstName={deal.buyer?.firstName}
                      lastName={deal.buyer?.lastName}
                      qualified={deal.buyer?.qualified}
                      className="truncate max-w-32"
                    />
                  </div>
                </TableCell>
                <TableCell>
                  <StageBadge stage={deal.status} size="sm" />
                </TableCell>
                <TableCell>
                  <MatchScoreBadge score={deal.score} size="sm" />
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {deal.lastActivityAt
                    ? formatDistanceToNow(new Date(deal.lastActivityAt), {
                        addSuffix: true,
                      })
                    : 'No activity'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
