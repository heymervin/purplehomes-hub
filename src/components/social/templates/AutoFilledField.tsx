import React from 'react';
import { Check, AlertCircle, Image, QrCode, Type } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FieldConfig, ResolvedFieldValue } from '@/lib/templates/types';

interface AutoFilledFieldProps {
  fieldKey: string;
  fieldConfig: FieldConfig;
  resolvedValue?: ResolvedFieldValue;
}

const fieldIcons: Record<string, React.ElementType> = {
  text: Type,
  textarea: Type,
  image: Image,
  qr: QrCode,
  datetime: Type,
  currency: Type,
};

const fieldLabels: Record<string, string> = {
  logo: 'Company Logo',
  address: 'Property Address',
  price: 'Price',
  heroImage: 'Main Image',
  supportingImage1: 'Gallery Image 1',
  supportingImage2: 'Gallery Image 2',
  supportingImage3: 'Gallery Image 3',
  qrCode: 'QR Code',
};

export function AutoFilledField({
  fieldKey,
  fieldConfig,
  resolvedValue,
}: AutoFilledFieldProps) {
  const Icon = fieldIcons[fieldConfig.dataType] || Type;
  const label = fieldLabels[fieldKey] || fieldKey;
  const isValid = resolvedValue?.isValid ?? false;
  const value = resolvedValue?.value || '';

  // Truncate long values for display
  const displayValue = value.length > 50 ? `${value.slice(0, 50)}...` : value;

  return (
    <div className={cn(
      "flex items-center gap-3 p-2 rounded-lg",
      isValid ? "bg-green-50 dark:bg-green-950/20" : "bg-red-50 dark:bg-red-950/20"
    )}>
      {/* Icon */}
      <div className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center",
        isValid
          ? "bg-green-100 dark:bg-green-900/30"
          : "bg-red-100 dark:bg-red-900/30"
      )}>
        <Icon className={cn(
          "h-4 w-4",
          isValid ? "text-green-600" : "text-red-600"
        )} />
      </div>

      {/* Label & Value */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {isValid ? (
          <p className="text-xs text-muted-foreground truncate">
            {fieldConfig.dataType === 'image' ? '✓ Image ready' :
             fieldConfig.dataType === 'qr' ? '✓ QR code ready' :
             displayValue || '✓ Ready'}
          </p>
        ) : (
          <p className="text-xs text-red-500">
            {resolvedValue?.error || 'Missing'}
          </p>
        )}
      </div>

      {/* Status Icon */}
      {isValid ? (
        <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
      ) : (
        <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
      )}
    </div>
  );
}
