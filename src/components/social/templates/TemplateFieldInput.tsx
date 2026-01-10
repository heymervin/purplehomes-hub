import React from 'react';
import { AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { FieldConfig } from '@/lib/templates/types';

interface TemplateFieldInputProps {
  fieldKey: string;
  fieldConfig: FieldConfig;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

export function TemplateFieldInput({
  fieldKey,
  fieldConfig,
  value,
  onChange,
  error,
}: TemplateFieldInputProps) {
  const inputConfig = fieldConfig.inputConfig;
  if (!inputConfig) return null;

  const hasError = !!error;

  return (
    <div className="space-y-1.5">
      <Label htmlFor={fieldKey} className="flex items-center gap-1 text-sm">
        {inputConfig.label}
        {inputConfig.required && <span className="text-red-500">*</span>}
      </Label>

      {fieldConfig.dataType === 'textarea' ? (
        <Textarea
          id={fieldKey}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={inputConfig.placeholder}
          maxLength={inputConfig.maxLength}
          rows={inputConfig.rows || 2}
          className={cn("resize-none", hasError && "border-red-500")}
        />
      ) : fieldConfig.dataType === 'image' ? (
        <Input
          id={fieldKey}
          type="url"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={inputConfig.placeholder || 'Paste image URL...'}
          className={cn(hasError && "border-red-500")}
        />
      ) : (
        <Input
          id={fieldKey}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={inputConfig.placeholder}
          maxLength={inputConfig.maxLength}
          className={cn(hasError && "border-red-500")}
        />
      )}

      {/* Help text or error */}
      {hasError ? (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {error}
        </p>
      ) : inputConfig.helpText ? (
        <p className="text-xs text-muted-foreground">{inputConfig.helpText}</p>
      ) : null}

      {/* Character count for text inputs */}
      {inputConfig.maxLength && (
        <p className="text-xs text-muted-foreground text-right">
          {value.length}/{inputConfig.maxLength}
        </p>
      )}
    </div>
  );
}
