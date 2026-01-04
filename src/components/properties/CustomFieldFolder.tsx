// src/components/properties/CustomFieldFolder.tsx

import { useState } from 'react';
import { ChevronDown, ChevronRight, Folder, FolderOpen, Check, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { CustomFieldInput } from './CustomFieldInput';
import type { CustomFieldFolder as FolderType } from '@/types/customFields';

interface CustomFieldFolderProps {
  folder: FolderType;
  values: Record<string, string>;
  onChange: (fieldId: string, value: string) => void;
  defaultOpen?: boolean;
  compact?: boolean;
}

export function CustomFieldFolder({
  folder,
  values,
  onChange,
  defaultOpen = false,
  compact = false,
}: CustomFieldFolderProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const colors = folder.color || {
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    icon: 'text-gray-500',
    text: 'text-gray-700'
  };

  // Count filled fields
  const filledCount = folder.fields.filter(f => {
    const value = values[f.id] || '';
    return value !== '';
  }).length;

  // Count required fields
  const requiredCount = folder.fields.filter(f => f.required).length;
  const filledRequiredCount = folder.fields.filter(f =>
    f.required && (values[f.id] || '')
  ).length;
  const missingRequired = requiredCount - filledRequiredCount;

  const isComplete = filledCount === folder.fields.length && folder.fields.length > 0;

  return (
    <div className={cn('rounded-xl border overflow-hidden', colors.border)}>
      {/* Folder Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'w-full flex items-center justify-between px-4 py-3 transition-opacity hover:opacity-90',
          colors.bg
        )}
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2 flex-wrap">
          {/* Folder Icon */}
          {isOpen ? (
            <FolderOpen className={cn('h-4 w-4', colors.icon)} />
          ) : (
            <Folder className={cn('h-4 w-4', colors.icon)} />
          )}

          {/* Folder Name */}
          <span className={cn('font-semibold', colors.text)}>
            {folder.name}
          </span>

          {/* Model Badge */}
          {folder.model && folder.model !== 'both' && (
            <span className={cn(
              'text-[10px] px-1.5 py-0.5 rounded font-medium',
              folder.model === 'opportunity'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-emerald-100 text-emerald-700'
            )}>
              {folder.model === 'opportunity' ? 'OPP' : 'CONTACT'}
            </span>
          )}

          {/* Completion Badge */}
          <Badge variant="secondary" className="bg-white/80 text-xs font-normal">
            {filledCount}/{folder.fields.length}
          </Badge>

          {/* Required Warning Badge */}
          {missingRequired > 0 && (
            <span className="text-[10px] text-red-600 bg-red-50 px-1.5 py-0.5 rounded font-medium flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {missingRequired} required
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isComplete && (
            <Check className="h-4 w-4 text-green-500" />
          )}
          {isOpen ? (
            <ChevronDown className={cn('h-5 w-5', colors.icon)} />
          ) : (
            <ChevronRight className={cn('h-5 w-5', colors.icon)} />
          )}
        </div>
      </button>

      {/* Folder Content */}
      {isOpen && (
        <div className={cn(
          'bg-white border-t p-4 space-y-4',
          colors.border
        )}>
          {folder.fields.map((field) => (
            <CustomFieldInput
              key={field.id}
              field={field}
              value={values[field.id] || ''}
              onChange={onChange}
              compact={compact}
            />
          ))}

          {folder.fields.length === 0 && (
            <p className="text-sm text-muted-foreground py-2">
              No fields in this folder
            </p>
          )}
        </div>
      )}
    </div>
  );
}
