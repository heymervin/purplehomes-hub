/**
 * OperatingSection - Recurring operating expenses
 */

import { Cog, Shield, Users, Building, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { SliderInput } from '../SliderInput';
import { SLIDER_CONFIGS, type OperatingInputs } from '@/types/calculator';

interface OperatingSectionProps {
  inputs: OperatingInputs;
  monthlyRent: number;
  onChange: (field: keyof OperatingInputs, value: number) => void;
}

export function OperatingSection({ inputs, monthlyRent, onChange }: OperatingSectionProps) {
  // Support both new and legacy field names
  const warChestPercent = inputs.warChestPercent ?? inputs.maintenancePercent ?? 5;
  const warChestAmount = monthlyRent * (warChestPercent / 100);
  const propertyMgmtAmount = monthlyRent * (inputs.propertyMgmtPercent / 100);
  const totalMonthly = warChestAmount + propertyMgmtAmount + inputs.hoa + inputs.utilities;

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cog className="h-5 w-5 text-purple-600" />
            <CardTitle className="text-lg">Operating Expenses</CardTitle>
          </div>
          <div className="text-right">
            <span className="text-sm text-muted-foreground">Total: </span>
            <span className="text-lg font-bold text-purple-600">
              ${Math.round(totalMonthly).toLocaleString()}/mo
            </span>
          </div>
        </div>
        <CardDescription>Recurring monthly operating costs</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* War Chest Percent (renamed from Maintenance) */}
          <div className="space-y-1">
            <SliderInput
              label="War Chest Reserve"
              value={warChestPercent}
              onChange={(v) => onChange('warChestPercent', v)}
              config={SLIDER_CONFIGS.warChestPercent}
              icon={<Shield className="h-4 w-4" />}
              description="% of rent for repairs/reserves"
            />
            <p className="text-xs text-muted-foreground pl-6">
              = ${Math.round(warChestAmount).toLocaleString()}/mo
            </p>
          </div>

          {/* Property Management Percent */}
          <div className="space-y-1">
            <SliderInput
              label="Property Management"
              value={inputs.propertyMgmtPercent}
              onChange={(v) => onChange('propertyMgmtPercent', v)}
              config={SLIDER_CONFIGS.propertyMgmtPercent}
              icon={<Users className="h-4 w-4" />}
              description="% of rent for PM fee"
            />
            <p className="text-xs text-muted-foreground pl-6">
              = ${Math.round(propertyMgmtAmount).toLocaleString()}/mo
            </p>
          </div>

          {/* HOA */}
          <SliderInput
            label="HOA Fees"
            value={inputs.hoa}
            onChange={(v) => onChange('hoa', v)}
            config={SLIDER_CONFIGS.hoa}
            icon={<Building className="h-4 w-4" />}
            description="Monthly HOA dues"
          />

          {/* Utilities */}
          <SliderInput
            label="Utilities (if owner-paid)"
            value={inputs.utilities}
            onChange={(v) => onChange('utilities', v)}
            config={SLIDER_CONFIGS.utilities}
            icon={<Zap className="h-4 w-4" />}
            description="Owner-paid utilities"
          />
        </div>

        {/* Summary */}
        <div className="grid grid-cols-4 gap-2 p-3 rounded-lg bg-purple-50 border border-purple-200">
          <div className="text-center">
            <span className="text-xs text-purple-700">War Chest</span>
            <p className="font-semibold text-purple-800">${Math.round(warChestAmount)}</p>
          </div>
          <div className="text-center">
            <span className="text-xs text-purple-700">PM</span>
            <p className="font-semibold text-purple-800">${Math.round(propertyMgmtAmount)}</p>
          </div>
          <div className="text-center">
            <span className="text-xs text-purple-700">HOA</span>
            <p className="font-semibold text-purple-800">${inputs.hoa}</p>
          </div>
          <div className="text-center">
            <span className="text-xs text-purple-700">Utils</span>
            <p className="font-semibold text-purple-800">${inputs.utilities}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default OperatingSection;
