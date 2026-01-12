import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Property } from '@/types';
import {
  type IntentId,
  type ToneId,
  type ImageTemplateId,
  type BatchItem,
  INTENTS,
  TONES,
  getIntent,
  getAllowedTemplates,
  getDefaultTone,
  getPrimaryTemplate,
} from '@/lib/socialHub';

interface BatchItemRowProps {
  item: BatchItem;
  property: Property;
  index: number;
  onChange: (updates: Partial<BatchItem>) => void;
}

export function BatchItemRow({ item, property, index, onChange }: BatchItemRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Get intent definition and allowed templates
  const intentDef = useMemo(() => getIntent(item.intentId), [item.intentId]);
  const allowedTemplates = useMemo(() => getAllowedTemplates(item.intentId), [item.intentId]);

  // When intent changes, auto-update template and tone
  const handleIntentChange = (newIntentId: IntentId) => {
    const newTemplate = getPrimaryTemplate(newIntentId);
    const newTone = getDefaultTone(newIntentId);
    onChange({
      intentId: newIntentId,
      templateId: newTemplate,
      toneId: newTone,
      context: {}, // Reset context when intent changes
    });
  };

  // Update context field
  const handleContextChange = (key: string, value: string) => {
    onChange({
      context: {
        ...item.context,
        [key]: value,
      },
    });
  };

  // Status indicator
  const StatusIcon = () => {
    switch (item.status) {
      case 'generating':
        return <Loader2 className="h-4 w-4 animate-spin text-purple-500" />;
      case 'ready':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <span className="h-4 w-4 rounded-full bg-muted" />;
    }
  };

  // Get property intents only for batch (simplify the UI)
  const propertyIntents = INTENTS.filter((i) => i.tab === 'property');

  return (
    <Card className={cn(
      'transition-colors',
      item.status === 'failed' && 'border-red-300 bg-red-50/50 dark:bg-red-950/20',
      item.status === 'ready' && 'border-green-300/50',
      isExpanded && 'border-purple-300 dark:border-purple-700'
    )}>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        {/* Collapsed Header Row */}
        <CollapsibleTrigger asChild>
          <div className="p-3 cursor-pointer hover:bg-muted/30">
            <div className="flex items-center gap-3">
              {/* Index */}
              <Badge variant="outline" className="w-7 h-7 flex items-center justify-center flex-shrink-0">
                {index + 1}
              </Badge>

              {/* Property Info */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{property.address}</p>
                <p className="text-xs text-muted-foreground">
                  {property.city}, {property.state} · ${property.price?.toLocaleString()}
                </p>
              </div>

              {/* Intent Badge */}
              <Badge variant="secondary" className="flex-shrink-0">
                {intentDef.icon} {intentDef.label}
              </Badge>

              {/* Status */}
              <StatusIcon />

              {/* Expand/Collapse */}
              {isExpanded ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </div>
        </CollapsibleTrigger>

        {/* Expanded Content */}
        <CollapsibleContent>
          <CardContent className="pt-0 pb-4 px-4 space-y-4 border-t">
            {/* Intent + Tone + Template Row */}
            <div className="grid grid-cols-3 gap-3 pt-4">
              {/* Intent */}
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Intent</label>
                <Select
                  value={item.intentId}
                  onValueChange={(v) => handleIntentChange(v as IntentId)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {propertyIntents.map((intent) => (
                      <SelectItem key={intent.id} value={intent.id}>
                        <span className="flex items-center gap-2">
                          <span>{intent.icon}</span>
                          <span>{intent.label}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Tone */}
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Tone</label>
                <Select
                  value={item.toneId}
                  onValueChange={(v) => onChange({ toneId: v as ToneId })}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TONES.map((tone) => (
                      <SelectItem key={tone.id} value={tone.id}>
                        <span className="flex items-center gap-2">
                          <span>{tone.icon}</span>
                          <span>{tone.label}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Template */}
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Template</label>
                <Select
                  value={item.templateId}
                  onValueChange={(v) => onChange({ templateId: v as ImageTemplateId })}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {allowedTemplates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        <span className="flex items-center gap-2">
                          <span>{template.icon}</span>
                          <span>{template.label}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Intent-Specific Context Fields */}
            {intentDef.fields.length > 0 && (
              <div className="space-y-3">
                <label className="text-xs text-muted-foreground block">Context</label>
                {intentDef.fields.map((field) => (
                  <div key={field.key}>
                    <label className="text-xs font-medium mb-1 block">
                      {field.label}
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    {field.type === 'textarea' ? (
                      <Textarea
                        value={item.context[field.key] || ''}
                        onChange={(e) => handleContextChange(field.key, e.target.value)}
                        placeholder={field.placeholder}
                        rows={2}
                        maxLength={field.maxChars}
                        className="resize-none text-sm"
                      />
                    ) : (
                      <Input
                        value={item.context[field.key] || ''}
                        onChange={(e) => handleContextChange(field.key, e.target.value)}
                        placeholder={field.placeholder}
                        maxLength={field.maxChars}
                        className="h-8 text-sm"
                      />
                    )}
                    {field.helpText && (
                      <p className="text-xs text-muted-foreground mt-1">{field.helpText}</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Preview of generated caption (when ready) */}
            {item.status === 'ready' && item.caption && (
              <div className="bg-muted/50 rounded-lg p-3">
                <label className="text-xs text-muted-foreground mb-1 block">Generated Caption Preview</label>
                <p className="text-xs line-clamp-3">{item.caption.substring(0, 200)}...</p>
              </div>
            )}

            {/* Error message */}
            {item.status === 'failed' && item.error && (
              <div className="bg-red-50 dark:bg-red-950/30 rounded-lg p-3">
                <p className="text-xs text-red-600 dark:text-red-400">{item.error}</p>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
