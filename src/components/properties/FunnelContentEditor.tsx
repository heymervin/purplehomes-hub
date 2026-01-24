/**
 * Funnel Content Editor
 *
 * Admin component for generating and editing property funnel content.
 * Content is stored as markdown files and displayed on public property pages.
 */

import { useState, useEffect } from 'react';
import { Loader2, Wand2, Save, RefreshCw, FileText, AlertCircle, ChevronDown, ChevronUp, Settings2, Home, DollarSign, Bed, Bath, Ruler, Building2, MapPin, Users, CreditCard, Video, HelpCircle, FlaskConical, UserCircle, Star, Brain, TrendingUp, Copy, Check, Eye, Plus, Trash2, MessageSquareQuote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { generatePropertySlug } from '@/lib/utils/slug';
import { SegmentInsightsWidget } from './SegmentInsightsWidget';
import { FunnelPreviewModal } from './FunnelPreviewModal';
import type { Property } from '@/types';
import type { FunnelContent, FunnelInputs, BuyerSegment, Testimonial } from '@/types/funnel';
import { DEFAULT_FUNNEL_INPUTS, FINANCING_TYPE_OPTIONS, AVAILABILITY_STATUS_OPTIONS, BUYER_SEGMENT_OPTIONS } from '@/types/funnel';
import { cn } from '@/lib/utils';

// Word count guidelines per section
const WORD_LIMITS: Record<string, { recommended: number; warning: number; max: number }> = {
  hook: { recommended: 25, warning: 35, max: 50 },
  problem: { recommended: 60, warning: 90, max: 120 },
  solution: { recommended: 60, warning: 90, max: 120 },
  propertyShowcase: { recommended: 100, warning: 140, max: 180 },
  socialProof: { recommended: 50, warning: 80, max: 100 },
  callToAction: { recommended: 30, warning: 45, max: 60 },
};

// Helper to count words - safely handles non-string values
function countWords(text: string | unknown): number {
  if (typeof text !== 'string') return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

// Helper to get word count color
function getWordCountColor(count: number, limits: { recommended: number; warning: number; max: number }): string {
  if (count > limits.max) return 'text-red-500';
  if (count > limits.warning) return 'text-amber-500';
  return 'text-muted-foreground';
}

// Section card with copy button and word count
interface SectionCardProps {
  title: string;
  description: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  icon?: React.ReactNode;
  borderColor?: string;
  placeholder?: string;
  showWordCount?: boolean;
  sectionKey?: string;
  isTextarea?: boolean;
}

function SectionCard({
  title,
  description,
  value,
  onChange,
  rows = 3,
  icon,
  borderColor,
  placeholder,
  showWordCount = true,
  sectionKey,
  isTextarea = true,
}: SectionCardProps) {
  const [copied, setCopied] = useState(false);
  // Convert non-string values to string for display
  const stringValue = typeof value === 'string' ? value : (value ? JSON.stringify(value, null, 2) : '');
  const wordCount = countWords(stringValue);
  const limits = sectionKey ? WORD_LIMITS[sectionKey] : null;

  const handleCopy = async () => {
    if (!stringValue) return;
    try {
      await navigator.clipboard.writeText(stringValue);
      setCopied(true);
      toast.success('Copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  return (
    <Card className={borderColor}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {icon}
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
          </div>
          {stringValue && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2"
              onClick={handleCopy}
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-green-500" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </Button>
          )}
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {isTextarea ? (
          <Textarea
            value={stringValue}
            onChange={(e) => onChange(e.target.value)}
            rows={rows}
            className="resize-none"
            placeholder={placeholder}
          />
        ) : (
          <Input
            value={stringValue}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
          />
        )}
        {showWordCount && limits && (
          <div className={cn('text-xs mt-1.5 flex items-center justify-between', getWordCountColor(wordCount, limits))}>
            <span>{wordCount} words</span>
            <span className="text-muted-foreground">
              {wordCount <= limits.recommended ? 'Good length' :
               wordCount <= limits.warning ? 'Getting long' :
               wordCount <= limits.max ? 'Consider shortening' : 'Too long'}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface FunnelContentEditorProps {
  property: Property;
  onSaveStateChange?: (hasChanges: boolean, isSaving: boolean, onSave: () => void) => void;
}

export function FunnelContentEditor({ property, onSaveStateChange }: FunnelContentEditorProps) {
  const [content, setContent] = useState<FunnelContent | null>(null);
  const [inputs, setInputs] = useState<FunnelInputs>(DEFAULT_FUNNEL_INPUTS);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [inputsExpanded, setInputsExpanded] = useState(true);
  // Rating state for "Persist & Grow" system
  const [effectivenessRating, setEffectivenessRating] = useState<number | null>(null);
  const [isRating, setIsRating] = useState(false);
  const [showRatingSuccess, setShowRatingSuccess] = useState(false);
  // Preview modal state
  const [showPreview, setShowPreview] = useState(false);
  // Track where content is saved
  const [saveLocation, setSaveLocation] = useState<'airtable' | 'file' | 'unknown'>('unknown');
  // Global testimonials from Settings
  const [globalTestimonials, setGlobalTestimonials] = useState<Testimonial[]>([]);

  // Generate slug from property data
  const slug = generatePropertySlug(property.address, property.city);

  // Parse city into components (city field contains "City, ST ZIP")
  const cityParts = property.city.split(',').map(s => s.trim());
  const city = cityParts[0] || '';
  const stateZip = cityParts[1]?.split(' ') || [];
  const state = stateZip[0] || '';
  const zipCode = stateZip[1] || '';

  // Load existing content on mount
  useEffect(() => {
    loadContent();
  }, [slug, property.id]);

  // Load global testimonials from Settings
  useEffect(() => {
    const loadGlobalTestimonials = async () => {
      try {
        const response = await fetch('/api/testimonials');
        const data = await response.json();
        if (data.success && data.testimonials) {
          setGlobalTestimonials(data.testimonials);
        }
      } catch (error) {
        console.error('Error loading global testimonials:', error);
      }
    };
    loadGlobalTestimonials();
  }, []);

  // Notify parent about save state changes
  useEffect(() => {
    if (onSaveStateChange && content) {
      onSaveStateChange(hasChanges, isSaving, handleSave);
    }
  }, [hasChanges, isSaving, content, onSaveStateChange]);

  const loadContent = async () => {
    setIsLoading(true);
    try {
      // Include recordId for Airtable lookup
      const response = await fetch(`/api/funnel?action=get&slug=${slug}&recordId=${property.id}`);
      const data = await response.json();

      if (data.success && data.content) {
        setContent(data.content);
        // Load saved inputs if they exist, otherwise reset to defaults
        setInputs({ ...DEFAULT_FUNNEL_INPUTS, ...(data.content.inputs || {}) });
        // Track where content was loaded from
        setSaveLocation(data.source === 'airtable' ? 'airtable' : 'file');

        // Verify avatar research still exists and load effectiveness rating
        if (data.content.avatarResearchId) {
          try {
            const segment = data.content.inputs?.buyerSegment || 'first-time-buyer';
            const researchResponse = await fetch(`/api/funnel/avatar-research?action=get&segment=${segment}&researchId=${data.content.avatarResearchId}`);
            const researchData = await researchResponse.json();

            if (researchData.success && researchData.entry) {
              // Research exists - load effectiveness rating if available
              if (researchData.entry.effectiveness) {
                setEffectivenessRating(researchData.entry.effectiveness);
              }
            } else {
              // Research was deleted - clear the stale avatarResearchId
              console.log('[FunnelEditor] Avatar research not found, clearing stale ID');
              const cleanedContent = { ...data.content };
              delete cleanedContent.avatarResearchId;
              setContent(cleanedContent);
              setEffectivenessRating(null);
            }
          } catch (e) {
            console.warn('Could not verify avatar research:', e);
            // On error, clear the potentially stale ID
            const cleanedContent = { ...data.content };
            delete cleanedContent.avatarResearchId;
            setContent(cleanedContent);
            setEffectivenessRating(null);
          }
        }
      } else {
        // No content found - reset both content and inputs
        setContent(null);
        setInputs(DEFAULT_FUNNEL_INPUTS);
        setEffectivenessRating(null);
      }
    } catch (error) {
      console.error('Error loading funnel content:', error);
      setContent(null);
      setInputs(DEFAULT_FUNNEL_INPUTS);
      setEffectivenessRating(null);
    } finally {
      setIsLoading(false);
    }
  };

  const updateInput = (field: keyof FunnelInputs, value: string | boolean) => {
    setInputs(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleGenerate = async () => {
    console.log('[FunnelEditor] ====== REGENERATE CLICKED ======');
    console.log('[FunnelEditor] Property ID:', property.id);
    console.log('[FunnelEditor] Address:', property.address);
    console.log('[FunnelEditor] City:', city);
    console.log('[FunnelEditor] Inputs:', JSON.stringify(inputs, null, 2));

    setIsGenerating(true);
    try {
      const requestBody = {
        address: property.address,
        city,
        state,
        zipCode,
        price: property.price,
        downPayment: property.downPayment,
        monthlyPayment: property.monthlyPayment,
        beds: property.beds,
        baths: property.baths,
        sqft: property.sqft,
        propertyType: property.propertyType,
        condition: property.condition,
        description: property.description,
        inputs, // Include the user-editable inputs
        recordId: property.id, // Airtable record ID for persistence
      };
      console.log('[FunnelEditor] Calling /api/funnel?action=generate...');

      const response = await fetch('/api/funnel?action=generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      console.log('[FunnelEditor] Generate response status:', response.status);
      const data = await response.json();
      console.log('[FunnelEditor] Generate response:', {
        success: data.success,
        hasContent: !!data.content,
        avatarResearchId: data.content?.avatarResearchId || 'NOT SET',
        savedToFile: data.savedToFile,
        savedToAirtable: data.savedToAirtable,
      });

      if (data.success && data.content) {
        console.log('[FunnelEditor] Content avatarResearchId:', data.content.avatarResearchId || 'NOT SET');
        setContent(data.content);
        // Update inputs from generated content
        if (data.content.inputs) {
          setInputs(data.content.inputs);
        }
        // Track where content was saved
        setSaveLocation(data.savedToAirtable ? 'airtable' : (data.savedToFile ? 'file' : 'unknown'));
        // Reset rating - new content needs fresh rating
        setEffectivenessRating(null);
        setHasChanges(false);
        toast.success(`Funnel content generated and saved to ${data.savedToAirtable ? 'Airtable' : 'file'}!`);
        console.log('[FunnelEditor] ====== REGENERATE COMPLETE ======');
      } else {
        console.error('[FunnelEditor] Generate failed:', data);
        throw new Error(data.error || 'Failed to generate content');
      }
    } catch (error) {
      console.error('[FunnelEditor] ====== REGENERATE ERROR ======');
      console.error('[FunnelEditor] Error:', error);
      toast.error('Failed to generate content');
    } finally {
      setIsGenerating(false);
    }
  };

  // Generate avatar research separately (faster than full regeneration)
  const [isGeneratingResearch, setIsGeneratingResearch] = useState(false);

  const handleGenerateAvatarResearch = async () => {
    console.log('[FunnelEditor] ====== ENABLE AI LEARNING CLICKED ======');
    console.log('[FunnelEditor] Current content:', content ? { slug: content.propertySlug, hasResearchId: !!content.avatarResearchId } : 'NULL');
    console.log('[FunnelEditor] Property ID:', property.id);
    console.log('[FunnelEditor] Property type:', property.propertyType);
    console.log('[FunnelEditor] City:', city);
    console.log('[FunnelEditor] Price:', property.price);
    console.log('[FunnelEditor] Buyer segment:', inputs.buyerSegment || 'first-time-buyer');

    setIsGeneratingResearch(true);
    try {
      const requestBody = {
        buyerSegment: inputs.buyerSegment || 'first-time-buyer',
        propertyContext: {
          type: property.propertyType,
          city,
          priceRange: property.price ? `$${Math.floor(property.price / 50000) * 50}k-$${Math.ceil(property.price / 50000) * 50}k` : undefined,
        },
      };
      console.log('[FunnelEditor] Request body:', JSON.stringify(requestBody, null, 2));
      console.log('[FunnelEditor] Calling /api/funnel/avatar-research?action=generate...');

      const response = await fetch('/api/funnel/avatar-research?action=generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      console.log('[FunnelEditor] Response status:', response.status);
      console.log('[FunnelEditor] Response ok:', response.ok);

      const data = await response.json();
      console.log('[FunnelEditor] Response data:', JSON.stringify(data, null, 2));

      if (data.success && data.researchId) {
        console.log('[FunnelEditor] SUCCESS! Research ID:', data.researchId);
        console.log('[FunnelEditor] savedToAirtable:', data.savedToAirtable);

        // Update content with the new avatar research ID
        const updatedContent = { ...content!, avatarResearchId: data.researchId };
        console.log('[FunnelEditor] Updated content avatarResearchId:', updatedContent.avatarResearchId);
        setContent(updatedContent);

        // Save the updated content to Airtable
        console.log('[FunnelEditor] Saving updated content to funnel API...');
        const saveResponse = await fetch('/api/funnel?action=save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            slug,
            content: updatedContent,
            recordId: property.id,
          }),
        });
        const saveData = await saveResponse.json();
        console.log('[FunnelEditor] Save response:', JSON.stringify(saveData, null, 2));

        // Reset rating for new research - stars should be empty
        setEffectivenessRating(null);
        toast.success('AI Learning enabled! You can now rate this funnel.');
        console.log('[FunnelEditor] ====== COMPLETE SUCCESS ======');
      } else {
        console.error('[FunnelEditor] API returned failure:', data);
        throw new Error(data.error || 'Failed to generate avatar research');
      }
    } catch (error) {
      console.error('[FunnelEditor] ====== ERROR ======');
      console.error('[FunnelEditor] Error type:', (error as Error)?.name);
      console.error('[FunnelEditor] Error message:', (error as Error)?.message);
      console.error('[FunnelEditor] Full error:', error);
      toast.error('Failed to enable AI Learning');
    } finally {
      setIsGeneratingResearch(false);
      console.log('[FunnelEditor] ====== FINISHED ======');
    }
  };

  const handleSave = async () => {
    if (!content) return;

    setIsSaving(true);
    try {
      // Include current inputs in the content
      const contentToSave = { ...content, inputs };

      const response = await fetch('/api/funnel?action=save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          content: contentToSave,
          recordId: property.id, // Airtable record ID for persistence
        }),
      });

      const data = await response.json();

      if (data.success) {
        setContent(contentToSave);
        setHasChanges(false);
        const saveLocation = data.savedToAirtable ? 'Airtable' : (data.savedToFile ? 'file' : 'memory');
        toast.success(`Content saved to ${saveLocation}!`);
      } else {
        throw new Error(data.error || 'Failed to save content');
      }
    } catch (error) {
      console.error('Error saving funnel content:', error);
      toast.error('Failed to save content');
    } finally {
      setIsSaving(false);
    }
  };

  const updateField = (field: keyof FunnelContent, value: string) => {
    if (!content) return;
    setContent({ ...content, [field]: value });
    setHasChanges(true);
  };

  // Rate the avatar research effectiveness (Persist & Grow system)
  const handleRateEffectiveness = async (rating: number) => {
    if (!content?.avatarResearchId || !inputs.buyerSegment) {
      toast.error('No avatar research linked to this funnel');
      return;
    }

    setIsRating(true);
    try {
      const response = await fetch('/api/funnel/avatar-research?action=rate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          researchId: content.avatarResearchId,
          segment: inputs.buyerSegment,
          effectiveness: rating,
        }),
      });

      // ✅ IMPROVED ERROR HANDLING: Check HTTP status first
      if (!response.ok) {
        if (response.status === 404) {
          toast.error('Research entry not found. It may have been deleted.');
          return;
        }
        if (response.status === 500) {
          toast.error('Server error. Please try again later.');
          return;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success) {
        setEffectivenessRating(rating);
        setShowRatingSuccess(true);
        toast.success(`Rated ${rating}/10 - AI will learn from this!`);
        setTimeout(() => setShowRatingSuccess(false), 3000);
      } else {
        throw new Error(data.error || 'Failed to rate');
      }
    } catch (error) {
      console.error('Error rating effectiveness:', error);
      // Only show generic error if we haven't shown a specific one
      if (error instanceof TypeError && error.message.includes('fetch')) {
        toast.error('Network error. Check your connection and try again.');
      } else if (!(error instanceof Error && error.message.startsWith('HTTP'))) {
        toast.error('Failed to submit rating. Please try again.');
      }
    } finally {
      setIsRating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Funnel Content</h3>
          <p className="text-sm text-muted-foreground">
            AI-generated marketing content for the public property page
          </p>
        </div>
      </div>

      {/* Property Data from GHL/Airtable (Read-only) */}
      <Card className="bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-900/50 dark:to-slate-900/50">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Home className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <CardTitle className="text-sm font-medium">Property Data</CardTitle>
            <span className="text-xs text-muted-foreground ml-auto">(from GHL/Airtable)</span>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            {/* Address */}
            <div className="col-span-2 sm:col-span-4">
              <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                <Home className="h-3 w-3" />
                <span className="text-xs">Address</span>
              </div>
              <p className="font-medium truncate">{property.address}, {property.city}</p>
            </div>

            {/* Price */}
            <div>
              <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                <DollarSign className="h-3 w-3" />
                <span className="text-xs">Price</span>
              </div>
              <p className="font-medium text-green-600 dark:text-green-400">
                ${property.price.toLocaleString()}
              </p>
            </div>

            {/* Down Payment */}
            <div>
              <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                <DollarSign className="h-3 w-3" />
                <span className="text-xs">Down Payment</span>
              </div>
              <p className="font-medium">
                {property.downPayment ? `$${property.downPayment.toLocaleString()}` : '—'}
              </p>
            </div>

            {/* Monthly Payment */}
            <div>
              <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                <DollarSign className="h-3 w-3" />
                <span className="text-xs">Monthly</span>
              </div>
              <p className="font-medium">
                {property.monthlyPayment ? `$${property.monthlyPayment.toLocaleString()}/mo` : '—'}
              </p>
            </div>

            {/* Beds */}
            <div>
              <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                <Bed className="h-3 w-3" />
                <span className="text-xs">Beds</span>
              </div>
              <p className="font-medium">{property.beds}</p>
            </div>

            {/* Baths */}
            <div>
              <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                <Bath className="h-3 w-3" />
                <span className="text-xs">Baths</span>
              </div>
              <p className="font-medium">{property.baths}</p>
            </div>

            {/* Sqft */}
            <div>
              <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                <Ruler className="h-3 w-3" />
                <span className="text-xs">Sqft</span>
              </div>
              <p className="font-medium">
                {property.sqft ? property.sqft.toLocaleString() : '—'}
              </p>
            </div>

            {/* Property Type */}
            <div>
              <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                <Building2 className="h-3 w-3" />
                <span className="text-xs">Type</span>
              </div>
              <p className="font-medium">{property.propertyType || 'Single Family'}</p>
            </div>

            {/* Condition */}
            <div>
              <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                <Building2 className="h-3 w-3" />
                <span className="text-xs">Condition</span>
              </div>
              <p className="font-medium">{property.condition || '—'}</p>
            </div>
          </div>

          {/* Description if exists */}
          {property.description && (
            <div className="mt-4 pt-3 border-t dark:border-gray-700">
              <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                <FileText className="h-3 w-3" />
                <span className="text-xs">Description</span>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2">{property.description}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Generation Inputs - Always visible */}
      <Collapsible open={inputsExpanded} onOpenChange={setInputsExpanded}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Settings2 className="h-4 w-4 text-purple-600" />
                  <CardTitle className="text-sm font-medium">AI Generation Inputs</CardTitle>
                </div>
                {inputsExpanded ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              <CardDescription>Configure these fields before generating content</CardDescription>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4 pt-0">
              {/* Buyer Avatar Selection - Key v2.0 feature */}
              <div className="p-3 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="buyerSegment" className="flex items-center gap-2">
                      <UserCircle className="h-4 w-4 text-purple-600" />
                      <span>Target Buyer Avatar</span>
                      <span className="text-xs text-purple-600 font-medium">NEW</span>
                    </Label>
                    <Select
                      value={inputs.buyerSegment || 'first-time-buyer'}
                      onValueChange={(v) => updateInput('buyerSegment', v)}
                    >
                      <SelectTrigger id="buyerSegment">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {BUYER_SEGMENT_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            <div className="flex flex-col">
                              <span>{opt.label}</span>
                              <span className="text-xs text-muted-foreground">{opt.description}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      AI uses 27-Word Persuasion framework to target their dreams, fears, and objections
                    </p>
                  </div>

                  {/* Avatar Description - Custom persona details */}
                  <div className="space-y-2">
                    <Label htmlFor="avatarDescription" className="text-sm">
                      Avatar Description <span className="text-muted-foreground">(optional)</span>
                    </Label>
                    <Textarea
                      id="avatarDescription"
                      value={inputs.avatarDescription || ''}
                      onChange={(e) => updateInput('avatarDescription', e.target.value)}
                      placeholder="e.g., Single mom working two jobs, tired of apartment noise keeping kids up at night. Dreams of a quiet backyard where they can play safely."
                      className="min-h-[80px] text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      Describe your ideal buyer's situation, fears, and dreams. This enriches Problem Agitation and Solution copy.
                    </p>
                  </div>

                  {/* Segment Insights Widget - Shows learned patterns */}
                  <SegmentInsightsWidget
                    segment={(inputs.buyerSegment || 'first-time-buyer') as BuyerSegment}
                    className="mt-3"
                  />

                  <div className="flex items-center justify-between pt-2 border-t border-purple-200 dark:border-purple-700">
                    <div className="flex items-center gap-2">
                      <FlaskConical className="h-4 w-4 text-purple-600" />
                      <Label htmlFor="generateVariants" className="text-sm cursor-pointer">
                        Generate A/B Test Variants
                      </Label>
                    </div>
                    <Switch
                      id="generateVariants"
                      checked={inputs.generateVariants || false}
                      onCheckedChange={(checked) => updateInput('generateVariants', checked)}
                    />
                  </div>
                </div>
              </div>

              {/* Financing Details */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="financingType">Financing Type</Label>
                  <Select value={inputs.financingType} onValueChange={(v) => updateInput('financingType', v)}>
                    <SelectTrigger id="financingType">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FINANCING_TYPE_OPTIONS.map((opt) => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="termLength">Term Length</Label>
                  <Input
                    id="termLength"
                    value={inputs.termLength}
                    onChange={(e) => updateInput('termLength', e.target.value)}
                    placeholder="30 years"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="interestRate">Interest Rate (optional)</Label>
                  <Input
                    id="interestRate"
                    value={inputs.interestRate}
                    onChange={(e) => updateInput('interestRate', e.target.value)}
                    placeholder="e.g., 8%"
                  />
                </div>
              </div>

              {/* Urgency & Scarcity */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="availabilityStatus">Availability Status</Label>
                  <Select value={inputs.availabilityStatus} onValueChange={(v) => updateInput('availabilityStatus', v)}>
                    <SelectTrigger id="availabilityStatus">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AVAILABILITY_STATUS_OPTIONS.map((opt) => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="urgencyMessage">Urgency Message (optional)</Label>
                  <Input
                    id="urgencyMessage"
                    value={inputs.urgencyMessage}
                    onChange={(e) => updateInput('urgencyMessage', e.target.value)}
                    placeholder="e.g., Only 2 viewing slots left this week!"
                  />
                  <p className="text-xs text-muted-foreground">Custom scarcity text for funnel copy</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="specialOffer">Special Offer (optional)</Label>
                <Input
                  id="specialOffer"
                  value={inputs.specialOffer}
                  onChange={(e) => updateInput('specialOffer', e.target.value)}
                  placeholder="e.g., $1,000 off closing costs"
                />
              </div>

              {/* Lifestyle/Emotional */}
              <div className="space-y-2">
                <Label htmlFor="neighborhoodHighlights">Neighborhood Highlights (optional)</Label>
                <Textarea
                  id="neighborhoodHighlights"
                  value={inputs.neighborhoodHighlights}
                  onChange={(e) => updateInput('neighborhoodHighlights', e.target.value)}
                  placeholder="Great schools nearby, walking distance to parks, 10 min to downtown..."
                  rows={2}
                  className="resize-none"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="idealBuyerProfile">Ideal Buyer Profile (optional)</Label>
                <Input
                  id="idealBuyerProfile"
                  value={inputs.idealBuyerProfile}
                  onChange={(e) => updateInput('idealBuyerProfile', e.target.value)}
                  placeholder="e.g., Perfect for first-time homebuyers, growing families..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="uniqueFeatures">Unique Features (optional)</Label>
                <Textarea
                  id="uniqueFeatures"
                  value={inputs.uniqueFeatures}
                  onChange={(e) => updateInput('uniqueFeatures', e.target.value)}
                  placeholder="Large backyard, recently renovated kitchen, new roof..."
                  rows={2}
                  className="resize-none"
                />
              </div>

              {/* Divider */}
              <div className="border-t pt-4 mt-4">
                <p className="text-xs text-muted-foreground mb-3 font-medium">Optional Section Inputs</p>
              </div>

              {/* Nearby Places */}
              <div className="space-y-2">
                <Label htmlFor="nearbyPlaces" className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-blue-500" />
                  Nearby Places (optional)
                </Label>
                <Textarea
                  id="nearbyPlaces"
                  value={inputs.nearbyPlaces || ''}
                  onChange={(e) => updateInput('nearbyPlaces', e.target.value)}
                  placeholder="Walmart - 5 min, Jefferson Parish Schools - 3 min, Lakeside Mall - 10 min..."
                  rows={2}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">Used for Location & Nearby section</p>
              </div>

              {/* Payment Notes */}
              <div className="space-y-2">
                <Label htmlFor="paymentNotes" className="flex items-center gap-1.5">
                  <CreditCard className="h-3.5 w-3.5 text-green-500" />
                  Payment Notes (optional)
                </Label>
                <Textarea
                  id="paymentNotes"
                  value={inputs.paymentNotes || ''}
                  onChange={(e) => updateInput('paymentNotes', e.target.value)}
                  placeholder="Includes taxes and insurance, flexible down payment options available..."
                  rows={2}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">Additional info for Pricing section</p>
              </div>

              {/* Virtual Tour URL */}
              <div className="space-y-2">
                <Label htmlFor="virtualTourUrl" className="flex items-center gap-1.5">
                  <Video className="h-3.5 w-3.5 text-red-500" />
                  Virtual Tour URL (optional)
                </Label>
                <Input
                  id="virtualTourUrl"
                  value={inputs.virtualTourUrl || ''}
                  onChange={(e) => updateInput('virtualTourUrl', e.target.value)}
                  placeholder="https://youtube.com/watch?v=... or https://my.matterport.com/..."
                />
                <p className="text-xs text-muted-foreground">YouTube, Vimeo, or Matterport embed URL</p>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Empty State */}
      {!content && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h4 className="font-medium mb-2">No Content Generated</h4>
            <p className="text-sm text-muted-foreground mb-4 max-w-md">
              Fill in the inputs above, then click "Generate Content" to create AI-powered marketing copy.
            </p>
            <Button onClick={handleGenerate} disabled={isGenerating}>
              {isGenerating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Wand2 className="h-4 w-4 mr-2" />}
              Generate Content
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Content Editor */}
      {content && (
        <div className="space-y-4">
          {/* Info Alert */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Content saved to{' '}
              {saveLocation === 'airtable' ? (
                <span className="text-green-600 dark:text-green-400 font-medium">Airtable ✓</span>
              ) : saveLocation === 'file' ? (
                <code className="text-xs bg-muted px-1 py-0.5 rounded">/content/properties/{slug}.md</code>
              ) : (
                <span className="text-yellow-600 dark:text-yellow-400">unknown</span>
              )}
              <br />
              <span className="text-muted-foreground">Last generated: {new Date(content.generatedAt).toLocaleString()}</span>
            </AlertDescription>
          </Alert>

          {/* Hook */}
          <SectionCard
            title="Hook"
            description="Attention-grabbing headline (AIDA: Attention)"
            value={content.hook}
            onChange={(v) => updateField('hook', v)}
            rows={2}
            sectionKey="hook"
          />

          {/* Problem */}
          <SectionCard
            title="Problem"
            description="Pain points of traditional home buying (PAS: Problem)"
            value={content.problem}
            onChange={(v) => updateField('problem', v)}
            rows={3}
            sectionKey="problem"
          />

          {/* Solution */}
          <SectionCard
            title="Solution"
            description="Purple Homes creative financing solution (PAS: Solution)"
            value={content.solution}
            onChange={(v) => updateField('solution', v)}
            rows={3}
            sectionKey="solution"
          />

          {/* Property Showcase */}
          <SectionCard
            title="Property Showcase"
            description="Property description and features (AIDA: Interest/Desire)"
            value={content.propertyShowcase}
            onChange={(v) => updateField('propertyShowcase', v)}
            rows={4}
            sectionKey="propertyShowcase"
          />

          {/* Testimonials - User Managed */}
          <Card className="border-purple-200 dark:border-purple-800">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquareQuote className="h-4 w-4 text-purple-600" />
                  <CardTitle className="text-sm font-medium">Testimonials</CardTitle>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newTestimonial: Testimonial = {
                      quote: '',
                      authorName: '',
                      authorTitle: 'Purple Homes Homeowner',
                      rating: 5,
                    };
                    const updated = [...(content.testimonials || []), newTestimonial];
                    setContent({ ...content, testimonials: updated });
                    setHasChanges(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Property-Specific
                </Button>
              </div>
              <CardDescription>
                Global testimonials from Settings are used automatically. Add property-specific ones to override.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Global Testimonials from Settings - Read-only display */}
              {globalTestimonials.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground">From Settings ({globalTestimonials.length} testimonials)</Label>
                    <a href="/settings" className="text-xs text-purple-600 hover:underline">Manage in Settings →</a>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {globalTestimonials.map((t, i) => (
                      <div
                        key={i}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700 rounded-full text-sm"
                        title={t.quote}
                      >
                        <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                        <span className="font-medium text-purple-700 dark:text-purple-300 max-w-[150px] truncate">
                          {t.authorName}
                        </span>
                      </div>
                    ))}
                  </div>
                  {(!content.testimonials || content.testimonials.length === 0) && (
                    <p className="text-xs text-muted-foreground">
                      These will be shown on the funnel page. Add property-specific testimonials below to override.
                    </p>
                  )}
                </div>
              )}

              {/* Property-specific testimonials */}
              {(!content.testimonials || content.testimonials.length === 0) ? (
                globalTestimonials.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground border-2 border-dashed rounded-lg">
                    <MessageSquareQuote className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No testimonials configured</p>
                    <p className="text-xs">Add testimonials in Settings or add a property-specific one here</p>
                  </div>
                ) : null
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground">Property-Specific ({content.testimonials?.length || 0})</Label>
                    <span className="text-xs bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded font-medium">
                      OVERRIDES GLOBAL
                    </span>
                  </div>
                  {content.testimonials.map((testimonial, index) => (
                  <div key={index} className="relative border rounded-lg p-4 bg-muted/30">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute top-2 right-2 h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-100"
                      onClick={() => {
                        const updated = content.testimonials!.filter((_, i) => i !== index);
                        setContent({ ...content, testimonials: updated });
                        setHasChanges(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>

                    <div className="space-y-3 pr-10">
                      {/* Quote */}
                      <div className="space-y-1">
                        <Label className="text-xs">Quote</Label>
                        <Textarea
                          value={testimonial.quote}
                          onChange={(e) => {
                            const updated = [...content.testimonials!];
                            updated[index] = { ...updated[index], quote: e.target.value };
                            setContent({ ...content, testimonials: updated });
                            setHasChanges(true);
                          }}
                          placeholder="I was rejected by three banks, but Purple Homes helped me..."
                          rows={2}
                          className="resize-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        {/* Author Name */}
                        <div className="space-y-1">
                          <Label className="text-xs">Name</Label>
                          <Input
                            value={testimonial.authorName}
                            onChange={(e) => {
                              const updated = [...content.testimonials!];
                              updated[index] = { ...updated[index], authorName: e.target.value };
                              setContent({ ...content, testimonials: updated });
                              setHasChanges(true);
                            }}
                            placeholder="Sarah L."
                          />
                        </div>

                        {/* Author Title */}
                        <div className="space-y-1">
                          <Label className="text-xs">Title (optional)</Label>
                          <Input
                            value={testimonial.authorTitle || ''}
                            onChange={(e) => {
                              const updated = [...content.testimonials!];
                              updated[index] = { ...updated[index], authorTitle: e.target.value };
                              setContent({ ...content, testimonials: updated });
                              setHasChanges(true);
                            }}
                            placeholder="Proud Homeowner"
                          />
                        </div>
                      </div>

                      {/* Rating */}
                      <div className="space-y-1">
                        <Label className="text-xs">Rating</Label>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => {
                                const updated = [...content.testimonials!];
                                updated[index] = { ...updated[index], rating: star };
                                setContent({ ...content, testimonials: updated });
                                setHasChanges(true);
                              }}
                              className={`p-0.5 ${
                                (testimonial.rating || 5) >= star
                                  ? 'text-yellow-500'
                                  : 'text-gray-300 hover:text-yellow-400'
                              }`}
                            >
                              <Star className={`h-5 w-5 ${(testimonial.rating || 5) >= star ? 'fill-current' : ''}`} />
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Call to Action */}
          <SectionCard
            title="Call to Action"
            description="Compelling CTA with urgency (AIDA: Action)"
            value={content.callToAction}
            onChange={(v) => updateField('callToAction', v)}
            rows={2}
            sectionKey="callToAction"
          />

          {/* A/B Test Variants (if generated) */}
          {(content.hookVariantB || content.ctaVariantB) && (
            <>
              <div className="border-t pt-6 mt-6">
                <div className="flex items-center gap-2 mb-4">
                  <FlaskConical className="h-4 w-4 text-purple-500" />
                  <h4 className="text-sm font-medium text-muted-foreground">A/B Test Variants</h4>
                </div>
              </div>

              {content.hookVariantB && (
                <Card className="border-purple-200 dark:border-purple-800">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-0.5 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded font-medium">VARIANT B</span>
                      <CardTitle className="text-sm font-medium">Hook Alternative</CardTitle>
                    </div>
                    <CardDescription>Alternative hook for A/B testing</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      value={content.hookVariantB}
                      onChange={(e) => updateField('hookVariantB', e.target.value)}
                      rows={2}
                      className="resize-none"
                    />
                  </CardContent>
                </Card>
              )}

              {content.ctaVariantB && (
                <Card className="border-purple-200 dark:border-purple-800">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-0.5 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded font-medium">VARIANT B</span>
                      <CardTitle className="text-sm font-medium">CTA Alternative</CardTitle>
                    </div>
                    <CardDescription>Alternative call-to-action for A/B testing</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      value={content.ctaVariantB}
                      onChange={(e) => updateField('ctaVariantB', e.target.value)}
                      rows={2}
                      className="resize-none"
                    />
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* Optional Sections - Collapsible */}
          <Collapsible defaultOpen={!!(content.locationNearby || content.qualifier || content.pricingOptions || content.virtualTourUrl || content.faq)}>
            <div className="border-t pt-6 mt-6">
              <CollapsibleTrigger className="flex items-center justify-between w-full text-left">
                <h4 className="text-sm font-medium text-muted-foreground">Optional Sections</h4>
                <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
              </CollapsibleTrigger>
            </div>
            <CollapsibleContent className="space-y-4 mt-4">
              {/* Location & Nearby */}
              <SectionCard
                title="Location & Nearby"
                description="Nearby amenities, schools, shopping, and transportation"
                value={content.locationNearby || ''}
                onChange={(v) => updateField('locationNearby', v)}
                rows={4}
                icon={<MapPin className="h-4 w-4 text-blue-500" />}
                borderColor="border-blue-200 dark:border-blue-800"
                placeholder="• Walmart Supercenter - 5 min drive&#10;• Jefferson Parish Schools - 3 min&#10;• Lakeside Shopping Center - 10 min..."
                showWordCount={false}
              />

              {/* Qualifier */}
              <SectionCard
                title="Qualifier"
                description="&quot;This home is perfect for you if...&quot; - helps buyers self-select"
                value={content.qualifier || ''}
                onChange={(v) => updateField('qualifier', v)}
                rows={4}
                icon={<Users className="h-4 w-4 text-purple-500" />}
                borderColor="border-purple-200 dark:border-purple-800"
                placeholder="• You're a first-time homebuyer tired of renting&#10;• You have good income but credit challenges&#10;• You want to build equity instead of paying a landlord..."
                showWordCount={false}
              />

              {/* Pricing Options */}
              <SectionCard
                title="Pricing Options"
                description="Payment breakdown with financing details"
                value={content.pricingOptions || ''}
                onChange={(v) => updateField('pricingOptions', v)}
                rows={5}
                icon={<CreditCard className="h-4 w-4 text-green-500" />}
                borderColor="border-green-200 dark:border-green-800"
                placeholder="Total Price: $XXX,XXX&#10;Down Payment: $X,XXX&#10;Monthly Payment: $X,XXX/mo&#10;Financing: Owner Finance&#10;Term: 30 years"
                showWordCount={false}
              />

              {/* Virtual Tour */}
              <Card className="border-red-200 dark:border-red-800">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Video className="h-4 w-4 text-red-500" />
                    <CardTitle className="text-sm font-medium">Virtual Tour</CardTitle>
                  </div>
                  <CardDescription>Video walkthrough or 360° tour embed URL</CardDescription>
                </CardHeader>
                <CardContent>
                  <Input
                    value={content.virtualTourUrl || ''}
                    onChange={(e) => updateField('virtualTourUrl', e.target.value)}
                    placeholder="https://youtube.com/watch?v=... or https://my.matterport.com/..."
                  />
                  {content.virtualTourUrl && (
                    <p className="text-xs text-muted-foreground mt-2">
                      This URL will be embedded as a video/iframe on the public page
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* FAQ */}
              <SectionCard
                title="FAQ"
                description="Frequently asked questions about this property and financing"
                value={content.faq || ''}
                onChange={(v) => updateField('faq', v)}
                rows={8}
                icon={<HelpCircle className="h-4 w-4 text-amber-500" />}
                borderColor="border-amber-200 dark:border-amber-800"
                placeholder="Q: What is owner financing?&#10;A: Owner financing allows you to buy directly from us without needing a bank loan...&#10;&#10;Q: Do I need perfect credit?&#10;A: No! We work with buyers who have credit challenges..."
                showWordCount={false}
              />
            </CollapsibleContent>
          </Collapsible>

          {/* Effectiveness Rating - Persist & Grow System */}
          <Card className="border-emerald-200 dark:border-emerald-800 bg-gradient-to-r from-emerald-50/50 to-teal-50/50 dark:from-emerald-900/20 dark:to-teal-900/20">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-emerald-600" />
                <CardTitle className="text-sm font-medium">Rate This Funnel</CardTitle>
                <span className="text-xs bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded font-medium">
                  AI LEARNING
                </span>
              </div>
              <CardDescription>
                Rate the effectiveness of this generated content. Your feedback helps AI improve future funnels.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {content.avatarResearchId ? (
                <div className="space-y-4">
                  {/* Instructions */}
                  <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      <strong>How does this copy resonate with your target buyer?</strong>
                      <br />
                      <span className="text-blue-600 dark:text-blue-300">
                        Click a star to rate from 1 (poor) to 10 (excellent). High ratings (7+) help the AI learn what works best for this buyer segment.
                      </span>
                    </p>
                  </div>

                  {/* Star Rating */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Poor match</span>
                      <span>Excellent match</span>
                    </div>
                    <div className="flex items-center gap-1 justify-center">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => (
                        <button
                          key={star}
                          onClick={() => handleRateEffectiveness(star)}
                          disabled={isRating}
                          title={`Rate ${star}/10${star >= 7 ? ' - Contributes to AI learning' : ''}`}
                          className={`p-1.5 rounded-lg transition-all ${
                            effectivenessRating && star <= effectivenessRating
                              ? star >= 7 ? 'text-emerald-500' : 'text-yellow-500'
                              : 'text-gray-300 dark:text-gray-600 hover:text-yellow-400'
                          } ${isRating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-110'}`}
                        >
                          <Star className={`h-6 w-6 ${effectivenessRating && star <= effectivenessRating ? 'fill-current' : ''}`} />
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      {effectivenessRating && (
                        <span className={`text-lg font-bold ${effectivenessRating >= 7 ? 'text-emerald-600' : 'text-yellow-600'}`}>
                          {effectivenessRating}/10
                        </span>
                      )}
                      {isRating && <Loader2 className="h-4 w-4 animate-spin" />}
                    </div>
                  </div>

                  {/* Success Message */}
                  {showRatingSuccess && (
                    <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 p-3 rounded-lg">
                      <TrendingUp className="h-4 w-4" />
                      <span>Rating saved! This feedback will improve future funnel generation for this buyer segment.</span>
                    </div>
                  )}

                  {/* Info */}
                  <p className="text-xs text-muted-foreground text-center">
                    Research ID: <code className="bg-muted px-1 rounded">{content.avatarResearchId.slice(0, 8)}...</code>
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Enable AI learning to rate this funnel and improve future generations.
                  </p>
                  <Button
                    onClick={handleGenerateAvatarResearch}
                    disabled={isGeneratingResearch}
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    {isGeneratingResearch ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Brain className="h-4 w-4 mr-2" />
                    )}
                    Enable AI Learning
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Regenerate & Preview */}
          <div className="flex items-center justify-between pt-4">
            <Button onClick={handleGenerate} disabled={isGenerating} variant="outline">
              {isGenerating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Regenerate All
            </Button>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setShowPreview(true)}>
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </Button>
              <Button variant="outline" asChild>
                <a href={`/listing/${slug}`} target="_blank" rel="noopener noreferrer">
                  Open Public Page
                </a>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      <FunnelPreviewModal
        open={showPreview}
        onOpenChange={setShowPreview}
        content={content}
        publicUrl={`/listing/${slug}`}
      />
    </div>
  );
}
