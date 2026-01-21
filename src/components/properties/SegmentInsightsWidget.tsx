/**
 * Segment Insights Widget
 *
 * Contextual widget that shows learned insights for the selected buyer segment.
 * Displays in the Funnel tab when generating content to help guide the AI.
 */

import { useState, useEffect } from 'react';
import { Brain, Sparkles, TrendingUp, Lightbulb, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { BuyerSegment } from '@/types/funnel';
import type { AvatarResearchHistory, SegmentInsights } from '@/types/avatar-research';

interface SegmentInsightsWidgetProps {
  segment: BuyerSegment;
  className?: string;
}

// Segment display info
const SEGMENT_INFO: Record<BuyerSegment, { emoji: string; label: string }> = {
  'first-time-buyer': { emoji: '🏠', label: 'First-Time Buyers' },
  'credit-challenged': { emoji: '📈', label: 'Credit-Challenged' },
  'investor': { emoji: '💰', label: 'Investors' },
  'move-up-buyer': { emoji: '🏡', label: 'Move-Up Buyers' },
  'self-employed': { emoji: '💼', label: 'Self-Employed' },
  'general': { emoji: '👥', label: 'General' },
};

export function SegmentInsightsWidget({ segment, className }: SegmentInsightsWidgetProps) {
  const [insights, setInsights] = useState<SegmentInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [totalEntries, setTotalEntries] = useState(0);

  // Load insights when segment changes
  useEffect(() => {
    loadInsights();
  }, [segment]);

  const loadInsights = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/research/avatars/${segment}.json`);
      if (!response.ok) {
        setInsights(null);
        setTotalEntries(0);
        return;
      }
      const history: AvatarResearchHistory = await response.json();
      setInsights(history.insights);
      setTotalEntries(history.entries?.length || 0);
    } catch (error) {
      console.error('Error loading segment insights:', error);
      setInsights(null);
      setTotalEntries(0);
    } finally {
      setLoading(false);
    }
  };

  const segmentInfo = SEGMENT_INFO[segment];
  const hasData = insights && (insights.totalRated > 0 || totalEntries > 0);
  const hasInsights = insights && insights.totalRated > 0;

  // Don't render if loading
  if (loading) {
    return (
      <div className={cn("p-3 bg-muted/30 rounded-lg border border-dashed", className)}>
        <div className="flex items-center gap-2 text-muted-foreground">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span className="text-xs">Loading insights...</span>
        </div>
      </div>
    );
  }

  // No data yet - show encouragement
  if (!hasData) {
    return (
      <div className={cn("p-3 bg-gradient-to-r from-blue-50/50 to-purple-50/50 dark:from-blue-950/20 dark:to-purple-950/20 rounded-lg border border-blue-200/50 dark:border-blue-800/50", className)}>
        <div className="flex items-start gap-2">
          <Brain className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-medium text-blue-700 dark:text-blue-300">
              No {segmentInfo.label} insights yet
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Generate content and rate it 7+ to build your AI knowledge base
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Has data but no high ratings yet
  if (!hasInsights) {
    return (
      <div className={cn("p-3 bg-gradient-to-r from-amber-50/50 to-orange-50/50 dark:from-amber-950/20 dark:to-orange-950/20 rounded-lg border border-amber-200/50 dark:border-amber-800/50", className)}>
        <div className="flex items-start gap-2">
          <Lightbulb className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-medium text-amber-700 dark:text-amber-300">
              {totalEntries} {totalEntries === 1 ? 'funnel' : 'funnels'} generated for {segmentInfo.label}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Rate your best content 7+ to unlock AI learning
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Has insights - show them!
  return (
    <div className={cn("p-3 bg-gradient-to-r from-emerald-50/50 to-teal-50/50 dark:from-emerald-950/20 dark:to-teal-950/20 rounded-lg border border-emerald-200/50 dark:border-emerald-800/50", className)}>
      <div className="space-y-2">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-emerald-500" />
            <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
              AI Learning Active
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] h-5 bg-white/50 dark:bg-gray-800/50">
              <TrendingUp className="h-3 w-3 mr-1" />
              {insights.avgEffectiveness.toFixed(1)}/10
            </Badge>
            <Badge variant="secondary" className="text-[10px] h-5">
              {insights.totalRated} rated
            </Badge>
          </div>
        </div>

        {/* Quick insights */}
        <div className="space-y-1.5">
          {insights.topDreams.length > 0 && (
            <InsightRow
              label="Top Dream"
              value={insights.topDreams[0].value}
              score={insights.topDreams[0].avgEffectiveness}
            />
          )}
          {insights.topFears.length > 0 && (
            <InsightRow
              label="Top Fear"
              value={insights.topFears[0].value}
              score={insights.topFears[0].avgEffectiveness}
            />
          )}
          {insights.topObjections.length > 0 && (
            <InsightRow
              label="Key Objection"
              value={insights.topObjections[0].value}
              score={insights.topObjections[0].avgEffectiveness}
            />
          )}
        </div>

        {/* Footer hint */}
        <p className="text-[10px] text-muted-foreground pt-1 border-t border-emerald-200/50 dark:border-emerald-800/50">
          These insights are automatically injected into AI prompts
        </p>
      </div>
    </div>
  );
}

/**
 * Single insight row display
 */
function InsightRow({ label, value, score }: { label: string; value: string; score: number }) {
  // Truncate long values
  const displayValue = value.length > 50 ? value.slice(0, 47) + '...' : value;

  return (
    <div className="flex items-start gap-2 text-xs">
      <span className="text-muted-foreground shrink-0 w-20">{label}:</span>
      <span className="flex-1 text-foreground/80 line-clamp-1" title={value}>
        {displayValue}
      </span>
      <span className="text-emerald-600 dark:text-emerald-400 shrink-0 text-[10px] font-medium">
        {score.toFixed(1)}
      </span>
    </div>
  );
}

export default SegmentInsightsWidget;
