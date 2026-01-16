/**
 * QuickStatsPanel - Displays key wrap deal metrics at a glance
 * WRAP FOCUSED - shows entry fee, cashflow, buyer payment, rental fallback
 */

import { TrendingUp, TrendingDown, DollarSign, Percent, Users, AlertTriangle, Home, Wallet } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { CalculatorOutputs, CalculatorInputs } from '@/types/calculator';
import { formatCurrency, formatPercentage } from '@/lib/calculatorEngine';

interface QuickStatsPanelProps {
  outputs: CalculatorOutputs;
  inputs?: CalculatorInputs;
  className?: string;
}

interface StatCardProps {
  label: string;
  value: string;
  subValue?: string;
  icon?: React.ReactNode;
  trend?: 'positive' | 'negative' | 'neutral';
  highlight?: boolean;
  warning?: boolean;
  className?: string;
}

function StatCard({ label, value, subValue, icon, trend, highlight, warning, className }: StatCardProps) {
  const trendColor =
    trend === 'positive'
      ? 'text-green-600'
      : trend === 'negative'
      ? 'text-red-600'
      : 'text-muted-foreground';

  return (
    <div
      className={cn(
        'p-3 rounded-lg border bg-card transition-all',
        highlight && 'border-primary/50 bg-primary/5',
        warning && 'border-orange-400/50 bg-orange-50',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {label}
          </p>
          <p className={cn('text-xl font-bold', warning ? 'text-orange-600' : trendColor)}>{value}</p>
          {subValue && (
            <p className="text-xs text-muted-foreground">{subValue}</p>
          )}
        </div>
        {icon && (
          <div className={cn(
            'p-2 rounded-full bg-muted',
            highlight && 'bg-primary/10',
            warning && 'bg-orange-100'
          )}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

export function QuickStatsPanel({ outputs, inputs, className }: QuickStatsPanelProps) {
  const { quickStats, dealChecklist } = outputs;

  // Get buyer down payment from inputs if available
  const buyerDownPayment = inputs?.wrapSales?.buyerDownPayment ?? 0;

  // Determine trends based on wrap-focused values
  const wrapTrend = quickStats.wrapCashflow >= 300 ? 'positive' : quickStats.wrapCashflow < 0 ? 'negative' : 'neutral';
  const entryFeeTrend = quickStats.totalEntryFee <= 25000 ? 'positive' : quickStats.totalEntryFee > 50000 ? 'negative' : 'neutral';
  const cocTrend = quickStats.cashOnCashWrap >= 15 ? 'positive' : quickStats.cashOnCashWrap < 8 ? 'negative' : 'neutral';
  const rentalFallbackNegative = quickStats.rentalFallbackCashflow < 0;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Deal Decision Badge */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Quick Stats</h3>
        <Badge
          variant={
            dealChecklist.dealDecision === 'DEAL'
              ? 'default'
              : dealChecklist.dealDecision === 'NEEDS REVIEW'
              ? 'secondary'
              : 'destructive'
          }
          className={cn(
            'text-sm px-3 py-1',
            dealChecklist.dealDecision === 'DEAL' && 'bg-green-600 hover:bg-green-700',
            dealChecklist.dealDecision === 'NEEDS REVIEW' && 'bg-yellow-500 hover:bg-yellow-600 text-black'
          )}
        >
          {dealChecklist.dealDecision}
        </Badge>
      </div>

      {/* Primary Stats Grid - Wrap Focused */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {/* Entry Fee (Purple Homes' upfront cost) */}
        <StatCard
          label="Entry Fee"
          value={formatCurrency(quickStats.totalEntryFee)}
          subValue="Your upfront cost"
          icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
          trend={entryFeeTrend}
        />

        {/* Wrap Cash Flow (Purple Homes' monthly profit) */}
        <StatCard
          label="Wrap Cash Flow"
          value={formatCurrency(quickStats.wrapCashflow)}
          subValue="Monthly profit"
          icon={
            quickStats.wrapCashflow >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )
          }
          trend={wrapTrend}
          highlight={quickStats.wrapCashflow >= 300}
        />

        {/* Cash on Cash Return */}
        <StatCard
          label="Cash on Cash"
          value={formatPercentage(quickStats.cashOnCashWrap)}
          subValue="Wrap return"
          icon={<Percent className="h-4 w-4 text-primary" />}
          trend={cocTrend}
        />
      </div>

      {/* Buyer Marketing Numbers */}
      <Card className="border-purple-200 bg-purple-50/50">
        <CardContent className="p-4">
          <h4 className="text-sm font-medium mb-3 text-purple-700 flex items-center gap-2">
            <Users className="h-4 w-4" />
            Buyer Marketing Numbers
          </h4>
          <div className="grid grid-cols-2 gap-4">
            {/* Buyer Down Payment */}
            <div className="space-y-1">
              <p className="text-xs text-purple-600 font-medium">Down Payment Required</p>
              <p className="text-2xl font-bold text-purple-800">
                {formatCurrency(buyerDownPayment)}
              </p>
            </div>

            {/* Buyer Monthly Payment */}
            <div className="space-y-1">
              <p className="text-xs text-purple-600 font-medium">Monthly Payment</p>
              <p className="text-2xl font-bold text-purple-800">
                {formatCurrency(quickStats.buyerFullMonthlyPayment)}
              </p>
              <p className="text-xs text-purple-600">
                Includes P&I + T&I + cushion + service
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rental Fallback Warning */}
      {rentalFallbackNegative && (
        <Card className="border-orange-300 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-orange-700">Rental Fallback Warning</h4>
                <p className="text-xs text-orange-600 mt-1">
                  If wrap buyer defaults, rental income would be{' '}
                  <span className="font-bold">{formatCurrency(quickStats.rentalFallbackCashflow)}/mo</span>.
                  Consider adjusting terms or ensuring strong buyer qualification.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rental Fallback (positive) */}
      {!rentalFallbackNegative && quickStats.rentalFallbackCashflow > 0 && (
        <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-3 rounded-lg border border-green-200">
          <Home className="h-4 w-4" />
          <span>Rental fallback: <strong>{formatCurrency(quickStats.rentalFallbackCashflow)}/mo</strong> if wrap fails</span>
        </div>
      )}

      {/* Deal Checklist Summary */}
      <Card className="border-dashed">
        <CardContent className="p-4">
          <h4 className="text-sm font-medium mb-3 text-muted-foreground">
            Deal Checklist
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            <ChecklistItem
              label="Entry < $25k"
              passed={dealChecklist.entryFeeUnder25k}
            />
            <ChecklistItem
              label="Wrap CF > $300"
              passed={dealChecklist.wrapCashflowOver300}
            />
            <ChecklistItem
              label="LTV < 75%"
              passed={dealChecklist.ltvUnder75}
            />
            <ChecklistItem
              label="Equity > $15k"
              passed={dealChecklist.equityOver15k}
            />
            <ChecklistItem
              label="Rental + CF"
              passed={dealChecklist.rentalFallbackPositive}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ChecklistItem({ label, passed }: { label: string; passed: boolean }) {
  return (
    <div className={cn(
      'flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium',
      passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
    )}>
      {passed ? '✓' : '✗'} {label}
    </div>
  );
}

export default QuickStatsPanel;
