/**
 * TaxInsuranceSection - Annual property tax and insurance (split homeowners + flood)
 */

import { FileSpreadsheet, Building, Shield, Droplets } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { SliderInput } from '../SliderInput';
import { SLIDER_CONFIGS, type TaxInsuranceInputs } from '@/types/calculator';

interface TaxInsuranceSectionProps {
  inputs: TaxInsuranceInputs;
  onChange: (field: keyof TaxInsuranceInputs, value: number | boolean) => void;
}

export function TaxInsuranceSection({ inputs, onChange }: TaxInsuranceSectionProps) {
  // Calculate total insurance (homeowners + flood if enabled)
  const totalAnnualInsurance = (inputs.annualHomeownersInsurance ?? inputs.annualInsurance ?? 0) +
    (inputs.hasFloodInsurance ? (inputs.annualFloodInsurance ?? 0) : 0);
  const totalAnnual = inputs.annualTaxes + totalAnnualInsurance;
  const totalMonthly = totalAnnual / 12;

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-lg">Taxes & Insurance</CardTitle>
          </div>
          <div className="text-right">
            <span className="text-sm text-muted-foreground">Monthly: </span>
            <span className="text-lg font-bold text-blue-600">
              ${Math.round(totalMonthly).toLocaleString()}/mo
            </span>
          </div>
        </div>
        <CardDescription>Annual property taxes and insurance premiums</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Annual Taxes */}
        <SliderInput
          label="Annual Property Taxes"
          value={inputs.annualTaxes}
          onChange={(v) => onChange('annualTaxes', v)}
          config={SLIDER_CONFIGS.annualTaxes}
          icon={<Building className="h-4 w-4" />}
          description="Yearly property tax amount"
        />

        {/* Insurance Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Insurance</h4>
            <span className="text-sm text-muted-foreground">
              Total: ${Math.round(totalAnnualInsurance).toLocaleString()}/yr
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Homeowners Insurance */}
            <SliderInput
              label="Homeowners Insurance"
              value={inputs.annualHomeownersInsurance ?? inputs.annualInsurance ?? 0}
              onChange={(v) => onChange('annualHomeownersInsurance', v)}
              config={SLIDER_CONFIGS.annualHomeownersInsurance}
              icon={<Shield className="h-4 w-4" />}
              description="Annual homeowners premium"
            />

            {/* Flood Insurance with checkbox */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="hasFloodInsurance"
                  checked={inputs.hasFloodInsurance}
                  onCheckedChange={(checked) => onChange('hasFloodInsurance', !!checked)}
                />
                <Label htmlFor="hasFloodInsurance" className="text-sm cursor-pointer">
                  Property requires flood insurance
                </Label>
              </div>
              {inputs.hasFloodInsurance && (
                <SliderInput
                  label="Flood Insurance"
                  value={inputs.annualFloodInsurance ?? 0}
                  onChange={(v) => onChange('annualFloodInsurance', v)}
                  config={SLIDER_CONFIGS.annualFloodInsurance}
                  icon={<Droplets className="h-4 w-4" />}
                  description="Annual flood premium"
                />
              )}
            </div>
          </div>
        </div>

        {/* Monthly breakdown */}
        <div className="grid grid-cols-3 gap-4 p-4 rounded-lg bg-blue-50 border border-blue-200">
          <div>
            <span className="text-xs text-blue-700">Monthly Taxes</span>
            <p className="text-lg font-semibold text-blue-800">
              ${Math.round(inputs.annualTaxes / 12).toLocaleString()}
            </p>
          </div>
          <div>
            <span className="text-xs text-blue-700">Monthly Insurance</span>
            <p className="text-lg font-semibold text-blue-800">
              ${Math.round(totalAnnualInsurance / 12).toLocaleString()}
            </p>
          </div>
          <div>
            <span className="text-xs text-blue-700">Total Monthly T&I</span>
            <p className="text-lg font-bold text-blue-800">
              ${Math.round(totalMonthly).toLocaleString()}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default TaxInsuranceSection;
