/**
 * MatchQuickActions - Context-aware action buttons for match management
 *
 * Displays relevant action buttons based on the current deal stage,
 * allowing users to advance the match, send emails, schedule showings, etc.
 */

import { useState } from 'react';
import {
  Mail,
  Calendar,
  Eye,
  FileText,
  MessageSquare,
  XCircle,
  Loader2,
  ArrowRight,
  Send,
  RotateCcw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { MatchDealStage, getNextStage } from '@/types/associations';

interface QuickAction {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  variant: 'default' | 'outline' | 'secondary' | 'ghost' | 'destructive';
  primary?: boolean;
  action: () => void | Promise<void>;
  disabled?: boolean;
}

interface MatchQuickActionsProps {
  currentStage: MatchDealStage;
  onAdvanceStage: (stage: MatchDealStage) => Promise<void>;
  onSendEmail?: () => Promise<void>;
  onScheduleShowing?: () => void;
  onAddNote?: (note: string) => Promise<void>;
  onMarkNotInterested?: () => Promise<void>;
  isLoading?: boolean;
  className?: string;
}

export function MatchQuickActions({
  currentStage,
  onAdvanceStage,
  onSendEmail,
  onScheduleShowing,
  onAddNote,
  onMarkNotInterested,
  isLoading = false,
  className,
}: MatchQuickActionsProps) {
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);

  const isNotInterested = currentStage === 'Not Interested';
  const nextStage = getNextStage(currentStage);

  const handleAddNote = async () => {
    if (!noteText.trim() || !onAddNote) return;
    setIsSavingNote(true);
    try {
      await onAddNote(noteText.trim());
      setNoteText('');
      setShowNoteDialog(false);
    } finally {
      setIsSavingNote(false);
    }
  };

  // Get context-aware actions based on current stage
  const getActions = (): QuickAction[] => {
    const baseActions: QuickAction[] = [];

    // Add note is always available
    baseActions.push({
      id: 'add-note',
      label: 'Add Note',
      icon: MessageSquare,
      variant: 'outline',
      action: () => setShowNoteDialog(true),
    });

    if (isNotInterested) {
      // Limited actions for not interested matches
      return baseActions;
    }

    // Stage-specific primary actions
    switch (currentStage) {
      case 'Sent to Buyer':
        return [
          {
            id: 'mark-responded',
            label: 'Mark Interested',
            icon: MessageSquare,
            variant: 'default',
            primary: true,
            action: () => onAdvanceStage('Buyer Responded'),
          },
          ...baseActions,
        ];

      case 'Buyer Responded':
        return [
          {
            id: 'schedule-showing',
            label: 'Schedule Showing',
            icon: Calendar,
            variant: 'default',
            primary: true,
            action: () => {
              if (onScheduleShowing) {
                onScheduleShowing();
              } else {
                onAdvanceStage('Showing Scheduled');
              }
            },
          },
          ...baseActions,
        ];

      case 'Showing Scheduled':
        return [
          {
            id: 'mark-viewed',
            label: 'Mark as Viewed',
            icon: Eye,
            variant: 'default',
            primary: true,
            action: () => onAdvanceStage('Property Viewed'),
          },
          {
            id: 'reschedule',
            label: 'Reschedule',
            icon: RotateCcw,
            variant: 'outline',
            action: () => onScheduleShowing?.(),
            disabled: !onScheduleShowing,
          },
          ...baseActions,
        ];

      case 'Property Viewed':
        return [
          {
            id: 'start-underwriting',
            label: 'Start Underwriting',
            icon: FileText,
            variant: 'default',
            primary: true,
            action: () => onAdvanceStage('Underwriting'),
          },
          {
            id: 'schedule-another',
            label: 'Schedule Another Showing',
            icon: Calendar,
            variant: 'outline',
            action: () => onScheduleShowing?.(),
            disabled: !onScheduleShowing,
          },
          ...baseActions,
        ];

      case 'Underwriting':
        return [
          {
            id: 'move-to-contracts',
            label: 'Move to Contracts',
            icon: FileText,
            variant: 'default',
            primary: true,
            action: () => onAdvanceStage('Contracts'),
          },
          ...baseActions,
        ];

      case 'Contracts':
        return [
          {
            id: 'mark-qualified',
            label: 'Mark Qualified',
            icon: ArrowRight,
            variant: 'default',
            primary: true,
            action: () => onAdvanceStage('Qualified'),
          },
          ...baseActions,
        ];

      case 'Qualified':
        return [
          {
            id: 'close-deal',
            label: 'Close Deal',
            icon: ArrowRight,
            variant: 'default',
            primary: true,
            action: () => onAdvanceStage('Closed Deal / Won'),
          },
          ...baseActions,
        ];

      case 'Closed Deal / Won':
        // No advancement actions for closed deals
        return baseActions;

      default:
        // Generic advance action
        if (nextStage) {
          return [
            {
              id: 'advance',
              label: `Move to ${nextStage}`,
              icon: ArrowRight,
              variant: 'default',
              primary: true,
              action: () => onAdvanceStage(nextStage),
            },
            ...baseActions,
          ];
        }
        return baseActions;
    }
  };

  const actions = getActions();
  const primaryAction = actions.find(a => a.primary);
  const secondaryActions = actions.filter(a => !a.primary);

  return (
    <div className={cn('space-y-3', className)}>
      {/* Primary Action */}
      {primaryAction && (
        <Button
          onClick={primaryAction.action}
          disabled={isLoading || primaryAction.disabled}
          className="w-full"
          size="lg"
        >
          {isLoading ? (
            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
          ) : (
            <primaryAction.icon className="h-5 w-5 mr-2" />
          )}
          {primaryAction.label}
        </Button>
      )}

      {/* Secondary Actions */}
      {secondaryActions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {secondaryActions.map(action => (
            <Button
              key={action.id}
              variant={action.variant}
              size="sm"
              onClick={action.action}
              disabled={isLoading || action.disabled}
            >
              <action.icon className="h-4 w-4 mr-1.5" />
              {action.label}
            </Button>
          ))}
        </div>
      )}

      {/* Not Interested Button (always visible unless already not interested) */}
      {!isNotInterested && onMarkNotInterested && (
        <div className="pt-2 border-t">
          <Button
            variant="ghost"
            size="sm"
            onClick={onMarkNotInterested}
            disabled={isLoading}
            className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <XCircle className="h-4 w-4 mr-2" />
            Mark Not Interested
          </Button>
        </div>
      )}

      {/* Add Note Dialog */}
      <Dialog open={showNoteDialog} onOpenChange={setShowNoteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Note</DialogTitle>
            <DialogDescription>
              Add a note about this match for your records.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="note">Note</Label>
              <Textarea
                id="note"
                placeholder="Enter your note here..."
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowNoteDialog(false);
                setNoteText('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddNote}
              disabled={!noteText.trim() || isSavingNote}
            >
              {isSavingNote ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <MessageSquare className="h-4 w-4 mr-2" />
              )}
              Save Note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default MatchQuickActions;
