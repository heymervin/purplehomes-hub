/**
 * PresetCard
 *
 * Card component for displaying a preset in the manage view.
 * Supports inline editing, set as default, duplicate, and delete.
 */

import { useState } from 'react';
import {
  Star,
  Copy,
  Trash2,
  Edit2,
  Check,
  X,
  MoreHorizontal,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { Preset, PresetInput } from '@/lib/presets/types';
import {
  POST_INTENTS,
  TONE_PRESETS,
} from '@/components/social/create-wizard/types';

interface PresetCardProps {
  preset: Preset;
  onSetDefault: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onUpdate: (updates: Partial<PresetInput>) => void;
}

export function PresetCard({
  preset,
  onSetDefault,
  onDuplicate,
  onDelete,
  onUpdate,
}: PresetCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(preset.name);

  // Get labels
  const intentConfig = POST_INTENTS.find((i) => i.id === preset.postIntent);
  const toneConfig = TONE_PRESETS.find((t) => t.id === preset.tone);

  // Save name edit
  const handleSaveName = () => {
    if (editName.trim() && editName.trim() !== preset.name) {
      onUpdate({ name: editName.trim() });
    }
    setIsEditing(false);
  };

  // Cancel name edit
  const handleCancelEdit = () => {
    setEditName(preset.name);
    setIsEditing(false);
  };

  // Format date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div
      className={cn(
        'group p-4 rounded-lg border transition-colors',
        preset.isDefault &&
          'border-yellow-300 bg-yellow-50/50 dark:bg-yellow-950/10'
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="flex items-center gap-2">
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="h-8"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveName();
                  if (e.key === 'Escape') handleCancelEdit();
                }}
              />
              <Button size="sm" variant="ghost" onClick={handleSaveName}>
                <Check className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {preset.isDefault && (
                <Star className="h-4 w-4 text-yellow-500 fill-yellow-500 flex-shrink-0" />
              )}
              <h3 className="font-medium truncate">{preset.name}</h3>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                onClick={() => setIsEditing(true)}
              >
                <Edit2 className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>

        {/* Actions Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {!preset.isDefault && (
              <DropdownMenuItem onClick={onSetDefault}>
                <Star className="h-4 w-4 mr-2" />
                Set as Default
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => setIsEditing(true)}>
              <Edit2 className="h-4 w-4 mr-2" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDuplicate}>
              <Copy className="h-4 w-4 mr-2" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} className="text-red-600">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Settings */}
      <div className="flex flex-wrap gap-2 mb-3">
        <Badge variant="outline" className="text-xs">
          {intentConfig?.icon} {intentConfig?.label || preset.postIntent}
        </Badge>
        <Badge variant="outline" className="text-xs">
          {toneConfig?.icon} {toneConfig?.label || preset.tone}
        </Badge>
        <Badge variant="outline" className="text-xs">
          {preset.hashtags.length} hashtags
        </Badge>
        <Badge variant="outline" className="text-xs">
          {preset.platforms.join(', ')}
        </Badge>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Used {preset.usageCount} times</span>
        <span>Updated {formatDate(preset.updatedAt)}</span>
      </div>
    </div>
  );
}
