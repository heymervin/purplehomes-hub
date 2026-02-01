import { useState, useEffect } from 'react';
import {
  Brain, Zap, TrendingUp, Target, Users, Sparkles,
  BarChart3, AlertCircle, RefreshCw, ChevronDown, Star, FlaskConical, LineChart
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import type { BuyerSegment } from '@/types/funnel';
import type { AvatarResearchHistory, SegmentInsights, InsightItem, FormulaEffectiveness } from '@/types/avatar-research';
import { FunnelAnalyticsDashboard } from './FunnelAnalyticsDashboard';

// Buyer segment labels for display
const SEGMENT_LABELS: Record<BuyerSegment, { label: string; emoji: string; color: string }> = {
  'first-time-buyer': { label: 'First-Time Buyers', emoji: '🏠', color: 'bg-blue-500' },
  'credit-challenged': { label: 'Credit-Challenged', emoji: '📈', color: 'bg-amber-500' },
  'investor': { label: 'Investors', emoji: '💰', color: 'bg-emerald-500' },
  'move-up-buyer': { label: 'Move-Up Buyers', emoji: '🏡', color: 'bg-purple-500' },
  'self-employed': { label: 'Self-Employed', emoji: '💼', color: 'bg-indigo-500' },
  'hispanic-seller-finance': { label: 'Hispanic/Latino', emoji: '👨‍👩‍👧‍👦', color: 'bg-rose-500' },
  'general': { label: 'General', emoji: '👥', color: 'bg-gray-500' },
};

const ALL_SEGMENTS: BuyerSegment[] = [
  'first-time-buyer',
  'credit-challenged',
  'investor',
  'move-up-buyer',
  'self-employed',
  'hispanic-seller-finance',
  'general',
];

interface SegmentData {
  segment: BuyerSegment;
  history: AvatarResearchHistory | null;
  loading: boolean;
  error: string | null;
}

/**
 * AI Performance Dashboard Component
 * Shows avatar research insights and learning algorithm performance
 */
export function AIPerformance() {
  const [segmentData, setSegmentData] = useState<SegmentData[]>(
    ALL_SEGMENTS.map(segment => ({
      segment,
      history: null,
      loading: true,
      error: null,
    }))
  );
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch all segment data on mount
  useEffect(() => {
    loadAllSegments();
  }, []);

  const loadAllSegments = async () => {
    setIsRefreshing(true);

    const results = await Promise.all(
      ALL_SEGMENTS.map(async (segment) => {
        try {
          // Fetch from API (reads from Airtable) instead of static JSON files
          const response = await fetch(`/api/funnel/avatar-research?action=history&segment=${segment}`);
          if (!response.ok) {
            if (response.status === 404) {
              return { segment, history: null, loading: false, error: null };
            }
            throw new Error(`Failed to load ${segment}`);
          }
          const data = await response.json();
          const history = data.success ? data.history : null;
          return { segment, history, loading: false, error: null };
        } catch (error) {
          return {
            segment,
            history: null,
            loading: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      })
    );

    setSegmentData(results);
    setIsRefreshing(false);
  };

  // Calculate global stats
  const globalStats = {
    totalResearches: segmentData.reduce((sum, s) => sum + (s.history?.entries?.length || 0), 0),
    totalRated: segmentData.reduce((sum, s) => sum + (s.history?.insights?.totalRated || 0), 0),
    avgEffectiveness: (() => {
      const rated = segmentData.filter(s => s.history?.insights?.totalRated && s.history.insights.totalRated > 0);
      if (rated.length === 0) return 0;
      const total = rated.reduce((sum, s) => sum + (s.history?.insights?.avgEffectiveness || 0), 0);
      return total / rated.length;
    })(),
    activeSegments: segmentData.filter(s => s.history?.entries && s.history.entries.length > 0).length,
  };

  // Get top performing segment
  const topSegment = segmentData
    .filter(s => s.history?.insights?.totalRated && s.history.insights.totalRated > 0)
    .sort((a, b) => (b.history?.insights?.avgEffectiveness || 0) - (a.history?.insights?.avgEffectiveness || 0))[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-600" />
            AI Learning Performance
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Track how your funnel content is learning and improving over time
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadAllSegments}
          disabled={isRefreshing}
        >
          {isRefreshing ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          <span className="ml-2">Refresh</span>
        </Button>
      </div>

      {/* Global Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <BarChart3 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Researches</p>
                <p className="text-2xl font-bold">{globalStats.totalResearches}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <Star className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Rated Entries</p>
                <p className="text-2xl font-bold">{globalStats.totalRated}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Avg. Effectiveness</p>
                <p className="text-2xl font-bold">
                  {globalStats.avgEffectiveness > 0
                    ? `${globalStats.avgEffectiveness.toFixed(1)}/10`
                    : '—'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Active Segments</p>
                <p className="text-2xl font-bold">{globalStats.activeSegments}/7</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Empty State */}
      {globalStats.totalResearches === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-12">
            <div className="text-center">
              <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Research Data Yet</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Generate your first funnel content to start building your AI learning database.
                The more you rate your funnels, the smarter the AI becomes!
              </p>
              <div className="mt-6 p-4 bg-muted/50 rounded-lg inline-block">
                <p className="text-sm font-medium">How to get started:</p>
                <ol className="text-sm text-muted-foreground text-left mt-2 space-y-1">
                  <li>1. Go to a property → Funnel tab</li>
                  <li>2. Generate funnel content</li>
                  <li>3. Rate the content (7+ adds to insights)</li>
                  <li>4. Watch the AI improve over time!</li>
                </ol>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Performer Highlight */}
      {topSegment && topSegment.history?.insights && (
        <Card className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/30 dark:to-blue-950/30 border-purple-200 dark:border-purple-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-white dark:bg-gray-800 shadow-sm">
                <Sparkles className="h-6 w-6 text-purple-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Top Performing Segment</p>
                <p className="text-lg font-semibold">
                  {SEGMENT_LABELS[topSegment.segment].emoji} {SEGMENT_LABELS[topSegment.segment].label}
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-purple-600">
                  {topSegment.history.insights.avgEffectiveness.toFixed(1)}/10
                </p>
                <p className="text-xs text-muted-foreground">
                  {topSegment.history.insights.totalRated} ratings
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Segment Details */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground">Segment Performance</h3>

        {segmentData.map(({ segment, history, loading, error }) => (
          <SegmentCard
            key={segment}
            segment={segment}
            history={history}
            loading={loading}
            error={error}
          />
        ))}
      </div>

      {/* Behavioral Analytics */}
      <div className="pt-4">
        <FunnelAnalyticsDashboard />
      </div>
    </div>
  );
}

/**
 * Individual segment card with collapsible insights
 */
function SegmentCard({
  segment,
  history,
  loading,
  error,
}: {
  segment: BuyerSegment;
  history: AvatarResearchHistory | null;
  loading: boolean;
  error: string | null;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const segmentInfo = SEGMENT_LABELS[segment];
  const insights = history?.insights;
  const entryCount = history?.entries?.length || 0;
  const ratedCount = insights?.totalRated || 0;
  const avgEffectiveness = insights?.avgEffectiveness || 0;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="border rounded-lg">
        <CollapsibleTrigger asChild>
          <button className="flex items-center justify-between w-full p-4 hover:bg-muted/50 transition-colors text-left">
            <div className="flex items-center gap-3">
              <div className={cn('w-3 h-3 rounded-full', segmentInfo.color)} />
              <span className="mr-1">{segmentInfo.emoji}</span>
              <span className="font-medium">{segmentInfo.label}</span>
              {entryCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {entryCount} {entryCount === 1 ? 'entry' : 'entries'}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-4">
              {loading ? (
                <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : error ? (
                <AlertCircle className="h-4 w-4 text-destructive" />
              ) : entryCount > 0 ? (
                <>
                  {avgEffectiveness > 0 && (
                    <div className="flex items-center gap-1">
                      <Zap className={cn(
                        "h-4 w-4",
                        avgEffectiveness >= 7 ? "text-emerald-500" :
                        avgEffectiveness >= 5 ? "text-amber-500" : "text-muted-foreground"
                      )} />
                      <span className="text-sm font-medium">{avgEffectiveness.toFixed(1)}</span>
                    </div>
                  )}
                  <Progress
                    value={(ratedCount / Math.max(entryCount, 1)) * 100}
                    className="w-20 h-2"
                  />
                </>
              ) : (
                <span className="text-xs text-muted-foreground">No data</span>
              )}
              <ChevronDown className={cn(
                "h-4 w-4 text-muted-foreground transition-transform",
                isOpen && "rotate-180"
              )} />
            </div>
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 pb-4 pt-2 border-t">
            {loading ? (
              <div className="py-4 text-center text-muted-foreground">
                <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
                Loading insights...
              </div>
            ) : error ? (
              <div className="py-4 text-center text-destructive">
                <AlertCircle className="h-5 w-5 mx-auto mb-2" />
                {error}
              </div>
            ) : !history || entryCount === 0 ? (
              <div className="py-4 text-center text-muted-foreground">
                <Target className="h-5 w-5 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No research generated yet for this segment.</p>
                <p className="text-xs mt-1">Generate a funnel for a {segmentInfo.label.toLowerCase()} to start learning.</p>
              </div>
            ) : (
              <InsightsDisplay insights={insights!} />
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

/**
 * Display insights for a segment
 */
function InsightsDisplay({ insights }: { insights: SegmentInsights }) {
  const hasInsights =
    insights.topDreams.length > 0 ||
    insights.topFears.length > 0 ||
    insights.topObjections.length > 0;

  if (!hasInsights && insights.totalRated === 0) {
    return (
      <div className="py-4 text-center text-muted-foreground">
        <Star className="h-5 w-5 mx-auto mb-2 opacity-50" />
        <p className="text-sm">Rate entries 7+ to build insights.</p>
        <p className="text-xs mt-1">
          {insights.totalResearches} researches generated, {insights.totalRated} rated high enough yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 p-3 bg-muted/50 rounded-lg">
        <div className="text-center">
          <p className="text-lg font-bold">{insights.totalResearches}</p>
          <p className="text-xs text-muted-foreground">Generated</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold">{insights.totalRated}</p>
          <p className="text-xs text-muted-foreground">Rated 7+</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold">
            {insights.avgEffectiveness > 0 ? insights.avgEffectiveness.toFixed(1) : '—'}
          </p>
          <p className="text-xs text-muted-foreground">Avg Score</p>
        </div>
      </div>

      {/* Insights lists */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {insights.topDreams.length > 0 && (
          <InsightList
            title="Top Dreams"
            emoji="✨"
            items={insights.topDreams}
            color="text-blue-600"
          />
        )}
        {insights.topFears.length > 0 && (
          <InsightList
            title="Top Fears"
            emoji="😰"
            items={insights.topFears}
            color="text-amber-600"
          />
        )}
        {insights.topSuspicions.length > 0 && (
          <InsightList
            title="Top Suspicions"
            emoji="🤔"
            items={insights.topSuspicions}
            color="text-purple-600"
          />
        )}
        {insights.topObjections.length > 0 && (
          <InsightList
            title="Top Objections"
            emoji="🛑"
            items={insights.topObjections}
            color="text-red-600"
          />
        )}
      </div>

      {/* Effective hooks */}
      {insights.mostEffectiveHooks.length > 0 && (
        <div>
          <p className="text-sm font-medium mb-2 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-purple-600" />
            Most Effective Hooks
          </p>
          <div className="space-y-2">
            {insights.mostEffectiveHooks.slice(0, 3).map((hook, i) => (
              <div key={i} className="p-2 bg-purple-50 dark:bg-purple-950/30 rounded text-sm italic">
                "{hook}"
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Formula Performance (if available) */}
      {insights.formulaStats && (
        <FormulaStatsDisplay stats={insights.formulaStats} />
      )}
    </div>
  );
}

/**
 * Display formula effectiveness stats
 */
function FormulaStatsDisplay({ stats }: {
  stats: {
    landingPage: FormulaEffectiveness[];
    hook: FormulaEffectiveness[];
    problem: FormulaEffectiveness[];
    solution: FormulaEffectiveness[];
    showcase: FormulaEffectiveness[];
    proof: FormulaEffectiveness[];
    cta: FormulaEffectiveness[];
  };
}) {
  const hasAnyStats = Object.values(stats).some(arr => arr.length > 0);

  if (!hasAnyStats) {
    return null;
  }

  // Get top performer from each category
  const topPerformers = [
    { category: 'Landing Page', data: stats.landingPage[0], icon: '📄' },
    { category: 'Hook', data: stats.hook[0], icon: '🎣' },
    { category: 'Problem', data: stats.problem[0], icon: '🔥' },
    { category: 'Solution', data: stats.solution[0], icon: '💡' },
    { category: 'Showcase', data: stats.showcase[0], icon: '🏠' },
    { category: 'Proof', data: stats.proof[0], icon: '⭐' },
    { category: 'CTA', data: stats.cta[0], icon: '🎯' },
  ].filter(p => p.data);

  return (
    <div className="mt-4 pt-4 border-t">
      <p className="text-sm font-medium mb-3 flex items-center gap-2">
        <FlaskConical className="h-4 w-4 text-indigo-600" />
        Formula Performance (Exploration/Exploitation)
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {topPerformers.map(({ category, data, icon }) => (
          <div
            key={category}
            className="flex items-center justify-between p-2 bg-indigo-50 dark:bg-indigo-950/30 rounded text-sm"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span>{icon}</span>
              <span className="font-medium truncate">{formatFormulaId(data.formulaId)}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge
                variant="outline"
                className={cn(
                  "text-xs",
                  data.avgEffectiveness >= 7 ? "border-emerald-500 text-emerald-600" :
                  data.avgEffectiveness >= 5 ? "border-amber-500 text-amber-600" :
                  "border-gray-400"
                )}
              >
                {data.avgEffectiveness.toFixed(1)}
              </Badge>
              <span className="text-xs text-muted-foreground">({data.usageCount}x)</span>
            </div>
          </div>
        ))}
      </div>

      {/* Learning mode indicator */}
      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
        <LineChart className="h-3 w-3" />
        <span>
          {Object.values(stats).reduce((sum, arr) => sum + arr.reduce((s, f) => s + f.usageCount, 0), 0)} total formula uses tracked
        </span>
      </div>
    </div>
  );
}

/**
 * Format formula ID for display
 */
function formatFormulaId(id: string): string {
  return id
    .replace(/-/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .replace('Pas', 'PAS')
    .replace('Aida', 'AIDA')
    .replace('Cta', 'CTA');
}

/**
 * List of insight items
 */
function InsightList({
  title,
  emoji,
  items,
  color,
}: {
  title: string;
  emoji: string;
  items: InsightItem[];
  color: string;
}) {
  return (
    <div>
      <p className={cn("text-sm font-medium mb-2", color)}>
        {emoji} {title}
      </p>
      <ul className="space-y-1.5">
        {items.slice(0, 5).map((item, i) => (
          <li key={i} className="text-sm flex items-start gap-2">
            <span className="text-muted-foreground text-xs mt-0.5">#{i + 1}</span>
            <span className="flex-1">{item.value}</span>
            <Badge variant="outline" className="text-xs shrink-0">
              {item.avgEffectiveness.toFixed(1)}
            </Badge>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default AIPerformance;
