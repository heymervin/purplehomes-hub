import { useState, useEffect } from 'react';
import {
  BarChart3, Clock, MousePointerClick, FileCheck,
  TrendingUp, RefreshCw, Activity, Target, Eye, Users
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { BuyerSegment } from '@/types/funnel';

const SEGMENT_LABELS: Record<string, { label: string; emoji: string }> = {
  'first-time-buyer': { label: 'First-Time', emoji: '🏠' },
  'credit-challenged': { label: 'Credit-Challenged', emoji: '📈' },
  'investor': { label: 'Investor', emoji: '💰' },
  'move-up-buyer': { label: 'Move-Up', emoji: '🏡' },
  'self-employed': { label: 'Self-Employed', emoji: '💼' },
  'hispanic-seller-finance': { label: 'Hispanic', emoji: '👨‍👩‍👧‍👦' },
  'general': { label: 'General', emoji: '👥' },
};

interface SegmentMetrics {
  sessions: number;
  avgScrollDepth: number;
  avgTimeOnPage: number;
  ctaClickRate: number;
  conversionRate: number;
}

interface AnalyticsMetrics {
  totalSessions: number;
  avgScrollDepth: number;
  avgTimeOnPage: number;
  avgCTAClicks: number;
  conversionRate: number;
  videoPlayRate: number;
  bySegment: Record<string, SegmentMetrics>;
  byProperty: Record<string, { sessions: number; avgScrollDepth: number; conversions: number }>;
}

/**
 * Funnel Analytics Dashboard
 * Shows real-time behavioral analytics from property funnel pages
 * Designed to be embedded in AI Performance tab
 */
export function FunnelAnalyticsDashboard() {
  const [metrics, setMetrics] = useState<AnalyticsMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<number>(30);

  useEffect(() => {
    loadAnalytics();
  }, [period]);

  const loadAnalytics = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/funnel?action=analytics-metrics&days=${period}`);

      if (!res.ok) {
        setMetrics(null);
        setLoading(false);
        return;
      }

      const data = await res.json();

      if (data.success && data.metrics) {
        setMetrics(data.metrics);
      } else {
        setMetrics(null);
      }
    } catch (err) {
      // Don't show error - analytics might just not have data yet
      setMetrics(null);
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
              <BarChart3 className="w-4 h-4 text-purple-500" />
              Funnel Behavioral Analytics
            </CardTitle>
            <CardDescription>
              Real-time tracking from property funnel pages
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={period}
              onChange={(e) => setPeriod(Number(e.target.value))}
              className="text-xs border rounded px-2 py-1 bg-background"
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
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
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold text-purple-500">{metrics.totalSessions}</p>
                <p className="text-xs text-muted-foreground">Total Sessions</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold text-blue-500">{formatTime(metrics.avgTimeOnPage)}</p>
                <p className="text-xs text-muted-foreground">Avg Time</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold text-violet-500">{metrics.avgScrollDepth}%</p>
                <p className="text-xs text-muted-foreground">Avg Scroll</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold text-emerald-500">{metrics.avgCTAClicks}</p>
                <p className="text-xs text-muted-foreground">Avg CTA Clicks</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold text-amber-500">{metrics.conversionRate}%</p>
                <p className="text-xs text-muted-foreground">Conversion Rate</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold text-pink-500">{metrics.videoPlayRate}%</p>
                <p className="text-xs text-muted-foreground">Video Play Rate</p>
              </div>
            </div>

            {/* By Segment Breakdown */}
            {segmentEntries.length > 0 && (
              <div className="pt-4 border-t">
                <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  Performance by Avatar Segment
                </p>
                <div className="space-y-2">
                  {segmentEntries.map(([segment, data]) => {
                    const info = SEGMENT_LABELS[segment] || { label: segment, emoji: '👤' };
                    return (
                      <div
                        key={segment}
                        className="flex items-center justify-between p-2 rounded-lg bg-muted/30 text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <span>{info.emoji}</span>
                          <span className="font-medium">{info.label}</span>
                          <Badge variant="secondary" className="text-[10px]">
                            {data.sessions} sessions
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs">
                          <span className="text-muted-foreground">
                            <Eye className="w-3 h-3 inline mr-1" />
                            {data.avgScrollDepth}%
                          </span>
                          <span className="text-muted-foreground">
                            <Clock className="w-3 h-3 inline mr-1" />
                            {formatTime(data.avgTimeOnPage)}
                          </span>
                          <Badge
                            variant={data.conversionRate >= 10 ? "default" : "secondary"}
                            className={cn(
                              "text-[10px]",
                              data.conversionRate >= 10 && "bg-emerald-500"
                            )}
                          >
                            {data.conversionRate}% CVR
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Algorithm Reference */}
            <div className="pt-4 border-t">
              <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1">
                <Target className="w-3 h-3" />
                Effectiveness Score Weights
              </p>
              <div className="grid grid-cols-4 gap-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Eye className="w-3 h-3 text-purple-500" />
                    Scroll
                  </span>
                  <Badge variant="secondary" className="text-[10px]">30%</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-blue-500" />
                    Time
                  </span>
                  <Badge variant="secondary" className="text-[10px]">20%</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <MousePointerClick className="w-3 h-3 text-emerald-500" />
                    CTAs
                  </span>
                  <Badge variant="secondary" className="text-[10px]">20%</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <FileCheck className="w-3 h-3 text-amber-500" />
                    Form
                  </span>
                  <Badge variant="secondary" className="text-[10px]">30%</Badge>
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
