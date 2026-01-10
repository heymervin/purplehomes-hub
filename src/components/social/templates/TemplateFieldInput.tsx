import React, { useState } from 'react';
import { AlertCircle, Calendar } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
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
  const [date, setDate] = useState<Date | undefined>(value ? new Date(value) : undefined);
  const [startTime, setStartTime] = useState('14:00'); // 24-hour format for input
  const [endTime, setEndTime] = useState('16:00'); // 24-hour format for input

  // Convert 24-hour time (14:00) to 12-hour format (2 PM)
  const formatTime12Hour = (time24: string): string => {
    const [hours, minutes] = time24.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12;
    return `${hours12} ${period}`;
  };

  const handleDateTimeChange = (selectedDate: Date | undefined) => {
    if (!selectedDate) return;

    setDate(selectedDate);

    // Format as "Saturday, Jan 15 • 2-4 PM"
    const formattedDate = format(selectedDate, 'EEEE, MMM d');
    const formattedStart = formatTime12Hour(startTime);
    const formattedEnd = formatTime12Hour(endTime);
    const formattedDateTime = `${formattedDate} • ${formattedStart}-${formattedEnd}`;
    onChange(formattedDateTime);
  };

  const handleTimeChange = (newStartTime: string, newEndTime: string) => {
    setStartTime(newStartTime);
    setEndTime(newEndTime);

    if (date) {
      const formattedDate = format(date, 'EEEE, MMM d');
      const formattedStart = formatTime12Hour(newStartTime);
      const formattedEnd = formatTime12Hour(newEndTime);
      const formattedDateTime = `${formattedDate} • ${formattedStart}-${formattedEnd}`;
      onChange(formattedDateTime);
    }
  };

  return (
    <div className="space-y-1.5">
      <Label htmlFor={fieldKey} className="flex items-center gap-1 text-sm">
        {inputConfig.label}
        {inputConfig.required && <span className="text-red-500">*</span>}
      </Label>

      {fieldConfig.dataType === 'datetime' ? (
        <div className="space-y-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !value && "text-muted-foreground",
                  hasError && "border-red-500"
                )}
              >
                <Calendar className="mr-2 h-4 w-4" />
                {value || inputConfig.placeholder}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={date}
                onSelect={handleDateTimeChange}
                initialFocus
              />
              <div className="p-3 border-t space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Start Time</Label>
                  <Input
                    type="time"
                    value={startTime}
                    onChange={(e) => handleTimeChange(e.target.value, endTime)}
                    className="w-full"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium">End Time</Label>
                  <Input
                    type="time"
                    value={endTime}
                    onChange={(e) => handleTimeChange(startTime, e.target.value)}
                    className="w-full"
                  />
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      ) : fieldConfig.dataType === 'textarea' ? (
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
        <p
          className={cn(
            "text-xs text-right font-medium",
            value.length >= inputConfig.maxLength
              ? "text-red-600"
              : value.length >= inputConfig.maxLength * 0.9
              ? "text-amber-600"
              : "text-muted-foreground"
          )}
        >
          {value.length}/{inputConfig.maxLength}
        </p>
      )}
    </div>
  );
}
