/**
 * BuyerPropertyInfoCard - Info cards for Deal Calculator
 * Shows property details, buyer details, and gap analysis
 */

import { Building2, User, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

interface PropertyInfo {
  address: string;
  listingPrice?: number;
  downPayment?: number;
  monthlyPayment?: number;
}

interface BuyerInfo {
  name: string;
  downPayment?: number;
  monthlyIncome?: number;
}

interface BuyerPropertyInfoCardProps {
  property: PropertyInfo;
  buyer: BuyerInfo;
}

function formatCurrency(value: number | undefined): string {
  if (value === undefined || value === null) return 'N/A';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function BuyerPropertyInfoCard({ property, buyer }: BuyerPropertyInfoCardProps) {
  // Calculate gap between buyer's available down payment and property's asking down payment
  const downPaymentGap =
    buyer.downPayment !== undefined && property.downPayment !== undefined
      ? buyer.downPayment - property.downPayment
      : null;

  const hasDownPaymentGap = downPaymentGap !== null;
  const hasEnoughDown = downPaymentGap !== null && downPaymentGap >= 0;

  return (
    <div className="space-y-3">
      {/* Property Info Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            PROPERTY
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="font-semibold text-base">{property.address}</p>
            <div className="flex items-center gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Listing: </span>
                <span className="font-semibold">{formatCurrency(property.listingPrice)}</span>
              </div>
              <div className="h-4 w-px bg-border" />
              <div>
                <span className="text-muted-foreground">Down: </span>
                <span className="font-semibold">{formatCurrency(property.downPayment)}</span>
              </div>
              <div className="h-4 w-px bg-border" />
              <div>
                <span className="text-muted-foreground">Monthly: </span>
                <span className="font-semibold">{formatCurrency(property.monthlyPayment)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Buyer Info Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            BUYER
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="font-semibold text-base">{buyer.name}</p>
            <div className="flex items-center gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Available Down: </span>
                <span className="font-semibold">{formatCurrency(buyer.downPayment)}</span>
              </div>
              <div className="h-4 w-px bg-border" />
              <div>
                <span className="text-muted-foreground">Monthly Income: </span>
                <span className="font-semibold">{formatCurrency(buyer.monthlyIncome)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gap Analysis Alert */}
      {hasDownPaymentGap && (
        <Alert
          variant={hasEnoughDown ? 'default' : 'destructive'}
          className={cn(
            hasEnoughDown
              ? 'border-green-500/50 bg-green-50 dark:bg-green-950/20'
              : 'border-orange-500/50 bg-orange-50 dark:bg-orange-950/20'
          )}
        >
          <div className="flex items-center gap-2">
            {hasEnoughDown ? (
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-500" />
            ) : (
              <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-500" />
            )}
            <AlertDescription
              className={cn(
                'font-medium',
                hasEnoughDown
                  ? 'text-green-700 dark:text-green-400'
                  : 'text-orange-700 dark:text-orange-400'
              )}
            >
              {hasEnoughDown ? (
                <>
                  Buyer has{' '}
                  <span className="font-bold">{formatCurrency(Math.abs(downPaymentGap!))}</span> more
                  than asking down payment
                </>
              ) : (
                <>
                  Gap: Buyer has{' '}
                  <span className="font-bold">{formatCurrency(Math.abs(downPaymentGap!))}</span> less
                  than asking down payment
                </>
              )}
            </AlertDescription>
          </div>
        </Alert>
      )}
    </div>
  );
}
