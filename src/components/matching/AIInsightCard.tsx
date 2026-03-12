/**
 * AIInsightCard - Display AI-generated match insights
 *
 * Shows a summary, key strength, potential concern, and suggested action
 * with visual confidence indicators.
 */

import { Sparkles, AlertCircle, ArrowRight, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useMatchInsight, buildInsightRequest } from '@/services/insightsApi';
import { CONFIDENCE_CONFIG, type AIInsight } from '@/lib/aiInsights';

interface AIInsightCardProps {
  buyerName: string;
  propertyAddress: string;
  score: number;
  highlights?: string[];
  concerns?: string[];
  distanceMiles?: number;
  stage?: string;
  price?: number;
  beds?: number;
  baths?: number;
  matchId?: string;
  onActionClick?: (action: string) => void;
  className?: string;
}

function InsightSkeleton() {
  return (
    <Card className="border-dashed">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-4 w-24" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-8 w-32" />
      </CardContent>
    </Card>
  );
}

function InsightContent({
  insight,
  onActionClick,
}: {
  insight: AIInsight;
  onActionClick?: (action: string) => void;
}) {
  const confidenceConfig = CONFIDENCE_CONFIG[insight.confidence];

  return (
    <div className="space-y-4">
      {/* Summary */}
      <p className="text-sm leading-relaxed">{insight.summary}</p>

      {/* Key Strength */}
      <div className="flex items-start gap-2 p-2 rounded-lg bg-emerald-50 border border-emerald-100">
        <div className="p-1 rounded bg-emerald-100 shrink-0">
          <Sparkles className="h-3 w-3 text-emerald-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-emerald-800">Key Strength</p>
          <p className="text-xs text-emerald-700">{insight.keyStrength}</p>
        </div>
      </div>

      {/* Potential Concern (if any) */}
      {insight.potentialConcern && (
        <div className="flex items-start gap-2 p-2 rounded-lg bg-amber-50 border border-amber-100">
          <div className="p-1 rounded bg-amber-100 shrink-0">
            <AlertCircle className="h-3 w-3 text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-amber-800">To Consider</p>
            <p className="text-xs text-amber-700">{insight.potentialConcern}</p>
          </div>
        </div>
      )}

      {/* Suggested Action */}
      <div className="flex items-center justify-between gap-2 pt-2 border-t">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-muted-foreground">Suggested Next Step</p>
          <p className="text-sm font-medium">{insight.suggestedAction}</p>
        </div>
        {onActionClick && (
          <Button
            size="sm"
            variant="outline"
            className="shrink-0"
            onClick={() => onActionClick(insight.suggestedAction)}
          >
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Confidence indicator */}
      <div className="flex items-center justify-between text-xs text-muted-foreground pt-2">
        <div className="flex items-center gap-1.5">
          <span
            className={cn('w-2 h-2 rounded-full', confidenceConfig.dotClass)}
          />
          <span>{confidenceConfig.label}</span>
        </div>
        {insight.source === 'ai' && (
          <span className="text-primary">Powered by AI</span>
        )}
        {insight.source === 'rules' && (
          <span className="text-muted-foreground">Rule-based insight</span>
        )}
      </div>
    </div>
  );
}

export function AIInsightCard({
  buyerName,
  propertyAddress,
  score,
  highlights = [],
  concerns = [],
  distanceMiles,
  stage,
  price,
  beds,
  baths,
  matchId,
  onActionClick,
  className,
}: AIInsightCardProps) {
  const insightRequest = buildInsightRequest(buyerName, propertyAddress, score, {
    highlights,
    concerns,
    distanceMiles,
    stage,
    price,
    beds,
    baths,
  });

  const { data: insight, isLoading, error } = useMatchInsight(insightRequest, matchId);

  if (isLoading) {
    return <InsightSkeleton />;
  }

  if (error || !insight) {
    // Don't show anything if we can't get insights
    return null;
  }

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-2 bg-gradient-to-r from-primary/5 to-indigo-50">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          AI Match Insight
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <InsightContent insight={insight} onActionClick={onActionClick} />
      </CardContent>
    </Card>
  );
}

/**
 * Inline version for compact display
 */
export function AIInsightInline({
  buyerName,
  propertyAddress,
  score,
  highlights = [],
  concerns = [],
  distanceMiles,
  stage,
  matchId,
  className,
}: Omit<AIInsightCardProps, 'onActionClick' | 'price' | 'beds' | 'baths'>) {
  const insightRequest = buildInsightRequest(buyerName, propertyAddress, score, {
    highlights,
    concerns,
    distanceMiles,
    stage,
  });

  const { data: insight, isLoading } = useMatchInsight(insightRequest, matchId);

  if (isLoading) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground">Generating insight...</span>
      </div>
    );
  }

  if (!insight) {
    return null;
  }

  const confidenceConfig = CONFIDENCE_CONFIG[insight.confidence];

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">AI Insight</span>
        <span
          className={cn('w-2 h-2 rounded-full', confidenceConfig.dotClass)}
        />
      </div>
      <p className="text-sm text-muted-foreground">{insight.summary}</p>
      <p className="text-sm font-medium">
        <span className="text-muted-foreground">Next step:</span>{' '}
        {insight.suggestedAction}
      </p>
    </div>
  );
}

export default AIInsightCard;
