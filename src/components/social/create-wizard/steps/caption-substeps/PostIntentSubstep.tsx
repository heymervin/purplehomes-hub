import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ChevronRight, Sparkles, Loader2, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WizardState, PostIntent, CaptionLength } from '../../types';
import { POST_INTENTS, CAPTION_LENGTHS } from '../../types';
import { FALLBACK_AGENTS } from '@/lib/socialHub/agents';
import { useAgents } from '@/services/authApi';
import VoiceInput from '../../components/VoiceInput';

// ============================================
// INTENT FIELD CONFIGURATIONS
// ============================================

type IntentDomain = 'property' | 'personal' | 'professional';

interface FieldConfig {
  id: string;
  label: string;
  placeholder: string;
  type: 'input' | 'textarea';
  rows?: number;
  required?: boolean;
}

const INTENT_DOMAINS: Record<string, IntentDomain> = {
  'just-listed': 'property',
  'sold': 'property',
  'under-contract': 'property',
  'price-reduced': 'property',
  'price-drop': 'property',
  'open-house': 'property',
  'coming-soon': 'property',
  'investment': 'property',
  'life-update': 'personal',
  'milestone': 'personal',
  'lesson-insight': 'personal',
  'behind-the-scenes': 'personal',
  'market-update': 'professional',
  'buyer-tips': 'professional',
  'seller-tips': 'professional',
  'investment-insight': 'professional',
  'client-success-story': 'professional',
  'community-spotlight': 'professional',
  'personal-value': 'professional',
  'success-story': 'professional',
  'general': 'professional',
};

// Intent-specific form fields for Personal/Professional domains
const INTENT_FIELDS: Record<string, FieldConfig[]> = {
  // ===== PERSONAL INTENTS =====
  'life-update': [
    { id: 'story', label: "What's your update?", placeholder: "I finally took a full weekend off for the first time in 2 years...", type: 'textarea', rows: 3, required: true },
  ],
  'milestone': [
    { id: 'milestone', label: "What milestone did you hit?", placeholder: "100 families helped find their dream home", type: 'input', required: true },
    { id: 'whyItMatters', label: "Why does it matter to you?", placeholder: "Every closing reminds me why I got into this business...", type: 'textarea', rows: 2 },
  ],
  'lesson-insight': [
    { id: 'lesson', label: "What did you learn?", placeholder: "The best deals often come from the listings no one else wants to show.", type: 'textarea', rows: 2, required: true },
    { id: 'takeaway', label: "Key takeaway for your audience", placeholder: "Don't skip the 'ugly' houses - that's where the opportunity hides.", type: 'textarea', rows: 2 },
  ],
  'behind-the-scenes': [
    { id: 'bts', label: "What happened behind the scenes?", placeholder: "Spent 3 hours staging a vacant property with furniture from my garage...", type: 'textarea', rows: 3, required: true },
  ],

  // ===== PROFESSIONAL INTENTS =====
  'market-update': [
    { id: 'headline', label: "Market headline", placeholder: "Inventory hits 6-month high in Phoenix Metro", type: 'input', required: true },
    { id: 'stats', label: "Key stats", placeholder: "Active listings up 23% YoY, median days on market now 34", type: 'textarea', rows: 2 },
    { id: 'soWhat', label: "Why it matters", placeholder: "Buyers finally have breathing room to negotiate", type: 'textarea', rows: 2 },
  ],
  'buyer-tips': [
    { id: 'tipTitle', label: "Tip title", placeholder: "Stop waiving inspections", type: 'input', required: true },
    { id: 'tip1', label: "Tip #1", placeholder: "I've seen 3 deals fall apart this month from hidden foundation issues.", type: 'textarea', rows: 2 },
    { id: 'tip2', label: "Tip #2 (optional)", placeholder: "The $500 inspection is the cheapest insurance you'll buy.", type: 'textarea', rows: 2 },
    { id: 'tip3', label: "Tip #3 (optional)", placeholder: "Always get a sewer scope in older homes.", type: 'textarea', rows: 2 },
  ],
  'seller-tips': [
    { id: 'tipTitle', label: "Tip title", placeholder: "Price it right the first week", type: 'input', required: true },
    { id: 'tip1', label: "Tip #1", placeholder: "Homes priced correctly sell 18 days faster.", type: 'textarea', rows: 2 },
    { id: 'tip2', label: "Tip #2 (optional)", placeholder: "Overpricing then reducing looks desperate to buyers.", type: 'textarea', rows: 2 },
    { id: 'tip3', label: "Tip #3 (optional)", placeholder: "First 2 weeks get 80% of your showings.", type: 'textarea', rows: 2 },
  ],
  'investment-insight': [
    { id: 'insight', label: "Investment insight", placeholder: "Multifamily under 4 units still qualifies for residential financing", type: 'textarea', rows: 2, required: true },
    { id: 'metric', label: "Key metric", placeholder: "3.2% average cap rate in suburban Phoenix vs 4.8% in Tucson", type: 'input' },
  ],
  'client-success-story': [
    { id: 'challenge', label: "Client's challenge", placeholder: "First-time buyers kept losing to cash offers", type: 'textarea', rows: 2, required: true },
    { id: 'solution', label: "How you helped", placeholder: "Connected them with a local lender who could close in 14 days", type: 'textarea', rows: 2 },
    { id: 'result', label: "The result", placeholder: "Won their dream home $5K under asking", type: 'input' },
  ],
  'community-spotlight': [
    { id: 'spotlight', label: "What/who are you featuring?", placeholder: "Mesa Farmers Market", type: 'input', required: true },
    { id: 'details', label: "Why they matter", placeholder: "Every Saturday 8am-noon. Fresh produce, live music, and the best breakfast tacos.", type: 'textarea', rows: 2 },
  ],

  // Legacy intents
  'personal-value': [
    { id: 'tipTitle', label: "Tip title", placeholder: "The one thing first-time buyers always forget", type: 'input', required: true },
    { id: 'tipBody', label: "Tip details", placeholder: "Budget for closing costs - they're usually 2-5% of the purchase price.", type: 'textarea', rows: 3 },
  ],
  'success-story': [
    { id: 'challenge', label: "Client's situation", placeholder: "They needed to sell and buy simultaneously", type: 'textarea', rows: 2, required: true },
    { id: 'result', label: "The outcome", placeholder: "Closed both on the same day, moved once", type: 'input' },
  ],
};

interface PostIntentSubstepProps {
  state: WizardState;
  updateState: (updates: Partial<WizardState>) => void;
  onNext: () => void;
}

export default function PostIntentSubstep({ state, updateState, onNext }: PostIntentSubstepProps) {
  const [isGeneratingFields, setIsGeneratingFields] = useState(false);
  const [rawContext, setRawContext] = useState('');
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});

  // Fetch dynamic agents from API (admins with profiles)
  const { data: dynamicAgents } = useAgents();
  const agents = dynamicAgents && dynamicAgents.length > 0 ? dynamicAgents : FALLBACK_AGENTS;

  const handleSelect = (intentId: PostIntent) => {
    updateState({ postIntent: intentId });
    // Reset field values when intent changes
    setFieldValues({});
  };

  // Intents that have matching image templates
  const templateLinkedIntents = ['just-listed', 'sold', 'open-house', 'personal-value', 'success-story'];

  // Get the domain for current intent
  const currentDomain = INTENT_DOMAINS[state.postIntent] || 'property';
  const isPersonalOrProfessional = currentDomain === 'personal' || currentDomain === 'professional';
  const intentFields = INTENT_FIELDS[state.postIntent] || [];

  // Build context string from field values
  const buildContextFromFields = useMemo(() => {
    if (!isPersonalOrProfessional || intentFields.length === 0) return state.postContext;

    const parts: string[] = [];
    for (const field of intentFields) {
      const value = fieldValues[field.id];
      if (value?.trim()) {
        parts.push(`${field.label}: ${value.trim()}`);
      }
    }
    return parts.join('\n');
  }, [fieldValues, intentFields, isPersonalOrProfessional, state.postContext]);

  // Update parent state when fields change
  const handleFieldChange = (fieldId: string, value: string) => {
    const newValues = { ...fieldValues, [fieldId]: value };
    setFieldValues(newValues);

    // Build context string from all fields
    const parts: string[] = [];
    for (const field of intentFields) {
      const fieldValue = newValues[field.id];
      if (fieldValue?.trim()) {
        parts.push(`${field.label}: ${fieldValue.trim()}`);
      }
    }
    updateState({ postContext: parts.join('\n') });
  };

  // AI autofill - generate field values from raw context
  const handleGenerateFields = async () => {
    if (!rawContext.trim()) return;

    setIsGeneratingFields(true);
    try {
      const response = await fetch('/api/ai?action=expand-context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawContext: rawContext.trim(),
          intent: state.postIntent,
          fields: intentFields.map(f => ({ id: f.id, label: f.label })),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.fields) {
          setFieldValues(data.fields);
          // Also update the context
          const parts: string[] = [];
          for (const field of intentFields) {
            const value = data.fields[field.id];
            if (value?.trim()) {
              parts.push(`${field.label}: ${value.trim()}`);
            }
          }
          updateState({ postContext: parts.join('\n') });
        }
      }
    } catch (error) {
      console.error('Error generating fields:', error);
    } finally {
      setIsGeneratingFields(false);
    }
  };

  // Check if form has required fields filled
  const hasRequiredFields = useMemo(() => {
    if (!isPersonalOrProfessional) return state.postContext.trim().length > 0;

    const requiredFields = intentFields.filter(f => f.required);
    return requiredFields.every(f => fieldValues[f.id]?.trim());
  }, [fieldValues, intentFields, isPersonalOrProfessional, state.postContext]);

  return (
    <div className="space-y-6">
      {/* Context Input - Property Domain */}
      {!isPersonalOrProfessional && (
        <div className="space-y-4">
          {/* AI Context Helper for Property Posts */}
          <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <Label className="text-sm font-medium text-primary">
                Context for AI
              </Label>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Type, paste, or use voice to describe the property. AI will use this to generate your caption.
            </p>
            <div className="flex gap-2">
              <Textarea
                placeholder="E.g., 'Just renovated 3bed/2bath, new kitchen with granite, near top-rated schools, motivated seller, great for first-time buyers'"
                value={rawContext}
                onChange={(e) => setRawContext(e.target.value)}
                rows={2}
                className="flex-1 resize-none text-sm"
              />
              <div className="flex flex-col gap-2 self-end">
                <VoiceInput
                  onTranscript={(text) => {
                    // Append transcribed text to existing context
                    setRawContext(prev => prev ? `${prev} ${text}` : text);
                  }}
                />
                <Button
                  onClick={() => {
                    if (rawContext.trim()) {
                      updateState({ postContext: rawContext.trim() });
                    }
                  }}
                  disabled={!rawContext.trim()}
                  className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <Sparkles className="h-4 w-4" />
                  Use This
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <Label htmlFor="postContext" className="text-base">
                  Property Highlights & Details <span className="text-red-500">*</span>
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  {state.selectedProperty?.socialMediaPropertyDescription
                    ? 'These details were auto-filled from your property. Edit if needed.'
                    : state.postContext
                      ? 'Using your custom context. Edit if needed.'
                      : 'Add context above or describe what makes this property special.'}
                </p>
              </div>
            </div>
            <Textarea
              id="postContext"
              placeholder="E.g., 'Beautifully renovated 3-bed with new kitchen, granite countertops, stainless appliances. Great neighborhood near top schools and shopping. Move-in ready!'"
              value={state.postContext}
              onChange={(e) => updateState({ postContext: e.target.value })}
              rows={4}
              className="resize-none"
            />
            <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900">
              <div className="text-blue-600 dark:text-blue-400 text-lg">💡</div>
              <div className="flex-1 text-xs text-blue-700 dark:text-blue-300">
                <p className="font-medium mb-1">This information is used in two ways:</p>
                <ul className="space-y-0.5 list-disc list-inside">
                  <li>AI incorporates these details into your caption text</li>
                  <li>Template image fields are auto-filled (for templates like "Value Tips" and "Open House")</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Caption Length Selector for Property Domain */}
          <div className="space-y-2">
            <Label className="text-base flex items-center gap-2">
              📏 Caption Length
            </Label>
            <div className="grid grid-cols-3 gap-3">
              {CAPTION_LENGTHS.map((length) => (
                <button
                  key={length.id}
                  type="button"
                  onClick={() => updateState({ captionLength: length.id })}
                  className={cn(
                    "flex flex-col items-center gap-1 px-4 py-3 rounded-lg border-2 transition-all text-center",
                    state.captionLength === length.id
                      ? "border-primary bg-primary/10"
                      : "border-muted hover:border-primary/30"
                  )}
                >
                  <span className="text-xl">{length.icon}</span>
                  <p className="font-medium text-sm">{length.label}</p>
                  <p className="text-xs text-muted-foreground">{length.wordCount}</p>
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {CAPTION_LENGTHS.find(l => l.id === state.captionLength)?.description}
            </p>
          </div>
        </div>
      )}

      {/* Intent-Specific Fields - Personal/Professional Domain */}
      {isPersonalOrProfessional && intentFields.length > 0 && (
        <div className="space-y-4">
          {/* Agent Selector */}
          <div className="space-y-2">
            <Label className="text-base flex items-center gap-2">
              <User className="h-4 w-4" />
              Who is posting?
            </Label>
            <div className="flex gap-3">
              {agents.map((agent) => (
                <button
                  key={agent.id}
                  type="button"
                  onClick={() => updateState({ selectedAgentId: agent.id })}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg border-2 transition-all",
                    state.selectedAgentId === agent.id
                      ? "border-primary bg-primary/10"
                      : "border-muted hover:border-primary/30"
                  )}
                >
                  <img
                    src={agent.headshot}
                    alt={agent.name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div className="text-left">
                    <p className="font-medium text-sm">{agent.name}</p>
                    <p className="text-xs text-muted-foreground">{agent.title}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Caption Length Selector */}
          <div className="space-y-2">
            <Label className="text-base flex items-center gap-2">
              📏 Caption Length
            </Label>
            <div className="grid grid-cols-3 gap-3">
              {CAPTION_LENGTHS.map((length) => (
                <button
                  key={length.id}
                  type="button"
                  onClick={() => updateState({ captionLength: length.id })}
                  className={cn(
                    "flex flex-col items-center gap-1 px-4 py-3 rounded-lg border-2 transition-all text-center",
                    state.captionLength === length.id
                      ? "border-primary bg-primary/10"
                      : "border-muted hover:border-primary/30"
                  )}
                >
                  <span className="text-xl">{length.icon}</span>
                  <p className="font-medium text-sm">{length.label}</p>
                  <p className="text-xs text-muted-foreground">{length.wordCount}</p>
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {CAPTION_LENGTHS.find(l => l.id === state.captionLength)?.description}
            </p>
          </div>

          {/* AI Autofill Section */}
          <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <Label className="text-sm font-medium text-primary">
                AI Context Helper
              </Label>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Type your idea or use voice input, then let AI fill in the fields below.
            </p>
            <div className="flex gap-2">
              <Textarea
                placeholder="E.g., 'Hit 100 families milestone today, feeling grateful for every closing'"
                value={rawContext}
                onChange={(e) => setRawContext(e.target.value)}
                rows={2}
                className="flex-1 resize-none text-sm"
              />
              <div className="flex flex-col gap-2 self-end">
                <VoiceInput
                  onTranscript={(text) => {
                    // Append transcribed text to existing context
                    setRawContext(prev => prev ? `${prev} ${text}` : text);
                  }}
                />
                <Button
                  onClick={handleGenerateFields}
                  disabled={!rawContext.trim() || isGeneratingFields}
                  className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {isGeneratingFields ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  Fill Fields
                </Button>
              </div>
            </div>
          </div>

          {/* Dynamic Form Fields */}
          <div className="space-y-3">
            <Label className="text-base">Post Details</Label>
            {intentFields.map((field) => (
              <div key={field.id} className="space-y-1">
                <Label htmlFor={field.id} className="text-sm">
                  {field.label} {field.required && <span className="text-red-500">*</span>}
                </Label>
                {field.type === 'input' ? (
                  <Input
                    id={field.id}
                    placeholder={field.placeholder}
                    value={fieldValues[field.id] || ''}
                    onChange={(e) => handleFieldChange(field.id, e.target.value)}
                  />
                ) : (
                  <Textarea
                    id={field.id}
                    placeholder={field.placeholder}
                    value={fieldValues[field.id] || ''}
                    onChange={(e) => handleFieldChange(field.id, e.target.value)}
                    rows={field.rows || 2}
                    className="resize-none"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 className="text-lg font-medium mb-1">What are you announcing?</h3>
        <p className="text-sm text-muted-foreground">
          Choose the purpose of your post. This determines the key message.
        </p>
      </div>

      {/* Intent Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {POST_INTENTS.map((intent) => {
          const hasTemplate = templateLinkedIntents.includes(intent.id);
          const isSelected = state.postIntent === intent.id;

          return (
            <Card
              key={intent.id}
              onClick={() => handleSelect(intent.id)}
              className={cn(
                "cursor-pointer transition-all hover:border-primary/40",
                hasTemplate && !isSelected && "bg-primary/5 border-primary/20",
                isSelected && "border-primary ring-2 ring-primary/20 bg-primary/10"
              )}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{intent.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{intent.label}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {intent.description}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Selected Intent Preview */}
      {state.postIntent && (
        <div className="bg-muted/30 rounded-lg p-4">
          <p className="text-sm text-muted-foreground mb-2">Selected intent:</p>
          <div className="flex items-center gap-2">
            <span className="text-xl">
              {POST_INTENTS.find(i => i.id === state.postIntent)?.icon}
            </span>
            <span className="font-medium">
              {POST_INTENTS.find(i => i.id === state.postIntent)?.label}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Keywords that will be included:{' '}
            <span className="text-primary">
              {POST_INTENTS.find(i => i.id === state.postIntent)?.keywords.slice(0, 3).join(', ')}
            </span>
          </p>
        </div>
      )}

      {/* Next Button */}
      <div className="flex justify-end">
        <Button
          onClick={onNext}
          disabled={!state.postIntent || !hasRequiredFields}
          className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
        >
          Next: Choose Tone
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
