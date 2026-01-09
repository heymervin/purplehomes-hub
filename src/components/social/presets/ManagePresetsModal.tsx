/**
 * ManagePresetsModal
 *
 * Modal to view, edit, duplicate, and delete all saved presets.
 */

import { useState } from 'react';
import { Settings, Copy, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { usePresets } from '@/hooks/usePresets';
import { PresetCard } from './PresetCard';
import type { Preset } from '@/lib/presets/types';
import { MAX_PRESETS } from '@/lib/presets/constants';

interface ManagePresetsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ManagePresetsModal({
  open,
  onOpenChange,
}: ManagePresetsModalProps) {
  const { presets, deletePreset, setAsDefault, duplicatePreset, updatePreset } =
    usePresets();

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [duplicateId, setDuplicateId] = useState<string | null>(null);
  const [duplicateName, setDuplicateName] = useState('');

  // Sort presets: default first, then by usage
  const sortedPresets = [...presets].sort((a, b) => {
    if (a.isDefault && !b.isDefault) return -1;
    if (!a.isDefault && b.isDefault) return 1;
    return b.usageCount - a.usageCount;
  });

  // Handle delete
  const handleDelete = () => {
    if (deleteConfirmId) {
      deletePreset(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  // Handle duplicate
  const handleDuplicate = () => {
    if (duplicateId && duplicateName.trim()) {
      duplicatePreset(duplicateId, duplicateName.trim());
      setDuplicateId(null);
      setDuplicateName('');
    }
  };

  // Start duplicate flow
  const startDuplicate = (preset: Preset) => {
    setDuplicateId(preset.id);
    setDuplicateName(`${preset.name} (Copy)`);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Manage Presets
            </DialogTitle>
            <DialogDescription>
              View, edit, and organize your saved presets
            </DialogDescription>
          </DialogHeader>

          {/* Stats */}
          <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
            <div className="text-sm">
              <span className="font-medium">{presets.length}</span>
              <span className="text-muted-foreground">
                {' '}
                / {MAX_PRESETS} presets
              </span>
            </div>
            {presets.length >= MAX_PRESETS && (
              <Badge variant="destructive" className="text-xs">
                <AlertCircle className="h-3 w-3 mr-1" />
                Limit reached
              </Badge>
            )}
          </div>

          {/* Presets List */}
          <ScrollArea className="h-[400px] pr-4">
            {sortedPresets.length > 0 ? (
              <div className="space-y-3">
                {sortedPresets.map((preset) => (
                  <PresetCard
                    key={preset.id}
                    preset={preset}
                    onSetDefault={() => setAsDefault(preset.id)}
                    onDuplicate={() => startDuplicate(preset)}
                    onDelete={() => setDeleteConfirmId(preset.id)}
                    onUpdate={(updates) => updatePreset(preset.id, updates)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <p>No presets saved yet</p>
                <p className="text-sm mt-1">
                  Create presets from the wizard to save time
                </p>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteConfirmId}
        onOpenChange={() => setDeleteConfirmId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Preset?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The preset will be permanently
              deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Duplicate Dialog */}
      <Dialog open={!!duplicateId} onOpenChange={() => setDuplicateId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Copy className="h-5 w-5" />
              Duplicate Preset
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">New Preset Name</label>
              <Input
                value={duplicateName}
                onChange={(e) => setDuplicateName(e.target.value)}
                placeholder="Enter name for the copy"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDuplicateId(null)}>
              Cancel
            </Button>
            <Button onClick={handleDuplicate} disabled={!duplicateName.trim()}>
              Duplicate
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
