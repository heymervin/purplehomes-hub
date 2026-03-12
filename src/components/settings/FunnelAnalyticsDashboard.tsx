import { useState, useEffect } from 'react';
import {
  BarChart3, Clock, MousePointerClick, FileCheck,
  TrendingUp, TrendingDown, RefreshCw, Activity, Target, Eye, Users,
  ChevronDown, Building2
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import type { BuyerSegment } from '@/types/funnel';
import type { ChartConfig } from '@/components/ui/chart';
import { TimeSeriesChart } from '@/components/analytics/TimeSeriesChart';

const SEGMENT_LABELS: Record<string, { label: string; emoji: string }> = {
  'first-time-buyer': { label: 'First-Time', emoji: '🏠' },
  'credit-challenged': { label: 'Credit-Challenged', emoji: '📈' },
  'investor': { label: 'Investor', emoji: '💰' },
  'move-up-buyer': { label: 'Move-Up', emoji: '🏡' },
  'self-employed': { label: 'Self-Employed', emoji: '💼' },
  'hispanic-seller-finance': { label: 'Hispanic', emoji: '👨‍👩‍👧‍👦' },
  'general': { label: 'General', emoji: '👥' },
};

interface TimeSeriesDataPoint {
  date: string; // YYYY-MM-DD
  sessions: number;
  conversions: number;
  engaged: number;
  ctaClicked: number;
  avgScrollDepth: number;
  avgTimeOnPage: number;
  conversionRate: number;
}

interface SegmentMetrics {
  sessions: number;
  avgScrollDepth: number;
  avgTimeOnPage: number;
  ctaClickRate: number;
  conversionRate: number;
}

interface AnalyticsMetrics {
  totalSessions: number;
  engagedSessions: number;
  ctaClickedSessions: number;
  avgScrollDepth: number;
  avgTimeOnPage: number;
  avgCTAClicks: number;
  conversions: number;
  conversionRate: number;
  videoPlayRate: number;
  bySegment: Record<string, SegmentMetrics>;
  byProperty: Record<string, { sessions: number; avgScrollDepth: number; conversions: number; slug: string }>;
  timeSeriesData?: TimeSeriesDataPoint[];
  comparisonTimeSeriesData?: TimeSeriesDataPoint[];
}

interface PreviousMetrics {
  totalSessions: number;
  avgScrollDepth: number;
  avgTimeOnPage: number;
  avgCTAClicks: number;
  conversionRate: number;
  videoPlayRate: number;
}

// --- Helper functions ---

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
}

function getMetricColor(metric: string, value: number): string {
  switch (metric) {
    case 'conversionRate':
      return value >= 5 ? 'text-emerald-500' : value >= 2 ? 'text-amber-500' : 'text-red-500';
    case 'scrollDepth':
      return value >= 60 ? 'text-emerald-500' : value >= 40 ? 'text-amber-500' : 'text-red-500';
    case 'timeOnPage':
      return value >= 90 ? 'text-emerald-500' : value >= 45 ? 'text-amber-500' : 'text-red-500';
    default:
      return 'text-primary';
  }
}

function DeltaBadge({ current, previous, suffix = '', minSample = 0 }: { current: number; previous: number; suffix?: string; minSample?: number }) {
  if (!previous || previous === 0) return null;
  if (minSample > 0 && previous < minSample) return null;
  const delta = current - previous;
  const pctChange = Math.round((delta / previous) * 100);
  const isPositive = delta > 0;

  return (
    <span className={cn(
      "text-[10px] font-medium flex items-center gap-0.5 justify-center mt-1",
      isPositive ? "text-emerald-600" : "text-red-500"
    )}>
      {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {isPositive ? '+' : ''}{pctChange}%{suffix}
    </span>
  );
}

function formatSlugToTitle(slug: string): string {
  return slug
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function getCvrBarColor(cvr: number): string {
  if (cvr >= 5) return '#10b981';
  if (cvr >= 2) return '#f59e0b';
  return '#ef4444';
}

// --- Chart config for segment bar chart ---
const segmentChartConfig: ChartConfig = {
  cvr: {
    label: 'Conversion Rate (%)',
    color: '#4f46e5',
  },
};

/**
 * Funnel Analytics Dashboard
 * Shows real-time behavioral analytics from property funnel pages
 * Designed to be embedded in AI Performance tab
 */
export function FunnelAnalyticsDashboard() {
  const [metrics, setMetrics] = useState<AnalyticsMetrics | null>(null);
  const [previousMetrics, setPreviousMetrics] = useState<PreviousMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<number>(30);
  const [comparisonMode, setComparisonMode] = useState<'none' | 'yoy' | 'mom' | 'wow'>('none');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [propertiesOpen, setPropertiesOpen] = useState(false);

  useEffect(() => {
    loadAnalytics();
  }, [period, comparisonMode]);

  const loadAnalytics = async () => {
    setLoading(true);
    setError(null);

    try {
      const comparisonParam = comparisonMode !== 'none' ? `&comparisonMode=${comparisonMode}` : '';
      const res = await fetch(`/api/funnel?action=analytics-metrics&days=${period}${comparisonParam}`);

      if (!res.ok) {
        setMetrics(null);
        setPreviousMetrics(null);
        setLoading(false);
        return;
      }

      const data = await res.json();

      if (data.success && data.metrics) {
        setMetrics(data.metrics);
        setPreviousMetrics(data.previousMetrics ?? null);
        setLastUpdated(new Date());
      } else {
        setMetrics(null);
        setPreviousMetrics(null);
      }
    } catch (err) {
      // Don't show error - analytics might just not have data yet
      setMetrics(null);
      setPreviousMetrics(null);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    if (!seconds || seconds === 0) return '0s';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const segmentEntries = metrics?.bySegment
    ? Object.entries(metrics.bySegment).sort((a, b) => b[1].sessions - a[1].sessions)
    : [];

  const segmentChartData = segmentEntries.map(([segment, data]) => ({
    name: SEGMENT_LABELS[segment]?.label || segment,
    emoji: SEGMENT_LABELS[segment]?.emoji || '👤',
    sessions: data.sessions,
    cvr: data.conversionRate,
    scrollDepth: data.avgScrollDepth,
  }));

  const propertyEntries = metrics?.byProperty
    ? Object.entries(metrics.byProperty)
        .sort((a, b) => b[1].sessions - a[1].sessions)
        .slice(0, 10)
    : [];

  const maxPropertySessions = propertyEntries.length > 0
    ? Math.max(...propertyEntries.map(([, d]) => d.sessions))
    : 1;

  // Funnel stage calculations
  const funnelStages = metrics ? [
    {
      label: 'Sessions',
      value: metrics.totalSessions,
      pct: 100,
      color: 'bg-primary',
    },
    {
      label: 'Engaged (>25% scroll)',
      value: metrics.engagedSessions ?? 0,
      pct: metrics.totalSessions > 0
        ? Math.round(((metrics.engagedSessions ?? 0) / metrics.totalSessions) * 100)
        : 0,
      color: 'bg-blue-500',
    },
    {
      label: 'Clicked CTA',
      value: metrics.ctaClickedSessions ?? 0,
      pct: metrics.totalSessions > 0
        ? Math.round(((metrics.ctaClickedSessions ?? 0) / metrics.totalSessions) * 100)
        : 0,
      color: 'bg-emerald-500',
    },
    {
      label: 'Converted',
      value: metrics.conversions ?? 0,
      pct: Math.round(metrics.conversionRate),
      color: 'bg-amber-500',
    },
  ] : [];

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center">
          <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground mr-2" />
          <span className="text-muted-foreground">Loading analytics...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              Funnel Behavioral Analytics
            </CardTitle>
            <CardDescription>
              Real-time tracking from property funnel pages
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {lastUpdated && (
              <span className="text-[10px] text-muted-foreground">
                Updated {formatTimeAgo(lastUpdated)}
              </span>
            )}
            <select
              value={period}
              onChange={(e) => setPeriod(Number(e.target.value))}
              className="text-xs border rounded px-2 py-1 bg-background"
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>
            <select
              value={comparisonMode}
              onChange={(e) => setComparisonMode(e.target.value as 'none' | 'yoy' | 'mom' | 'wow')}
              className="text-xs border rounded px-2 py-1 bg-background"
            >
              <option value="none">No comparison</option>
              <option value="yoy">vs Last Year</option>
              <option value="mom">vs Last Month</option>
              <option value="wow">vs Last Week</option>
            </select>
            <Button variant="ghost" size="sm" onClick={loadAnalytics} disabled={loading}>
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {metrics && metrics.totalSessions > 0 ? (
          <div className="space-y-6">
            {/* ===== Stats Grid with Deltas + Semantic Colors ===== */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold text-primary">{metrics.totalSessions}</p>
                <p className="text-xs text-muted-foreground">Total Sessions</p>
                {previousMetrics && (
                  <DeltaBadge current={metrics.totalSessions} previous={previousMetrics.totalSessions} minSample={10} />
                )}
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className={cn("text-2xl font-bold", getMetricColor('timeOnPage', metrics.avgTimeOnPage))}>
                  {formatTime(metrics.avgTimeOnPage)}
                </p>
                <p className="text-xs text-muted-foreground">Avg Time</p>
                {previousMetrics && (
                  <DeltaBadge current={metrics.avgTimeOnPage} previous={previousMetrics.avgTimeOnPage} minSample={10} />
                )}
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className={cn("text-2xl font-bold", getMetricColor('scrollDepth', metrics.avgScrollDepth))}>
                  {metrics.avgScrollDepth}%
                </p>
                <p className="text-xs text-muted-foreground">Avg Scroll</p>
                {previousMetrics && (
                  <DeltaBadge current={metrics.avgScrollDepth} previous={previousMetrics.avgScrollDepth} minSample={10} />
                )}
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold text-primary">{metrics.avgCTAClicks}</p>
                <p className="text-xs text-muted-foreground">Avg CTA Clicks</p>
                {previousMetrics && (
                  <DeltaBadge current={metrics.avgCTAClicks} previous={previousMetrics.avgCTAClicks} minSample={10} />
                )}
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className={cn("text-2xl font-bold", getMetricColor('conversionRate', metrics.conversionRate))}>
                  {metrics.conversionRate}%
                </p>
                <p className="text-xs text-muted-foreground">Conversion Rate</p>
                {previousMetrics && (
                  <DeltaBadge current={metrics.conversionRate} previous={previousMetrics.conversionRate} minSample={10} />
                )}
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold text-primary">{metrics.videoPlayRate}%</p>
                <p className="text-xs text-muted-foreground">Video Play Rate</p>
                {previousMetrics && (
                  <DeltaBadge current={metrics.videoPlayRate} previous={previousMetrics.videoPlayRate} minSample={10} />
                )}
              </div>
            </div>

            {/* ===== Time-Series Charts ===== */}
            {metrics.timeSeriesData && metrics.timeSeriesData.length > 0 && (
              <>
                <div className="pt-4 border-t">
                  <TimeSeriesChart
                    data={metrics.timeSeriesData}
                    comparisonData={metrics.comparisonTimeSeriesData}
                    metric="sessions"
                    label="📈 Sessions Trend"
                    showComparison={comparisonMode !== 'none'}
                  />
                </div>

                <div className="pt-4 border-t">
                  <TimeSeriesChart
                    data={metrics.timeSeriesData}
                    comparisonData={metrics.comparisonTimeSeriesData}
                    metric="conversionRate"
                    label="📊 Conversion Rate Trend"
                    showComparison={comparisonMode !== 'none'}
                    valueFormatter={(v) => `${v.toFixed(1)}%`}
                  />
                </div>

                <div className="pt-4 border-t">
                  <TimeSeriesChart
                    data={metrics.timeSeriesData}
                    comparisonData={metrics.comparisonTimeSeriesData}
                    metric="avgScrollDepth"
                    label="👁 Avg Scroll Depth Trend"
                    showComparison={comparisonMode !== 'none'}
                    valueFormatter={(v) => `${Math.round(v)}%`}
                  />
                </div>
              </>
            )}

            {/* ===== Conversion Funnel Visualization ===== */}
            {funnelStages.length > 0 && (
              <div className="pt-4 border-t">
                <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1">
                  <Target className="w-3 h-3" />
                  Conversion Funnel
                </p>
                <div className="space-y-2">
                  {funnelStages.map((stage) => (
                    <div key={stage.label} className="flex items-center gap-3">
                      <div className="w-20 text-xs text-right text-muted-foreground shrink-0">
                        {stage.label}
                      </div>
                      <div className="flex-1 relative">
                        <div className="h-6 w-full rounded bg-muted/40 overflow-hidden">
                          <div
                            className={cn("h-full rounded transition-all duration-500", stage.color)}
                            style={{ width: `${Math.max(stage.pct, 2)}%` }}
                          />
                        </div>
                      </div>
                      <div className="w-20 text-xs shrink-0">
                        <span className="font-semibold">{stage.value}</span>
                        <span className="text-muted-foreground ml-1">({stage.pct}%)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ===== Segment Performance Bar Chart ===== */}
            {segmentChartData.length > 0 && (
              <div className="pt-4 border-t">
                <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  Segment Performance (Conversion Rate %)
                </p>
                <ChartContainer config={segmentChartConfig} className="aspect-auto h-[200px] w-full">
                  <BarChart
                    data={segmentChartData}
                    layout="vertical"
                    margin={{ top: 0, right: 40, bottom: 0, left: 80 }}
                  >
                    <XAxis type="number" domain={[0, 'auto']} tickFormatter={(v) => `${v}%`} fontSize={10} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={75}
                      fontSize={10}
                      tickFormatter={(value) => {
                        const match = segmentChartData.find((d) => d.name === value);
                        return match ? `${match.emoji} ${value}` : value;
                      }}
                    />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(value, name, item) => (
                            <span className="text-xs">
                              <span className="font-semibold">{Number(value).toFixed(1)}%</span> CVR
                              {' \u00b7 '}
                              {item.payload.sessions} sessions
                            </span>
                          )}
                        />
                      }
                    />
                    <Bar dataKey="cvr" radius={[0, 4, 4, 0]} maxBarSize={24}>
                      {segmentChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={getCvrBarColor(entry.cvr)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartContainer>
                {/* Sample size warnings */}
                <div className="flex flex-wrap gap-2 mt-2">
                  {segmentEntries.map(([segment, data]) => {
                    if (data.sessions >= 30) return null;
                    const info = SEGMENT_LABELS[segment] || { label: segment, emoji: '👤' };
                    return (
                      <Badge key={segment} variant="outline" className="text-[9px] text-amber-500 border-amber-300">
                        {info.emoji} {info.label}: Low sample ({data.sessions})
                      </Badge>
                    );
                  })}
                </div>
                {/* Color legend */}
                <div className="flex items-center gap-4 mt-2 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-2 h-2 rounded-sm" style={{ backgroundColor: '#10b981' }} />
                    CVR &ge; 5%
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-2 h-2 rounded-sm" style={{ backgroundColor: '#f59e0b' }} />
                    CVR &ge; 2%
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-2 h-2 rounded-sm" style={{ backgroundColor: '#ef4444' }} />
                    CVR &lt; 2%
                  </span>
                </div>
              </div>
            )}

            {/* ===== Top Properties (Collapsible) ===== */}
            {propertyEntries.length > 0 && (
              <div className="pt-4 border-t">
                <Collapsible open={propertiesOpen} onOpenChange={setPropertiesOpen}>
                  <CollapsibleTrigger asChild>
                    <button className="w-full flex items-center justify-between text-xs text-muted-foreground hover:text-foreground transition-colors py-1">
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3 h-3" />
                        Top Properties ({propertyEntries.length})
                      </span>
                      <ChevronDown className={cn(
                        "w-3 h-3 transition-transform duration-200",
                        propertiesOpen && "rotate-180"
                      )} />
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="space-y-2 mt-3">
                      {propertyEntries.map(([key, data]) => {
                        const displayName = formatSlugToTitle(data.slug || key);
                        const sessionPct = maxPropertySessions > 0
                          ? Math.round((data.sessions / maxPropertySessions) * 100)
                          : 0;
                        return (
                          <div key={key} className="flex items-center gap-3 text-xs">
                            <div className="w-36 truncate font-medium" title={displayName}>
                              {displayName}
                            </div>
                            <div className="flex-1">
                              <Progress value={sessionPct} className="h-2" />
                            </div>
                            <div className="w-16 text-right text-muted-foreground shrink-0">
                              {data.sessions} sess.
                            </div>
                            <Badge
                              variant={data.conversions > 0 ? "default" : "secondary"}
                              className={cn(
                                "text-[9px] shrink-0",
                                data.conversions > 0 && "bg-emerald-500 hover:bg-emerald-600"
                              )}
                            >
                              {data.conversions} conv.
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            )}

            {/* ===== Effectiveness Score Weights Reference (Fixed) ===== */}
            <div className="pt-4 border-t">
              <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1">
                <Target className="w-3 h-3" />
                Effectiveness Score Weights
              </p>
              <div className="grid grid-cols-4 gap-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-blue-500" />
                    Time
                  </span>
                  <Badge variant="secondary" className="text-[10px]">30%</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Eye className="w-3 h-3 text-primary" />
                    Scroll
                  </span>
                  <Badge variant="secondary" className="text-[10px]">20%</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <MousePointerClick className="w-3 h-3 text-emerald-500" />
                    CTAs
                  </span>
                  <Badge variant="secondary" className="text-[10px]">25%</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <FileCheck className="w-3 h-3 text-amber-500" />
                    Form
                  </span>
                  <Badge variant="secondary" className="text-[10px]">25%</Badge>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-6 text-center">
            <Activity className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">No analytics data yet</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              Visitor behavior is automatically tracked when people visit your listing pages
            </p>
            <div className="mt-4 p-3 bg-muted/50 rounded-lg text-left text-xs">
              <p className="font-medium mb-1">How it works:</p>
              <ul className="text-[10px] space-y-1 text-muted-foreground">
                <li>• Visitors browse /listing/[property-slug]</li>
                <li>• Scroll depth, time, clicks tracked automatically</li>
                <li>• Data saved when they leave the page</li>
                <li>• Segment breakdown shows which avatars perform best</li>
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default FunnelAnalyticsDashboard;
