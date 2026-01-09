/**
 * QueueSettingsModal
 *
 * Modal dialog for configuring queue settings.
 */

import { Settings, RotateCcw } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { QueueSettingsForm } from './QueueSettingsForm';
import { useQueueSettings } from '@/hooks/useQueueSettings';
import { getSettingsSummary } from '@/lib/queue/calculateSlots';

interface QueueSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QueueSettingsModal({
  open,
  onOpenChange,
}: QueueSettingsModalProps) {
  const { settings, updateSettings, resetSettings } = useQueueSettings();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Queue Settings
          </DialogTitle>
          <DialogDescription>
            Configure when posts should be automatically scheduled. Posts added
            to queue will use the next available slot.
          </DialogDescription>
        </DialogHeader>

        <QueueSettingsForm settings={settings} onChange={updateSettings} />

        {/* Summary */}
        <div className="rounded-lg bg-muted/50 p-3">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium">Current schedule:</span>{' '}
            {getSettingsSummary(settings)}
          </p>
        </div>

        <DialogFooter className="flex justify-between sm:justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={resetSettings}
            className="gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Reset to Defaults
          </Button>
          <Button onClick={() => onOpenChange(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
