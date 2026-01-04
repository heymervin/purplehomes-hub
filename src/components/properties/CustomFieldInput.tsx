// src/components/properties/CustomFieldInput.tsx

import {
  Type, FileText, Hash, DollarSign, List, Calendar,
  ToggleLeft, Image, Phone, Link, Tag
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import type { GHLCustomField } from '@/types/customFields';

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Type, FileText, Hash, DollarSign, List, Calendar,
  ToggleLeft, Image, Phone, Link, Tag
};

interface CustomFieldInputProps {
  field: GHLCustomField;
  value: string;
  onChange: (fieldId: string, value: string) => void;
  compact?: boolean;
}

function getIconName(dataType: string): string {
  const icons: Record<string, string> = {
    'TEXT': 'Type',
    'LARGE_TEXT': 'FileText',
    'NUMERICAL': 'Hash',
    'MONETARY': 'DollarSign',
    'SINGLE_OPTIONS': 'List',
    'MULTIPLE_OPTIONS': 'List',
    'DATE': 'Calendar',
    'CHECKBOX': 'ToggleLeft',
    'FILE': 'Image',
    'PHONE': 'Phone',
    'URL': 'Link',
  };
  return icons[dataType] || 'Tag';
}

export function CustomFieldInput({ field, value, onChange, compact = false }: CustomFieldInputProps) {
  const isEmpty = !value || value === '';
  const iconName = getIconName(field.dataType);
  const IconComponent = ICONS[iconName] || Tag;

  const renderInput = () => {
    switch (field.dataType) {
      case 'LARGE_TEXT':
        return (
          <Textarea
            id={field.id}
            value={value}
            onChange={(e) => onChange(field.id, e.target.value)}
            placeholder={field.placeholder || `Enter ${field.name.toLowerCase()}...`}
            className={cn('min-h-[80px] resize-none', isEmpty && 'bg-muted/50')}
          />
        );

      case 'SINGLE_OPTIONS':
      case 'MULTIPLE_OPTIONS':
        return (
          <Select value={value} onValueChange={(v) => onChange(field.id, v)}>
            <SelectTrigger className={cn(isEmpty && 'bg-muted/50 text-muted-foreground')}>
              <SelectValue placeholder={`Select ${field.name.toLowerCase()}...`} />
            </SelectTrigger>
            <SelectContent>
              {(field.options || []).map((option) => (
                <SelectItem key={option} value={option}>{option}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'MONETARY':
        return (
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
            <Input
              id={field.id}
              value={value ? Number(value).toLocaleString() : ''}
              onChange={(e) => onChange(field.id, e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="0"
              className={cn('pl-7', isEmpty && 'bg-muted/50')}
            />
          </div>
        );

      case 'DATE':
        return (
          <Input
            id={field.id}
            type="date"
            value={value}
            onChange={(e) => onChange(field.id, e.target.value)}
            className={cn(isEmpty && 'bg-muted/50')}
          />
        );

      case 'CHECKBOX':
        return (
          <div className="flex items-center gap-2 h-10">
            <Checkbox
              id={field.id}
              checked={value === 'true'}
              onCheckedChange={(checked) => onChange(field.id, checked ? 'true' : 'false')}
            />
            <label htmlFor={field.id} className="text-sm cursor-pointer">{field.name}</label>
          </div>
        );

      case 'NUMERICAL':
        return (
          <Input
            id={field.id}
            type="number"
            value={value}
            onChange={(e) => onChange(field.id, e.target.value)}
            placeholder={field.placeholder || '0'}
            className={cn(isEmpty && 'bg-muted/50')}
          />
        );

      case 'PHONE':
        return (
          <Input
            id={field.id}
            type="tel"
            value={value}
            onChange={(e) => onChange(field.id, e.target.value)}
            placeholder={field.placeholder || '(555) 555-5555'}
            className={cn(isEmpty && 'bg-muted/50')}
          />
        );

      case 'URL':
        return (
          <Input
            id={field.id}
            type="url"
            value={value}
            onChange={(e) => onChange(field.id, e.target.value)}
            placeholder={field.placeholder || 'https://...'}
            className={cn(isEmpty && 'bg-muted/50')}
          />
        );

      default:
        return (
          <Input
            id={field.id}
            value={value}
            onChange={(e) => onChange(field.id, e.target.value)}
            placeholder={field.placeholder || `Enter ${field.name.toLowerCase()}...`}
            className={cn(isEmpty && 'bg-muted/50')}
          />
        );
    }
  };

  // Checkbox renders its own label inline
  if (field.dataType === 'CHECKBOX') {
    return (
      <div className={cn(compact ? 'space-y-1.5' : 'flex items-start gap-3')}>
        <div className={cn(compact ? '' : 'flex-1')}>
          {renderInput()}
        </div>
      </div>
    );
  }

  return (
    <div className={cn(compact ? 'space-y-1.5' : 'flex items-start gap-3')}>
      <div className={cn(compact ? 'mb-1.5' : 'w-44 flex-shrink-0 pt-2')}>
        <Label htmlFor={field.id} className="flex items-center gap-2 text-sm">
          <IconComponent className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
          <span className="truncate">{field.name}</span>
          {field.required && (
            <span className="text-red-500 text-xs">*</span>
          )}
        </Label>
      </div>
      <div className={cn(compact ? '' : 'flex-1')}>
        {renderInput()}
      </div>
    </div>
  );
}
