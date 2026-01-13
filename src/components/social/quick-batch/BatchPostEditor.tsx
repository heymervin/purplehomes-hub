/**
 * BatchPostEditor - Create-style editor for a single batch post
 *
 * This component renders the SAME Create experience for editing a batch post.
 * It reuses the same sections: Caption Settings, Image Template, Context Fields, Schedule.
 */

import React, { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  Expand,
  X,
  Hash,
  Plus,
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
  BASE_HASHTAGS,
  PREFERRED_HASHTAGS,
  INTENT_HASHTAGS,
  generateLocationHashtags,
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
  // State for image expand dialog
  const [imageExpanded, setImageExpanded] = useState(false);
  const [customHashtag, setCustomHashtag] = useState('');

  // Get intent definition and allowed templates
  const intentDef = useMemo(() => getIntent(item.intentId), [item.intentId]);
  const allowedTemplates = useMemo(() => getAllowedTemplates(item.intentId), [item.intentId]);
  const tabIntents = useMemo(() => getIntentsByTab(item.tab), [item.tab]);

  // Generate suggested hashtags based on intent and property
  const suggestedHashtags = useMemo(() => {
    const hashtags: string[] = [];
    hashtags.push(...BASE_HASHTAGS);
    hashtags.push(...PREFERRED_HASHTAGS);
    const intentHashtags = INTENT_HASHTAGS[item.intentId] || [];
    hashtags.push(...intentHashtags);
    if (property) {
      const locationHashtags = generateLocationHashtags(property.city, property.state);
      hashtags.push(...locationHashtags);
    }
    return [...new Set(hashtags)];
  }, [item.intentId, property]);

  // Toggle hashtag selection
  const toggleHashtag = (hashtag: string) => {
    const isSelected = item.selectedHashtags.includes(hashtag);
    if (isSelected) {
      onChange({ selectedHashtags: item.selectedHashtags.filter((h) => h !== hashtag) });
    } else {
      onChange({ selectedHashtags: [...item.selectedHashtags, hashtag] });
    }
  };

  // Add custom hashtag
  const handleAddCustomHashtag = () => {
    if (!customHashtag.trim()) return;
    let formatted = customHashtag.trim();
    if (!formatted.startsWith('#')) formatted = `#${formatted}`;
    formatted = formatted.replace(/\s+/g, '');
    if (!item.selectedHashtags.includes(formatted)) {
      onChange({ selectedHashtags: [...item.selectedHashtags, formatted] });
    }
    setCustomHashtag('');
  };

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

      {/* Hashtags Section (Green) */}
      <Card className="border-green-200 dark:border-green-800">
        <CardHeader className="pb-3 bg-green-50 dark:bg-green-950/30 rounded-t-lg">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Hash className="h-4 w-4 text-green-500" />
            Hashtags
            <Badge variant="secondary" className="ml-auto">
              {item.selectedHashtags.length} selected
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          {/* Suggested Hashtags */}
          <div className="flex flex-wrap gap-2">
            {suggestedHashtags.map((hashtag) => {
              const isSelected = item.selectedHashtags.includes(hashtag);
              return (
                <Badge
                  key={hashtag}
                  variant={isSelected ? 'default' : 'outline'}
                  className={cn(
                    'cursor-pointer transition-all text-xs py-1 px-2',
                    isSelected && 'bg-green-600 hover:bg-green-700'
                  )}
                  onClick={() => toggleHashtag(hashtag)}
                >
                  {hashtag}
                </Badge>
              );
            })}
          </div>

          {/* Custom hashtag input */}
          <div className="flex gap-2">
            <Input
              value={customHashtag}
              onChange={(e) => setCustomHashtag(e.target.value)}
              placeholder="#CustomHashtag"
              onKeyDown={(e) => e.key === 'Enter' && handleAddCustomHashtag()}
              className="flex-1 h-8 text-sm"
            />
            <Button onClick={handleAddCustomHashtag} variant="outline" size="sm" className="h-8">
              <Plus className="h-3 w-3" />
            </Button>
          </div>

          {/* Selected custom hashtags (not in suggestions) */}
          {item.selectedHashtags.filter((h) => !suggestedHashtags.includes(h)).length > 0 && (
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Custom</label>
              <div className="flex flex-wrap gap-2">
                {item.selectedHashtags
                  .filter((h) => !suggestedHashtags.includes(h))
                  .map((hashtag) => (
                    <Badge
                      key={hashtag}
                      variant="default"
                      className="bg-green-600 hover:bg-green-700 cursor-pointer text-xs py-1 px-2"
                      onClick={() => toggleHashtag(hashtag)}
                    >
                      {hashtag}
                      <X className="h-3 w-3 ml-1" />
                    </Badge>
                  ))}
              </div>
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

      {/* Generated Image Preview (when ready) */}
      {item.status === 'ready' && item.imageUrl && (
        <Card className="border-purple-200 dark:border-purple-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              <span className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-purple-500" />
                Generated Image
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                onClick={() => setImageExpanded(true)}
              >
                <Expand className="h-4 w-4" />
                Expand
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {/* Full image preview without cropping */}
            <div className="relative rounded-lg overflow-hidden bg-muted">
              <img
                src={item.imageUrl}
                alt="Generated post image"
                className="w-full h-auto object-contain"
                style={{ maxHeight: '400px' }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Image Expand Dialog */}
      <Dialog open={imageExpanded} onOpenChange={setImageExpanded}>
        <DialogContent className="max-w-4xl w-[95vw] max-h-[95vh] p-0 overflow-hidden">
          <DialogHeader className="p-4 pb-2 border-b">
            <DialogTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5 text-purple-500" />
                Image Preview
              </span>
            </DialogTitle>
          </DialogHeader>
          <div className="p-4 overflow-auto max-h-[calc(95vh-80px)]">
            {item.imageUrl && (
              <img
                src={item.imageUrl}
                alt="Generated post image"
                className="w-full h-auto"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

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
