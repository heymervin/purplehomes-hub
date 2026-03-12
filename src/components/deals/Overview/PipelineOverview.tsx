/**
 * PipelineOverview - Main overview dashboard for Deal Pipeline
 *
 * Displays:
 * - Key metrics (total deals, pipeline value, closing soon)
 * - Pipeline health chart (deals by stage)
 * - Needs attention list (stale deals)
 * - Upcoming showings
 */

import {
  usePipelineStats,
  useStaleDeals,
  useUpcomingShowings,
} from '@/services/dealsApi';
import { MetricCard, formatPipelineValue } from './MetricCard';
import { PipelineHealthChart } from './PipelineHealthChart';
import { NeedsAttentionCard } from './NeedsAttentionCard';
import { UpcomingCard } from './UpcomingCard';
import { MorningBriefing } from '../MorningBriefing';
import { BarChart3, DollarSign, Clock, TrendingUp } from 'lucide-react';
import type { Deal } from '@/types/deals';

interface PipelineOverviewProps {
  onViewDeal?: (deal: Deal) => void;
  onViewStaleDeals?: () => void;
  onViewCalendar?: () => void;
}

export function PipelineOverview({
  onViewDeal,
  onViewStaleDeals,
  onViewCalendar,
}: PipelineOverviewProps) {
  const { data: stats, isLoading: loadingStats } = usePipelineStats();
  const { data: staleDeals, isLoading: loadingStale } = useStaleDeals(5);
  const { data: upcomingDeals, isLoading: loadingUpcoming } = useUpcomingShowings(5);

  return (
    <div className="space-y-6">
      {/* Morning Briefing - Dismissable daily summary */}
      <MorningBriefing onViewDeal={onViewDeal} />

      {/* Key Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          icon={BarChart3}
          label="Active Deals"
          value={loadingStats ? '...' : stats?.totalDeals || 0}
          trend={
            stats?.newThisWeek
              ? `+${stats.newThisWeek} this week`
              : undefined
          }
          trendUp={true}
          iconColor="text-primary"
          iconBg="bg-primary/10"
        />
        <MetricCard
          icon={DollarSign}
          label="Pipeline Value"
          value={
            loadingStats
              ? '...'
              : formatPipelineValue(stats?.pipelineValue || 0)
          }
          iconColor="text-green-600"
          iconBg="bg-green-100"
        />
        <MetricCard
          icon={Clock}
          label="Closing Soon"
          value={loadingStats ? '...' : stats?.closingSoon || 0}
          subtext="In Contracts"
          iconColor="text-amber-600"
          iconBg="bg-amber-100"
        />
      </div>

      {/* Pipeline Health Chart */}
      <PipelineHealthChart stats={stats} isLoading={loadingStats} />

      {/* Two-column: Needs Attention + Upcoming */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <NeedsAttentionCard
          deals={staleDeals || []}
          isLoading={loadingStale}
          onViewAll={onViewStaleDeals}
          onViewDeal={onViewDeal}
        />
        <UpcomingCard
          deals={upcomingDeals || []}
          isLoading={loadingUpcoming}
          onViewCalendar={onViewCalendar}
          onViewDeal={onViewDeal}
        />
      </div>
    </div>
  );
}
