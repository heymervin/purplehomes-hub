/**
 * SecondLoanSection - Funding Loan 2 (additional financing)
 */

import { Layers, DollarSign, Percent, Calendar, Clock, CreditCard } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { SliderInput } from '../SliderInput';
import { SLIDER_CONFIGS, type SecondLoanInputs } from '@/types/calculator';
import { cn } from '@/lib/utils';

interface SecondLoanSectionProps {
  inputs: SecondLoanInputs;
  onChange: (field: keyof SecondLoanInputs, value: number | boolean | string) => void;
}

export function SecondLoanSection({ inputs, onChange }: SecondLoanSectionProps) {
  const pointsCost = inputs.loan2Principal * (inputs.loan2Points / 100);
  const totalUpfront = pointsCost + inputs.loan2Fees;

  return (
    <Card className={cn(!inputs.useLoan2 && 'opacity-75')}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-orange-600" />
            <CardTitle className="text-lg">Funding Loan 2</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="use-loan2" className="text-sm text-muted-foreground">
              {inputs.useLoan2 ? 'Enabled' : 'Disabled'}
            </Label>
            <Switch
              id="use-loan2"
              checked={inputs.useLoan2}
              onCheckedChange={(checked) => onChange('useLoan2', checked)}
            />
          </div>
        </div>
        <CardDescription>Additional financing from private lender or seller</CardDescription>
      </CardHeader>

      {inputs.useLoan2 && (
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Principal */}
            <div className="md:col-span-2">
              <SliderInput
                label="Loan Amount"
                value={inputs.loan2Principal}
                onChange={(v) => onChange('loan2Principal', v)}
                config={SLIDER_CONFIGS.loan2Principal}
                icon={<DollarSign className="h-4 w-4" />}
                description="Second loan principal"
              />
            </div>

            {/* Interest Rate */}
            <SliderInput
              label="Interest Rate"
              value={inputs.loan2InterestRate}
              onChange={(v) => onChange('loan2InterestRate', v)}
              config={SLIDER_CONFIGS.loan2InterestRate}
              icon={<Percent className="h-4 w-4" />}
              description="Annual interest rate"
            />

            {/* Term Years */}
            <SliderInput
              label="Loan Term"
              value={inputs.loan2TermYears}
              onChange={(v) => onChange('loan2TermYears', v)}
              config={SLIDER_CONFIGS.loan2TermYears}
              icon={<Clock className="h-4 w-4" />}
              description="Repayment period"
            />

            {/* Start Date */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <Calendar className="h-4 w-4" />
                Start Date
              </Label>
              <Input
                type="date"
                value={inputs.loan2StartDate}
                onChange={(e) => onChange('loan2StartDate', e.target.value)}
              />
            </div>

            {/* Balloon Years */}
            <SliderInput
              label="Balloon"
              value={inputs.loan2BalloonYears}
              onChange={(v) => onChange('loan2BalloonYears', v)}
              config={SLIDER_CONFIGS.loan2BalloonYears}
              icon={<Calendar className="h-4 w-4" />}
              description="Years until balloon (0 = none)"
            />

            {/* Points */}
            <SliderInput
              label="Points"
              value={inputs.loan2Points}
              onChange={(v) => onChange('loan2Points', v)}
              config={SLIDER_CONFIGS.loan2Points}
              icon={<CreditCard className="h-4 w-4" />}
              description={`= $${Math.round(pointsCost).toLocaleString()}`}
            />

            {/* Fees */}
            <SliderInput
              label="Lender Fees"
              value={inputs.loan2Fees}
              onChange={(v) => onChange('loan2Fees', v)}
              config={SLIDER_CONFIGS.loan2Fees}
              icon={<DollarSign className="h-4 w-4" />}
              description="Origination & other fees"
            />
          </div>

          {/* Upfront cost summary */}
          {totalUpfront > 0 && (
            <div className="p-3 rounded-lg bg-orange-50 border border-orange-200">
              <div className="flex items-center justify-between">
                <span className="text-sm text-orange-700">Upfront Costs</span>
                <span className="font-semibold text-orange-800">
                  ${Math.round(totalUpfront).toLocaleString()}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

export default SecondLoanSection;
