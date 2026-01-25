import { useState, useEffect } from 'react';
import {
  BarChart3, Clock, MousePointerClick, FileCheck, Play,
  TrendingUp, RefreshCw, Activity, Target, Users, Eye
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface PropertyAnalytics {
  propertyId: string;
  propertySlug: string;
  totalSessions: number;
  avgTimeOnPage: number;
  avgScrollDepth: number;
  ctaClickRate: number;
  formSubmissionRate: number;
  videoPlayRate: number;
  avgEffectivenessScore: number;
}

interface GlobalStats {
  totalSessions: number;
  totalProperties: number;
  avgTimeOnPage: number;
  avgScrollDepth: number;
  avgCtaClickRate: number;
  avgFormSubmissionRate: number;
  avgEffectivenessScore: number;
}

/**
 * Funnel Analytics Dashboard
 * Shows real-time behavioral analytics from property funnel pages
 */
export function FunnelAnalyticsDashboard() {
  const [properties, setProperties] = useState<PropertyAnalytics[]>([]);
  const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch all properties from Airtable to get their slugs
      const propertiesRes = await fetch('/api/airtable?action=properties');
      if (!propertiesRes.ok) throw new Error('Failed to load properties');
      const propertiesData = await propertiesRes.json();

      // Fetch analytics for each property
      const analyticsPromises = (propertiesData.properties || []).slice(0, 20).map(async (prop: any) => {
        try {
          const slug = prop.slug || generateSlug(prop.address, prop.city);
          const res = await fetch(`/api/funnel/analytics?action=aggregate&propertySlug=${encodeURIComponent(slug)}`);
          if (!res.ok) return null;
          const data = await res.json();
          return data.stats ? { ...data.stats, propertySlug: slug } : null;
        } catch {
          return null;
        }
      });

      const results = await Promise.all(analyticsPromises);
      const validResults = results.filter((r): r is PropertyAnalytics => r !== null && r.totalSessions > 0);

      setProperties(validResults);

      // Calculate global stats
      if (validResults.length > 0) {
        const totalSessions = validResults.reduce((sum, p) => sum + p.totalSessions, 0);
        setGlobalStats({
          totalSessions,
          totalProperties: validResults.length,
          avgTimeOnPage: Math.round(validResults.reduce((sum, p) => sum + p.avgTimeOnPage, 0) / validResults.length),
          avgScrollDepth: Math.round(validResults.reduce((sum, p) => sum + p.avgScrollDepth, 0) / validResults.length),
          avgCtaClickRate: Math.round(validResults.reduce((sum, p) => sum + p.ctaClickRate, 0) / validResults.length),
          avgFormSubmissionRate: Math.round(validResults.reduce((sum, p) => sum + p.formSubmissionRate, 0) / validResults.length),
          avgEffectivenessScore: Math.round(validResults.reduce((sum, p) => sum + p.avgEffectivenessScore, 0) / validResults.length * 10) / 10,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  // Simple slug generator (fallback)
  const generateSlug = (address: string, city: string) => {
    return `${address}-${city}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  };

  // Format time in minutes:seconds
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  // Get score color
  const getScoreColor = (score: number) => {
    if (score >= 7) return 'text-emerald-500';
    if (score >= 5) return 'text-amber-500';
    return 'text-red-500';
  };

  // Get progress color
  const getProgressColor = (value: number, target: number) => {
    const ratio = value / target;
    if (ratio >= 1) return 'bg-emerald-500';
    if (ratio >= 0.7) return 'bg-amber-500';
    return 'bg-red-500';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading analytics...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/50">
        <CardContent className="py-8 text-center">
          <p className="text-destructive">{error}</p>
          <Button variant="outline" onClick={loadAnalytics} className="mt-4">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-purple-500" />
            Funnel Analytics
          </h2>
          <p className="text-muted-foreground mt-1">
            Real-time behavioral tracking from property funnel pages
          </p>
        </div>
        <Button variant="outline" onClick={loadAnalytics} disabled={loading}>
          <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Global Stats */}
      {globalStats ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <Users className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{globalStats.totalSessions}</p>
                  <p className="text-xs text-muted-foreground">Total Sessions</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Clock className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{formatTime(globalStats.avgTimeOnPage)}</p>
                  <p className="text-xs text-muted-foreground">Avg Time on Page</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                  <MousePointerClick className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{globalStats.avgCtaClickRate}%</p>
                  <p className="text-xs text-muted-foreground">CTA Click Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                  <FileCheck className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{globalStats.avgFormSubmissionRate}%</p>
                  <p className="text-xs text-muted-foreground">Form Conversion</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Activity className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium">No Analytics Data Yet</h3>
            <p className="text-muted-foreground mt-2 max-w-md mx-auto">
              Analytics will appear here once visitors interact with your property funnel pages.
              Data is tracked automatically when users scroll, click CTAs, or submit forms.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Algorithm Weights Reference */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="w-4 h-4" />
            Effectiveness Algorithm
          </CardTitle>
          <CardDescription>
            How the effectiveness score is calculated
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-500" />
                  Time on Page
                </span>
                <Badge variant="secondary">30%</Badge>
              </div>
              <p className="text-xs text-muted-foreground">Target: 2+ minutes</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-purple-500" />
                  Scroll Depth
                </span>
                <Badge variant="secondary">20%</Badge>
              </div>
              <p className="text-xs text-muted-foreground">Target: 75%+</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5">
                  <MousePointerClick className="w-3.5 h-3.5 text-emerald-500" />
                  CTA Clicks
                </span>
                <Badge variant="secondary">25%</Badge>
              </div>
              <p className="text-xs text-muted-foreground">Target: Any click</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5">
                  <FileCheck className="w-3.5 h-3.5 text-amber-500" />
                  Form Submit
                </span>
                <Badge variant="secondary">25%</Badge>
              </div>
              <p className="text-xs text-muted-foreground">Target: Submitted</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Per-Property Breakdown */}
      {properties.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Property Performance
            </CardTitle>
            <CardDescription>
              Analytics breakdown by property funnel
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {properties.map((prop) => (
                <div
                  key={prop.propertySlug}
                  className="p-4 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-medium truncate max-w-xs">
                        {prop.propertySlug.replace(/-/g, ' ').slice(0, 40)}...
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        {prop.totalSessions} session{prop.totalSessions !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={cn("text-2xl font-bold", getScoreColor(prop.avgEffectivenessScore))}>
                        {prop.avgEffectivenessScore}
                      </p>
                      <p className="text-xs text-muted-foreground">Score</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-3 text-sm">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-muted-foreground">Time</span>
                        <span>{formatTime(prop.avgTimeOnPage)}</span>
                      </div>
                      <Progress
                        value={Math.min((prop.avgTimeOnPage / 120) * 100, 100)}
                        className="h-1.5"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-muted-foreground">Scroll</span>
                        <span>{prop.avgScrollDepth}%</span>
                      </div>
                      <Progress
                        value={Math.min((prop.avgScrollDepth / 75) * 100, 100)}
                        className="h-1.5"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-muted-foreground">CTAs</span>
                        <span>{prop.ctaClickRate}%</span>
                      </div>
                      <Progress
                        value={prop.ctaClickRate}
                        className="h-1.5"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-muted-foreground">Forms</span>
                        <span>{prop.formSubmissionRate}%</span>
                      </div>
                      <Progress
                        value={prop.formSubmissionRate}
                        className="h-1.5"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default FunnelAnalyticsDashboard;
