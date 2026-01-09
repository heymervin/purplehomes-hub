/**
 * SavePresetModal
 *
 * Modal to save current wizard settings as a reusable preset.
 */

import { useState, useEffect } from 'react';
import { Save, Star } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import type { PresetInput } from '@/lib/presets/types';
import type {
  PostIntent,
  CaptionTone,
  Platform,
} from '@/components/social/create-wizard/types';
import {
  POST_INTENTS,
  TONE_PRESETS,
} from '@/components/social/create-wizard/types';
import {
  PRESET_NAME_MIN_LENGTH,
  PRESET_NAME_MAX_LENGTH,
} from '@/lib/presets/constants';

interface SavePresetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentValues: {
    postIntent: PostIntent;
    tone: CaptionTone;
    hashtags: string[];
    templateId: string | null;
    platforms: Platform[];
  };
  onSave: (input: PresetInput) => void;
}

export function SavePresetModal({
  open,
  onOpenChange,
  currentValues,
  onSave,
}: SavePresetModalProps) {
  const [name, setName] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [error, setError] = useState('');

  // Get labels for display
  const intentLabel =
    POST_INTENTS.find((i) => i.id === currentValues.postIntent)?.label ||
    currentValues.postIntent;
  const toneLabel =
    TONE_PRESETS.find((t) => t.id === currentValues.tone)?.label ||
    currentValues.tone;

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      // Suggest a name based on current values
      setName(`${intentLabel} - ${toneLabel}`);
      setIsDefault(false);
      setError('');
    }
  }, [open, intentLabel, toneLabel]);

  // Validate and save
  const handleSave = () => {
    const trimmedName = name.trim();

    if (trimmedName.length < PRESET_NAME_MIN_LENGTH) {
      setError(`Name must be at least ${PRESET_NAME_MIN_LENGTH} characters`);
      return;
    }

    if (trimmedName.length > PRESET_NAME_MAX_LENGTH) {
      setError(`Name must be less than ${PRESET_NAME_MAX_LENGTH} characters`);
      return;
    }

    onSave({
      name: trimmedName,
      postIntent: currentValues.postIntent,
      tone: currentValues.tone,
      hashtags: currentValues.hashtags,
      templateId: currentValues.templateId,
      platforms: currentValues.platforms,
      isDefault,
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Save className="h-5 w-5" />
            Save Preset
          </DialogTitle>
          <DialogDescription>
            Save your current settings as a reusable preset
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Preset Name */}
          <div className="space-y-2">
            <Label htmlFor="preset-name">Preset Name</Label>
            <Input
              id="preset-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError('');
              }}
              placeholder="e.g., Standard Just Listed"
              maxLength={PRESET_NAME_MAX_LENGTH}
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>

          {/* Settings Preview */}
          <div className="space-y-2">
            <Label>Settings to Save</Label>
            <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Post Intent</span>
                <Badge variant="secondary">{intentLabel}</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Tone</span>
                <Badge variant="secondary">{toneLabel}</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Hashtags</span>
                <Badge variant="secondary">
                  {currentValues.hashtags.length} tags
                </Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Platforms</span>
                <Badge variant="secondary">
                  {currentValues.platforms.join(', ') || 'None'}
                </Badge>
              </div>
              {currentValues.templateId && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Template</span>
                  <Badge variant="secondary">Selected</Badge>
                </div>
              )}
            </div>
          </div>

          {/* Set as Default */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="set-default"
              checked={isDefault}
              onCheckedChange={(checked) => setIsDefault(!!checked)}
            />
            <Label
              htmlFor="set-default"
              className="flex items-center gap-2 cursor-pointer"
            >
              <Star className="h-4 w-4 text-yellow-500" />
              Set as default preset
            </Label>
          </div>
          <p className="text-xs text-muted-foreground ml-6">
            Default preset will be suggested when creating new posts
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!name.trim()}>
            <Save className="h-4 w-4 mr-2" />
            Save Preset
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
