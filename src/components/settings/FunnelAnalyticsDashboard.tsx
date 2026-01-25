import { useState, useEffect } from 'react';
import {
  BarChart3, Clock, MousePointerClick, FileCheck,
  TrendingUp, RefreshCw, Activity, Target, Eye
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface AnalyticsStats {
  totalSessions: number;
  avgTimeOnPage: number;
  avgScrollDepth: number;
  ctaClickRate: number;
  formSubmissionRate: number;
  videoPlayRate: number;
}

/**
 * Funnel Analytics Dashboard
 * Shows real-time behavioral analytics from property funnel pages
 * Designed to be embedded in AI Performance tab
 */
export function FunnelAnalyticsDashboard() {
  const [stats, setStats] = useState<AnalyticsStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    setLoading(true);
    setError(null);

    try {
      // Query FunnelAnalytics table directly for all sessions
      const res = await fetch('/api?service=airtable&table=FunnelAnalytics&maxRecords=100');

      if (!res.ok) {
        // Table might not exist yet - that's OK
        setStats(null);
        setLoading(false);
        return;
      }

      const data = await res.json();
      const records = data.records || [];

      if (records.length === 0) {
        setStats(null);
        setLoading(false);
        return;
      }

      // Calculate aggregate stats
      const sessions = records.map((r: any) => ({
        timeOnPage: r.fields?.TimeOnPage || 0,
        scrollDepth: r.fields?.MaxScrollDepth || 0,
        ctaClicks: r.fields?.CTAClicks || 0,
        formSubmitted: r.fields?.FormSubmitted || false,
        videoPlayed: r.fields?.VideoPlayed || false,
      }));

      setStats({
        totalSessions: sessions.length,
        avgTimeOnPage: Math.round(sessions.reduce((s: number, x: any) => s + x.timeOnPage, 0) / sessions.length),
        avgScrollDepth: Math.round(sessions.reduce((s: number, x: any) => s + x.scrollDepth, 0) / sessions.length),
        ctaClickRate: Math.round((sessions.filter((x: any) => x.ctaClicks > 0).length / sessions.length) * 100),
        formSubmissionRate: Math.round((sessions.filter((x: any) => x.formSubmitted).length / sessions.length) * 100),
        videoPlayRate: Math.round((sessions.filter((x: any) => x.videoPlayed).length / sessions.length) * 100),
      });
    } catch (err) {
      // Don't show error - analytics might just not have data yet
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

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
          <Button variant="ghost" size="sm" onClick={loadAnalytics} disabled={loading}>
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {stats ? (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold text-purple-500">{stats.totalSessions}</p>
                <p className="text-xs text-muted-foreground">Total Sessions</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold text-blue-500">{formatTime(stats.avgTimeOnPage)}</p>
                <p className="text-xs text-muted-foreground">Avg Time</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold text-violet-500">{stats.avgScrollDepth}%</p>
                <p className="text-xs text-muted-foreground">Avg Scroll</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold text-emerald-500">{stats.ctaClickRate}%</p>
                <p className="text-xs text-muted-foreground">CTA Click Rate</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold text-amber-500">{stats.formSubmissionRate}%</p>
                <p className="text-xs text-muted-foreground">Form Conversion</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold text-pink-500">{stats.videoPlayRate}%</p>
                <p className="text-xs text-muted-foreground">Video Plays</p>
              </div>
            </div>

            {/* Algorithm Reference */}
            <div className="pt-4 border-t">
              <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1">
                <Target className="w-3 h-3" />
                Effectiveness Algorithm Weights
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
                    <Eye className="w-3 h-3 text-purple-500" />
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
            <p className="text-xs text-muted-foreground mt-1">
              Data appears when visitors interact with your funnel pages
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default FunnelAnalyticsDashboard;
