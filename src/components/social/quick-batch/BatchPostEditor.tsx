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
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  Check,
  Sparkles,
  ChevronDown,
  Search,
  FileText,
  Loader2,
  Copy,
  Wand2,
} from 'lucide-react';
import { toast } from 'sonner';
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
import { FALLBACK_AGENTS, getAgentById } from '@/lib/socialHub/agents';
import { useAgents } from '@/services/authApi';
import { SupportingImagePicker } from '@/components/social/templates/SupportingImagePicker';
import { getTemplateById } from '@/lib/templates/profiles';
import { ImageUrlInput } from '@/components/social/shared/ImageUrlInput';

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
  // Fetch dynamic agents from API (admins with profiles)
  const { data: dynamicAgents } = useAgents();
  const agents = dynamicAgents && dynamicAgents.length > 0 ? dynamicAgents : FALLBACK_AGENTS;

  // State for image expand dialog
  const [imageExpanded, setImageExpanded] = useState(false);
  const [customHashtag, setCustomHashtag] = useState('');

  // State for AI content generation (Professional tab)
  const [isGeneratingContent, setIsGeneratingContent] = useState(false);
  const [showCustomTopicDialog, setShowCustomTopicDialog] = useState(false);
  const [customTopicInput, setCustomTopicInput] = useState('');

  // Get intent definition and allowed templates
  const intentDef = useMemo(() => getIntent(item.intentId), [item.intentId]);
  const allowedTemplates = useMemo(() => getAllowedTemplates(item.intentId), [item.intentId]);
  const tabIntents = useMemo(() => getIntentsByTab(item.tab), [item.tab]);

  // Get selected agent for displaying contact info
  const selectedAgent = useMemo(
    () => getAgentById(item.selectedAgentId || 'krista', agents) || agents[0],
    [item.selectedAgentId, agents]
  );

  // Get template profile for user input fields
  // Map UI template IDs to profile IDs
  const selectedTemplateProfile = useMemo(() => {
    if (item.templateId === 'custom' || item.templateId === 'none') return null;
    // Map template IDs to profile IDs (UI uses different IDs than template profiles)
    const templateToProfile: Record<string, string> = {
      'just-listed': 'just-listed',
      'just-sold': 'just-sold',
      'open-house': 'open-house',
      'price-drop': 'price-drop',
      'coming-soon': 'coming-soon',
      'value-tips': 'personal-value',
      'success-story': 'success-story',
    };
    const profileId = templateToProfile[item.templateId];
    return profileId ? getTemplateById(profileId) : null;
  }, [item.templateId]);

  // Get user input fields for selected template (for custom template inputs like Value Tips)
  const userInputFields = useMemo(() => {
    if (!selectedTemplateProfile) return [];
    return Object.entries(selectedTemplateProfile.fields)
      .filter(([, config]) => config.source === 'user-input')
      .map(([key, config]) => ({ key, config }));
  }, [selectedTemplateProfile]);

  // Handle template input changes
  const handleTemplateInputChange = (key: string, value: string) => {
    onChange({
      templateUserInputs: {
        ...(item.templateUserInputs || {}),
        [key]: value,
      },
    });
  };

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

  // Generate content from AI (for Professional tab)
  const handleGenerateContent = async (customTopic?: string) => {
    setIsGeneratingContent(true);

    try {
      const response = await fetch('/api/ai?action=generate-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intent: item.intentId,
          templateId: item.templateId,
          location: 'New Orleans, LA',
          topic: customTopic || item.context.topic || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate content');
      }

      const data = await response.json();

      if (data.success && data.content?.fields) {
        const fields = data.content.fields;

        // Separate template-specific fields from context fields
        const templateFields: Record<string, string> = {};
        const contextFields: Record<string, string> = {};

        // Template field keys for Value Tips image template
        const templateFieldKeys = ['tipHeader', 'tip1Header', 'tip1Body', 'tip2Header', 'tip2Body', 'tip3Header', 'tip3Body'];

        for (const [key, value] of Object.entries(fields)) {
          if (templateFieldKeys.includes(key)) {
            templateFields[key] = value as string;
          } else {
            contextFields[key] = value as string;
          }
        }

        // Update batch item with generated content
        onChange({
          context: {
            ...item.context,
            ...contextFields,
          },
          templateUserInputs: {
            ...(item.templateUserInputs || {}),
            ...templateFields,
          },
        });

        toast.success('Content generated for this post!');
      } else {
        throw new Error(data.error || 'Failed to generate content');
      }
    } catch (error) {
      console.error('Generate content error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate content');
    } finally {
      setIsGeneratingContent(false);
    }
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
      {/* Property Info Header with Agent Selector (if property post) */}
      {item.tab === 'property' && property && (
        <Card className="bg-primary/5 border-primary/30">
          <CardContent className="p-4 space-y-4">
            {/* Property Info */}
            <div className="flex items-center gap-4">
              <Building2 className="h-8 w-8 text-primary" />
              <div>
                <h3 className="font-semibold">{property.address}</h3>
                <p className="text-sm text-muted-foreground">
                  {property.city}, {property.state} · ${property.price?.toLocaleString()} ·{' '}
                  {property.beds} bed · {property.baths} bath
                </p>
              </div>
            </div>

            {/* Agent Selector - Natural Language Style */}
            <div className="pt-3 border-t border-primary/20">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-muted-foreground">Share this listing as</span>
                <Select
                  value={item.selectedAgentId || 'krista'}
                  onValueChange={(value) => onChange({ selectedAgentId: value })}
                >
                  <SelectTrigger className="w-auto h-8 px-3 bg-white dark:bg-gray-900 border-primary/30">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {agents.map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        <span className="font-medium">{agent.name}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Agent Contact Info (Read-only) */}
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Phone</Label>
                  <Input
                    value={selectedAgent.phone}
                    readOnly
                    className="h-8 text-sm bg-muted/50 cursor-not-allowed"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Email</Label>
                  <Input
                    value={selectedAgent.email}
                    readOnly
                    className="h-8 text-sm bg-muted/50 cursor-not-allowed"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Agent name, phone, and email will appear on the generated image
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Agent Selection for Non-Property Posts (when template has agent fields) */}
      {item.tab !== 'property' && selectedTemplateProfile && (
        <Card className="bg-primary/5 border-primary/30">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <User className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">Post as</span>
              <Select
                value={item.selectedAgentId || 'krista'}
                onValueChange={(value) => onChange({ selectedAgentId: value })}
              >
                <SelectTrigger className="w-auto h-8 px-3 bg-white dark:bg-gray-900 border-primary/30">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {agents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      <span className="font-medium">{agent.name}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Agent Contact Info (Read-only) */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Phone</Label>
                <Input
                  value={selectedAgent.phone}
                  readOnly
                  className="h-8 text-sm bg-muted/50 cursor-not-allowed"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Email</Label>
                <Input
                  value={selectedAgent.email}
                  readOnly
                  className="h-8 text-sm bg-muted/50 cursor-not-allowed"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Agent info will appear on the generated image footer
            </p>
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
              <div className="flex items-center justify-between">
                <label className="text-xs text-muted-foreground block">Context Fields</label>
                {/* Generate dropdown for Professional tab */}
                {item.tab === 'professional' && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isGeneratingContent}
                        className="gap-1.5 text-primary border-primary/30 hover:bg-primary/10 hover:border-primary/30 h-7 text-xs"
                      >
                        {isGeneratingContent ? (
                          <>
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-3 w-3" />
                            Generate
                            <ChevronDown className="h-2.5 w-2.5 ml-0.5" />
                          </>
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52">
                      <DropdownMenuItem
                        onClick={() => handleGenerateContent()}
                        className="gap-2"
                      >
                        <Search className="h-3.5 w-3.5" />
                        <div>
                          <div className="font-medium text-sm">Auto-generate topic</div>
                          <div className="text-xs text-muted-foreground">AI picks a trending topic</div>
                        </div>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setShowCustomTopicDialog(true)}
                        className="gap-2"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        <div>
                          <div className="font-medium text-sm">Custom topic</div>
                          <div className="text-xs text-muted-foreground">Enter your own topic</div>
                        </div>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
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
      <Card className="border-primary/30">
        <CardHeader className="pb-3 bg-primary/5 rounded-t-lg">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-primary" />
            Image Template
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          {/* Template Selection */}
          <div>
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
          </div>

          {/* Template-Specific Input Fields (e.g., Value Tips fields) */}
          {userInputFields.length > 0 && (
            <div className="mt-4 p-4 rounded-lg bg-primary/5 border border-primary/20">
              <div className="flex items-center gap-2 mb-3">
                <ImageIcon className="h-4 w-4 text-primary" />
                <span className="font-medium text-sm">{selectedTemplateProfile?.name} Fields</span>
                <Badge variant="secondary" className="text-xs">
                  {userInputFields.length} field{userInputFields.length > 1 ? 's' : ''}
                </Badge>
              </div>
              <div className="space-y-3">
                {userInputFields.map(({ key, config }) => (
                  <div key={key} className="space-y-1">
                    <label className="text-sm font-medium text-foreground">
                      {config.inputConfig?.label || key}
                      {config.inputConfig?.required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    {config.dataType === 'textarea' ? (
                      <Textarea
                        placeholder={config.inputConfig?.placeholder}
                        value={(item.templateUserInputs || {})[key] || ''}
                        onChange={(e) => handleTemplateInputChange(key, e.target.value)}
                        rows={config.inputConfig?.rows || 2}
                        maxLength={config.inputConfig?.maxLength}
                        className="resize-none"
                      />
                    ) : config.dataType === 'image' ? (
                      <ImageUrlInput
                        value={(item.templateUserInputs || {})[key] || ''}
                        onChange={(url) => handleTemplateInputChange(key, url)}
                        placeholder={config.inputConfig?.placeholder || 'Paste image URL or upload...'}
                      />
                    ) : (
                      <Input
                        type="text"
                        placeholder={config.inputConfig?.placeholder}
                        value={(item.templateUserInputs || {})[key] || ''}
                        onChange={(e) => handleTemplateInputChange(key, e.target.value)}
                        maxLength={config.inputConfig?.maxLength}
                      />
                    )}
                    {config.inputConfig?.helpText && (
                      <p className="text-xs text-muted-foreground">{config.inputConfig.helpText}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Hero Image Selection - shown for property posts with images */}
          {item.tab === 'property' && property && (property.heroImage || (property.images && property.images.length > 0)) && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-primary" />
                <Label className="text-sm font-medium">Hero Image</Label>
              </div>
              <p className="text-xs text-muted-foreground">
                Select the main image for this post
              </p>
              <div className="grid grid-cols-4 gap-2">
                {[
                  ...(property.heroImage ? [property.heroImage] : []),
                  ...(property.images || []),
                ]
                  .filter((img, idx, arr) => arr.indexOf(img) === idx)
                  .slice(0, 8)
                  .map((img, idx) => {
                    const isSelected = (item.selectedHeroImage || property.heroImage) === img;
                    return (
                      <button
                        key={`hero-${img}-${idx}`}
                        type="button"
                        onClick={() => onChange({ selectedHeroImage: img })}
                        className={cn(
                          "relative aspect-square rounded-lg overflow-hidden border-2 transition-all",
                          isSelected
                            ? "border-primary ring-2 ring-primary/20"
                            : "border-transparent hover:border-muted-foreground/50"
                        )}
                      >
                        <img
                          src={img}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                        {isSelected && (
                          <div className="absolute top-1 right-1 bg-primary text-primary-foreground rounded-full p-0.5">
                            <Check className="h-3 w-3" />
                          </div>
                        )}
                      </button>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Supporting Images Selection - shown for templates that support them */}
          {item.tab === 'property' && property && (() => {
            // Get template profile to check if it supports supporting images
            const templateProfile = getTemplateById(item.templateId);
            const supportingImageCount = templateProfile?.supportingImageCount || 0;

            if (supportingImageCount === 0) return null;

            return (
              <SupportingImagePicker
                property={property}
                selectedImages={item.selectedSupportingImages || []}
                onSelectionChange={(images) => onChange({ selectedSupportingImages: images })}
                maxImages={supportingImageCount}
              />
            );
          })()}
        </CardContent>
      </Card>

      {/* Generated Image Preview (when ready) */}
      {item.status === 'ready' && item.imageUrl && (
        <Card className="border-primary/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              <span className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-primary" />
                Generated Image
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 text-primary hover:text-primary hover:bg-primary/10"
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
                <ImageIcon className="h-5 w-5 text-primary" />
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

      {/* AI Image Prompt (for Custom Image template with professional intents) */}
      {item.status === 'ready' && item.imagePrompt && item.templateId === 'custom' && (
        <Card className="bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-amber-700 dark:text-amber-300 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Wand2 className="h-4 w-4" />
                AI Image Prompt
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-amber-600 hover:text-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/50"
                onClick={() => {
                  const prompt = typeof item.imagePrompt === 'string'
                    ? item.imagePrompt
                    : Object.values(item.imagePrompt || {}).join('\n\n');
                  navigator.clipboard.writeText(prompt);
                  toast.success('Copied to clipboard');
                }}
              >
                <Copy className="h-3.5 w-3.5 mr-1" />
                Copy
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-xs text-amber-600 dark:text-amber-400 mb-2">
              Use this prompt with AI image tools like DALL-E, Midjourney, or Ideogram
            </p>
            <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border border-amber-200 dark:border-amber-800">
              {typeof item.imagePrompt === 'string' ? (
                <p className="text-sm whitespace-pre-wrap">{item.imagePrompt}</p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(item.imagePrompt || {}).map(([key, prompt]) => (
                    <div key={key}>
                      <Badge variant="outline" className="mb-1 text-xs">{key}</Badge>
                      <p className="text-sm whitespace-pre-wrap">{prompt}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
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

      {/* Custom Topic Dialog */}
      <Dialog open={showCustomTopicDialog} onOpenChange={setShowCustomTopicDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Enter Your Topic
            </DialogTitle>
            <DialogDescription>
              Describe what you want this post to be about. The AI will research this topic and generate content.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="e.g., 5 tips for first-time homebuyers in 2025"
              value={customTopicInput}
              onChange={(e) => setCustomTopicInput(e.target.value)}
              rows={4}
              className="resize-none"
              autoFocus
            />
            <p className="text-xs text-muted-foreground mt-2">
              Be specific for better results.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCustomTopicDialog(false);
                setCustomTopicInput('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (customTopicInput.trim()) {
                  handleGenerateContent(customTopicInput.trim());
                  setShowCustomTopicDialog(false);
                  setCustomTopicInput('');
                }
              }}
              disabled={!customTopicInput.trim()}
              className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Search className="h-4 w-4" />
              Research & Generate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
