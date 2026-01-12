/**
 * BatchPostEditor - Create-style editor for a single batch post
 *
 * This component renders the SAME Create experience for editing a batch post.
 * It reuses the same sections: Caption Settings, Image Template, Context Fields, Schedule.
 */

import React, { useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Calendar,
  Clock,
  MessageSquare,
  Image as ImageIcon,
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

interface BatchPostEditorProps {
  item: BatchItem;
  property?: Property;
  onChange: (updates: Partial<BatchItem>) => void;
}

// Tab icons
const TAB_ICONS: Record<SocialTabId, React.ReactNode> = {
  property: <Building2 className="h-4 w-4" />,
  personal: <User className="h-4 w-4" />,
  professional: <Briefcase className="h-4 w-4" />,
};

export function BatchPostEditor({ item, property, onChange }: BatchPostEditorProps) {
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
      context: {},
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

  return (
    <div className="space-y-6">
      {/* Property Info Header (if property post) */}
      {item.tab === 'property' && property && (
        <Card className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/30 dark:to-blue-950/30 border-purple-200 dark:border-purple-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <Building2 className="h-8 w-8 text-purple-600" />
              <div>
                <h3 className="font-semibold">{property.address}</h3>
                <p className="text-sm text-muted-foreground">
                  {property.city}, {property.state} · ${property.price?.toLocaleString()} ·{' '}
                  {property.beds} bed · {property.baths} bath
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Schedule Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Calendar className="h-4 w-4 text-blue-500" />
            Schedule
            {item.hasCustomSchedule && (
              <Badge variant="outline" className="text-xs ml-2">
                Custom
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Date</label>
              <Input
                type="date"
                value={item.scheduledDate}
                onChange={(e) => handleDateChange(e.target.value)}
                className="h-10"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Time</label>
              <Input
                type="time"
                value={item.scheduledTime}
                onChange={(e) => handleTimeChange(e.target.value)}
                className="h-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Caption Settings Section (Blue) */}
      <Card className="border-blue-200 dark:border-blue-800">
        <CardHeader className="pb-3 bg-blue-50 dark:bg-blue-950/30 rounded-t-lg">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-blue-500" />
            Caption Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          {/* Post Type (Tab) */}
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Post Type</label>
            <div className="flex gap-2">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors',
                    item.tab === tab.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300'
                      : 'border-muted hover:bg-muted/50'
                  )}
                >
                  {TAB_ICONS[tab.id]}
                  <span className="text-sm font-medium">{tab.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Intent */}
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">What are you announcing?</label>
            <Select value={item.intentId} onValueChange={(v) => handleIntentChange(v as IntentId)}>
              <SelectTrigger className="h-10">
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
            {intentDef.description && (
              <p className="text-xs text-muted-foreground mt-1">{intentDef.description}</p>
            )}
          </div>

          {/* Tone */}
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Tone</label>
            <Select value={item.toneId} onValueChange={(v) => onChange({ toneId: v as ToneId })}>
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TONES.map((tone) => (
                  <SelectItem key={tone.id} value={tone.id}>
                    <span className="flex items-center gap-2">
                      <span>{tone.icon}</span>
                      <span>{tone.label}</span>
                      <span className="text-xs text-muted-foreground ml-2">{tone.description}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Intent-Specific Context Fields */}
          {intentDef.fields.length > 0 && (
            <div className="space-y-4 pt-2 border-t">
              <label className="text-xs text-muted-foreground block">Context Fields</label>
              {intentDef.fields.map((field) => (
                <div key={field.key}>
                  <label className="text-sm font-medium mb-1.5 block">
                    {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  {field.type === 'textarea' ? (
                    <Textarea
                      value={item.context[field.key] || ''}
                      onChange={(e) => handleContextChange(field.key, e.target.value)}
                      placeholder={field.placeholder}
                      rows={3}
                      maxLength={field.maxChars}
                      className="resize-none"
                    />
                  ) : (
                    <Input
                      value={item.context[field.key] || ''}
                      onChange={(e) => handleContextChange(field.key, e.target.value)}
                      placeholder={field.placeholder}
                      maxLength={field.maxChars}
                    />
                  )}
                  {field.helpText && (
                    <p className="text-xs text-muted-foreground mt-1">{field.helpText}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Image Template Section (Purple) */}
      <Card className="border-purple-200 dark:border-purple-800">
        <CardHeader className="pb-3 bg-purple-50 dark:bg-purple-950/30 rounded-t-lg">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-purple-500" />
            Image Template
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <Select
            value={item.templateId}
            onValueChange={(v) => onChange({ templateId: v as ImageTemplateId })}
          >
            <SelectTrigger className="h-10">
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
          <p className="text-xs text-muted-foreground mt-2">
            Templates are filtered based on your selected intent.
          </p>
        </CardContent>
      </Card>

      {/* Preview of generated caption (when ready) */}
      {item.status === 'ready' && item.caption && (
        <Card className="bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-700 dark:text-green-300">
              Generated Caption
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm whitespace-pre-wrap">{item.caption}</p>
          </CardContent>
        </Card>
      )}

      {/* Error message */}
      {item.status === 'failed' && item.error && (
        <Card className="bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800">
          <CardContent className="p-4">
            <p className="text-sm text-red-600 dark:text-red-400">{item.error}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
