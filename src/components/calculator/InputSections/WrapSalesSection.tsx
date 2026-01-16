/**
 * WrapSalesSection - Buyer's wrap purchase terms
 */

import { UserCheck, DollarSign, Wallet, Receipt, Info, AlertTriangle, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { SliderInput } from '../SliderInput';
import { SLIDER_CONFIGS, type WrapSalesInputs } from '@/types/calculator';
import { cn } from '@/lib/utils';

interface BuyerLimits {
  maxDownPayment?: number;
  maxMonthlyPayment?: number;
  buyerName?: string;
}

interface WrapSalesSectionProps {
  inputs: WrapSalesInputs;
  useWrap: boolean;
  onChange: (field: keyof WrapSalesInputs, value: number) => void;
  buyerLimits?: BuyerLimits;
  calculatedMonthlyPayment?: number;
}

export function WrapSalesSection({
  inputs,
  useWrap,
  onChange,
  buyerLimits,
  calculatedMonthlyPayment,
}: WrapSalesSectionProps) {
  const wrapPrincipal = inputs.wrapSalesPrice - inputs.buyerDownPayment;
  const netDownPayment = inputs.buyerDownPayment - inputs.buyerClosingCosts;

  // Check if values exceed buyer limits
  const isOverDownPaymentLimit = buyerLimits?.maxDownPayment !== undefined &&
    inputs.buyerDownPayment > buyerLimits.maxDownPayment;
  const isOverMonthlyLimit = buyerLimits?.maxMonthlyPayment !== undefined &&
    calculatedMonthlyPayment !== undefined &&
    calculatedMonthlyPayment > buyerLimits.maxMonthlyPayment;
  const isWithinLimits = !isOverDownPaymentLimit && !isOverMonthlyLimit;

  // Calculate difference from buyer's max monthly
  const monthlyDifference = buyerLimits?.maxMonthlyPayment !== undefined &&
    calculatedMonthlyPayment !== undefined
    ? buyerLimits.maxMonthlyPayment - calculatedMonthlyPayment
    : undefined;

  return (
    <Card className={cn(!useWrap && 'opacity-50 pointer-events-none')}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-purple-600" />
            <CardTitle className="text-lg">Buyer's Terms</CardTitle>
          </div>
          {useWrap && buyerLimits && (buyerLimits.maxDownPayment || buyerLimits.maxMonthlyPayment) && (
            <div className={cn(
              "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full",
              isWithinLimits
                ? "bg-green-100 text-green-700"
                : "bg-orange-100 text-orange-700"
            )}>
              {isWithinLimits ? (
                <><CheckCircle className="h-3 w-3" /> Within Limits</>
              ) : (
                <><AlertTriangle className="h-3 w-3" /> Over Limits</>
              )}
            </div>
          )}
        </div>
        <CardDescription>
          {useWrap
            ? "Sale price and down payment" + (buyerLimits?.buyerName ? ` \u2022 ${buyerLimits.buyerName}` : '')
            : 'Enable Wrap Loan to configure buyer terms'}
        </CardDescription>
      </CardHeader>

      {useWrap && (
        <CardContent className="space-y-6">
          {/* Buyer Affordability Info Card */}
          {buyerLimits && (buyerLimits.maxDownPayment || buyerLimits.maxMonthlyPayment) && (
            <div className="p-4 rounded-lg bg-purple-50 border border-purple-200">
              <div className="flex items-center gap-2 mb-3">
                <Info className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-medium text-purple-800">
                  Buyer Affordability{buyerLimits.buyerName ? ` (${buyerLimits.buyerName})` : ''}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {buyerLimits.maxDownPayment !== undefined && (
                  <div>
                    <span className="text-xs text-purple-700">Max Down Payment</span>
                    <p className="text-lg font-bold text-purple-800">
                      ${buyerLimits.maxDownPayment.toLocaleString()}
                    </p>
                  </div>
                )}
                {buyerLimits.maxMonthlyPayment !== undefined && (
                  <div>
                    <span className="text-xs text-purple-700">Max Monthly (28%)</span>
                    <p className="text-lg font-bold text-purple-800">
                      ${buyerLimits.maxMonthlyPayment.toLocaleString()}/mo
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Wrap Sales Price */}
            <div className="md:col-span-2">
              <SliderInput
                label="Sales Price to Buyer"
                value={inputs.wrapSalesPrice}
                onChange={(v) => onChange('wrapSalesPrice', v)}
                config={SLIDER_CONFIGS.wrapSalesPrice}
                icon={<DollarSign className="h-4 w-4" />}
                description="Price buyer pays for the property"
              />
            </div>

            {/* Buyer Down Payment */}
            <div className="space-y-2">
              <SliderInput
                label="Buyer Down Payment"
                value={inputs.buyerDownPayment}
                onChange={(v) => onChange('buyerDownPayment', v)}
                config={SLIDER_CONFIGS.buyerDownPayment}
                icon={<Wallet className="h-4 w-4" />}
                description="Cash at closing from buyer"
              />
              {buyerLimits?.maxDownPayment !== undefined && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-purple-600 hover:text-purple-700 hover:bg-purple-50 px-2"
                  onClick={() => onChange('buyerDownPayment', buyerLimits.maxDownPayment!)}
                >
                  Set to buyer's max (${buyerLimits.maxDownPayment.toLocaleString()})
                </Button>
              )}
            </div>

            {/* Buyer Closing Costs */}
            <SliderInput
              label="Buyer Closing Costs"
              value={inputs.buyerClosingCosts}
              onChange={(v) => onChange('buyerClosingCosts', v)}
              config={SLIDER_CONFIGS.buyerClosingCosts}
              icon={<Receipt className="h-4 w-4" />}
              description="Costs paid by buyer at close"
            />
          </div>

          {/* Warning: Over Down Payment Limit */}
          {isOverDownPaymentLimit && buyerLimits?.maxDownPayment !== undefined && (
            <Alert variant="destructive" className="bg-orange-50 border-orange-200">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800">
                Down payment (${inputs.buyerDownPayment.toLocaleString()}) exceeds buyer's max
                (${buyerLimits.maxDownPayment.toLocaleString()}) by ${(inputs.buyerDownPayment - buyerLimits.maxDownPayment).toLocaleString()}
              </AlertDescription>
            </Alert>
          )}

          {/* Summary calculations */}
          <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-purple-50 border border-purple-200">
            <div>
              <span className="text-xs text-purple-700">Wrap Principal</span>
              <p className="text-lg font-bold text-purple-800">
                ${wrapPrincipal.toLocaleString()}
              </p>
              <p className="text-xs text-purple-600">
                Sales Price - Down Payment
              </p>
            </div>
            <div>
              <span className="text-xs text-purple-700">Net Cash at Close</span>
              <p className="text-lg font-bold text-purple-800">
                ${netDownPayment.toLocaleString()}
              </p>
              <p className="text-xs text-purple-600">
                Down Payment - Closing Costs
              </p>
            </div>
          </div>

          {/* Calculated Monthly Payment Preview */}
          {calculatedMonthlyPayment !== undefined && (
            <div className={cn(
              "p-4 rounded-lg border",
              isOverMonthlyLimit
                ? "bg-orange-50 border-orange-200"
                : "bg-green-50 border-green-200"
            )}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isOverMonthlyLimit ? (
                    <AlertTriangle className="h-4 w-4 text-orange-600" />
                  ) : (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  )}
                  <span className={cn(
                    "text-sm font-medium",
                    isOverMonthlyLimit ? "text-orange-800" : "text-green-800"
                  )}>
                    Buyer's Total Monthly Payment
                  </span>
                </div>
                <span className={cn(
                  "text-lg font-bold",
                  isOverMonthlyLimit ? "text-orange-800" : "text-green-800"
                )}>
                  ${calculatedMonthlyPayment.toLocaleString()}/mo
                </span>
              </div>
              <p className={cn(
                "text-xs mt-1",
                isOverMonthlyLimit ? "text-orange-600" : "text-green-600"
              )}>
                P&I + Taxes + Insurance + Escrow + Service Fee
              </p>
              {monthlyDifference !== undefined && (
                <p className={cn(
                  "text-xs mt-1 font-medium",
                  monthlyDifference >= 0 ? "text-green-700" : "text-orange-700"
                )}>
                  {monthlyDifference >= 0
                    ? `$${monthlyDifference.toLocaleString()} under limit`
                    : `$${Math.abs(monthlyDifference).toLocaleString()} over limit`}
                </p>
              )}
            </div>
          )}

          {/* Down payment percentage */}
          {inputs.wrapSalesPrice > 0 && (
            <div className="text-center text-sm text-muted-foreground">
              Down Payment: {((inputs.buyerDownPayment / inputs.wrapSalesPrice) * 100).toFixed(1)}% of sales price
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

export default WrapSalesSection;
