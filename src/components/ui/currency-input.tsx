// src/components/ui/currency-input.tsx

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface CurrencyInputProps {
  id: string;
  label: string;
  value?: number;
  onChange: (value: number | undefined) => void;
  placeholder?: string;
  className?: string;
  icon?: React.ReactNode;
}

export function CurrencyInput({
  id,
  label,
  value,
  onChange,
  placeholder = '0',
  className,
  icon
}: CurrencyInputProps) {
  const [displayValue, setDisplayValue] = useState(value?.toLocaleString() || '');

  useEffect(() => {
    setDisplayValue(value?.toLocaleString() || '');
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, '');
    const numValue = raw ? parseInt(raw, 10) : undefined;
    setDisplayValue(numValue?.toLocaleString() || '');
    onChange(numValue);
  };

  return (
    <div className={cn('space-y-2', className)}>
      <Label htmlFor={id} className="flex items-center gap-2 text-sm">
        {icon}
        {label}
      </Label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
          $
        </span>
        <Input
          id={id}
          value={displayValue}
          onChange={handleChange}
          placeholder={placeholder}
          className="pl-7 font-medium"
        />
      </div>
    </div>
  );
}
