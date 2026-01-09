/**
 * PresetSelector
 *
 * Dropdown to select and apply presets, with options to save and manage.
 */

import { useState } from 'react';
import { ChevronDown, Star, Plus, Settings, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { usePresets } from '@/hooks/usePresets';
import { SavePresetModal } from './SavePresetModal';
import { ManagePresetsModal } from './ManagePresetsModal';
import type { Preset, PresetInput } from '@/lib/presets/types';
import type {
  PostIntent,
  CaptionTone,
  Platform,
} from '@/components/social/create-wizard/types';

interface PresetSelectorProps {
  // Current values (to save as preset)
  currentValues: {
    postIntent: PostIntent;
    tone: CaptionTone;
    hashtags: string[];
    templateId: string | null;
    platforms: Platform[];
  };

  // Callback when preset is applied
  onApply: (preset: Preset) => void;

  // Optional: currently selected preset ID
  selectedPresetId?: string | null;

  // Optional: compact mode for smaller spaces
  compact?: boolean;
}

export function PresetSelector({
  currentValues,
  onApply,
  selectedPresetId,
  compact = false,
}: PresetSelectorProps) {
  const { presets, createPreset, incrementUsage, isLoaded } = usePresets();

  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [manageModalOpen, setManageModalOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Get selected preset
  const selectedPreset = selectedPresetId
    ? presets.find((p) => p.id === selectedPresetId)
    : null;

  // Handle preset selection
  const handleSelect = (preset: Preset) => {
    incrementUsage(preset.id);
    onApply(preset);
    setDropdownOpen(false);
  };

  // Handle save preset
  const handleSave = (input: PresetInput) => {
    createPreset(input);
    setSaveModalOpen(false);
  };

  // Sort presets: default first, then by usage count
  const sortedPresets = [...presets].sort((a, b) => {
    if (a.isDefault && !b.isDefault) return -1;
    if (!a.isDefault && b.isDefault) return 1;
    return b.usageCount - a.usageCount;
  });

  if (!isLoaded) {
    return (
      <Button
        variant="outline"
        disabled
        className={cn(compact ? 'h-8' : 'h-10')}
      >
        Loading presets...
      </Button>
    );
  }

  return (
    <>
      <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              'justify-between gap-2',
              compact ? 'h-8 text-sm' : 'h-10',
              selectedPreset &&
                'border-purple-300 bg-purple-50 dark:bg-purple-950/20'
            )}
          >
            <div className="flex items-center gap-2">
              <Sparkles
                className={cn(
                  'text-purple-500',
                  compact ? 'h-3 w-3' : 'h-4 w-4'
                )}
              />
              <span className="truncate max-w-[150px]">
                {selectedPreset ? selectedPreset.name : 'Load Preset'}
              </span>
            </div>
            <ChevronDown
              className={cn(compact ? 'h-3 w-3' : 'h-4 w-4', 'opacity-50')}
            />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start" className="w-[280px]">
          <DropdownMenuLabel className="flex items-center justify-between">
            <span>Saved Presets</span>
            <Badge variant="secondary" className="text-xs">
              {presets.length} saved
            </Badge>
          </DropdownMenuLabel>

          <DropdownMenuSeparator />

          {/* Preset List */}
          {sortedPresets.length > 0 ? (
            <div className="max-h-[300px] overflow-y-auto">
              {sortedPresets.map((preset) => (
                <DropdownMenuItem
                  key={preset.id}
                  onClick={() => handleSelect(preset)}
                  className={cn(
                    'flex items-center gap-2 cursor-pointer',
                    selectedPresetId === preset.id &&
                      'bg-purple-50 dark:bg-purple-950/20'
                  )}
                >
                  {preset.isDefault && (
                    <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{preset.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {preset.postIntent} - {preset.tone}
                    </p>
                  </div>
                  {preset.usageCount > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {preset.usageCount}x
                    </span>
                  )}
                </DropdownMenuItem>
              ))}
            </div>
          ) : (
            <div className="py-4 text-center text-sm text-muted-foreground">
              No presets saved yet
            </div>
          )}

          <DropdownMenuSeparator />

          {/* Actions */}
          <DropdownMenuItem
            onClick={() => setSaveModalOpen(true)}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Save Current as Preset
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => setManageModalOpen(true)}
            className="gap-2"
          >
            <Settings className="h-4 w-4" />
            Manage Presets
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Save Modal */}
      <SavePresetModal
        open={saveModalOpen}
        onOpenChange={setSaveModalOpen}
        currentValues={currentValues}
        onSave={handleSave}
      />

      {/* Manage Modal */}
      <ManagePresetsModal
        open={manageModalOpen}
        onOpenChange={setManageModalOpen}
      />
    </>
  );
}
