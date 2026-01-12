import React, { useState, useMemo } from 'react';
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
  Calendar,
  Clock,
  Building2,
  User,
  Briefcase,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Property } from '@/types';
import {
  type SocialTabId,
  type IntentId,
  type ToneId,
  type ImageTemplateId,
  type BatchItem,
  TABS,
  TONES,
  getIntent,
  getIntentsByTab,
  getAllowedTemplates,
  getDefaultTone,
  getPrimaryTemplate,
  getDefaultIntent,
} from '@/lib/socialHub';

interface BatchItemRowProps {
  item: BatchItem;
  property?: Property; // Optional - not required for personal/professional posts
  index: number;
  onChange: (updates: Partial<BatchItem>) => void;
}

// Tab icons
const TAB_ICONS: Record<SocialTabId, React.ReactNode> = {
  property: <Building2 className="h-3 w-3" />,
  personal: <User className="h-3 w-3" />,
  professional: <Briefcase className="h-3 w-3" />,
};

export function BatchItemRow({ item, property, index, onChange }: BatchItemRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Get intent definition and allowed templates
  const intentDef = useMemo(() => getIntent(item.intentId), [item.intentId]);
  const allowedTemplates = useMemo(() => getAllowedTemplates(item.intentId), [item.intentId]);
  const tabIntents = useMemo(() => getIntentsByTab(item.tab), [item.tab]);

  // When tab changes, reset to first intent of that tab
  const handleTabChange = (newTab: SocialTabId) => {
    const firstIntent = getDefaultIntent(newTab);
    const newTemplate = getPrimaryTemplate(firstIntent.id);
    const newTone = getDefaultTone(firstIntent.id);
    onChange({
      tab: newTab,
      intentId: firstIntent.id,
      templateId: newTemplate,
      toneId: newTone,
      context: {},
      // Clear property if switching away from property tab
      propertyId: newTab === 'property' ? item.propertyId : undefined,
    });
  };

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

  // Handle schedule changes (marks as custom schedule)
  const handleDateChange = (date: string) => {
    onChange({
      scheduledDate: date,
      hasCustomSchedule: true,
    });
  };

  const handleTimeChange = (time: string) => {
    onChange({
      scheduledTime: time,
      hasCustomSchedule: true,
    });
  };

  // Format scheduled time for display
  const getScheduleDisplay = () => {
    if (!item.scheduledDate && !item.scheduledTime) return 'Now';
    const parts: string[] = [];
    if (item.scheduledDate) {
      const date = new Date(item.scheduledDate);
      parts.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
    }
    if (item.scheduledTime) {
      parts.push(item.scheduledTime);
    }
    return parts.join(' · ') || 'Now';
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

  // Get display title based on tab type
  const getItemTitle = () => {
    if (item.tab === 'property' && property) {
      return property.address;
    }
    return `${intentDef.label} Post`;
  };

  const getItemSubtitle = () => {
    if (item.tab === 'property' && property) {
      return `${property.city}, ${property.state} · $${property.price?.toLocaleString()}`;
    }
    return intentDef.description || '';
  };

  return (
    <Card
      className={cn(
        'transition-colors',
        item.status === 'failed' && 'border-red-300 bg-red-50/50 dark:bg-red-950/20',
        item.status === 'ready' && 'border-green-300/50',
        isExpanded && 'border-purple-300 dark:border-purple-700'
      )}
    >
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        {/* Collapsed Header Row */}
        <CollapsibleTrigger asChild>
          <div className="p-3 cursor-pointer hover:bg-muted/30">
            <div className="flex items-center gap-3">
              {/* Index */}
              <Badge
                variant="outline"
                className="w-7 h-7 flex items-center justify-center flex-shrink-0"
              >
                {index + 1}
              </Badge>

              {/* Tab Icon */}
              <div className="flex-shrink-0 text-muted-foreground">
                {TAB_ICONS[item.tab]}
              </div>

              {/* Post Info */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{getItemTitle()}</p>
                <p className="text-xs text-muted-foreground truncate">{getItemSubtitle()}</p>
              </div>

              {/* Schedule Badge */}
              <Badge
                variant={item.hasCustomSchedule ? 'default' : 'outline'}
                className={cn(
                  'flex-shrink-0 text-xs',
                  item.hasCustomSchedule && 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                )}
              >
                <Clock className="h-3 w-3 mr-1" />
                {getScheduleDisplay()}
              </Badge>

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
            {/* Scheduling Section */}
            <div className="pt-4 space-y-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                <span className="font-medium">Schedule</span>
                {item.hasCustomSchedule && (
                  <Badge variant="outline" className="text-[10px] h-4 px-1">
                    Custom
                  </Badge>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Date</label>
                  <Input
                    type="date"
                    value={item.scheduledDate}
                    onChange={(e) => handleDateChange(e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Time</label>
                  <Input
                    type="time"
                    value={item.scheduledTime}
                    onChange={(e) => handleTimeChange(e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Caption Settings Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-medium">Caption Settings</span>
              </div>

              {/* Tab + Intent + Tone + Template Row */}
              <div className="grid grid-cols-4 gap-2">
                {/* Tab */}
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Type</label>
                  <Select value={item.tab} onValueChange={(v) => handleTabChange(v as SocialTabId)}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TABS.map((tab) => (
                        <SelectItem key={tab.id} value={tab.id}>
                          <span className="flex items-center gap-2">
                            {TAB_ICONS[tab.id]}
                            <span>{tab.label}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

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
                      {tabIntents.map((intent) => (
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
            </div>

            {/* Intent-Specific Context Fields */}
            {intentDef.fields.length > 0 && (
              <div className="space-y-3">
                <label className="text-xs text-muted-foreground block font-medium">
                  Context Fields
                </label>
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
                <label className="text-xs text-muted-foreground mb-1 block">
                  Generated Caption Preview
                </label>
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
