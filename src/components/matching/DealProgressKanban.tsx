/**
 * DealProgressKanban - Horizontal stage tracker for match deal progression
 *
 * Displays a horizontal stepper showing the buyer's journey with a property,
 * with visual indicators for completed, current, and future stages.
 */

import { useState } from 'react';
import {
  Send,
  MessageSquare,
  Calendar,
  Eye,
  FileText,
  FileCheck,
  BadgeCheck,
  Trophy,
  XCircle,
  Check,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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
import {
  MatchDealStage,
  MATCH_DEAL_STAGES,
  getStageConfig,
  getNextStage,
  isValidTransition,
} from '@/types/associations';

interface StageUIConfig {
  id: MatchDealStage;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  description: string;
}

const STAGE_UI_CONFIGS: StageUIConfig[] = [
  {
    id: 'Sent to Buyer',
    label: 'Sent to Buyer',
    shortLabel: 'Sent',
    icon: Send,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    description: 'Property details sent to buyer',
  },
  {
    id: 'Buyer Responded',
    label: 'Interested',
    shortLabel: 'Interested',
    icon: MessageSquare,
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-100',
    description: 'Buyer replied via SMS, call, or email',
  },
  {
    id: 'Showing Scheduled',
    label: 'Showing Scheduled',
    shortLabel: 'Scheduled',
    icon: Calendar,
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
    description: 'Property showing scheduled',
  },
  {
    id: 'Property Viewed',
    label: 'Property Viewed',
    shortLabel: 'Viewed',
    icon: Eye,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    description: 'Buyer has viewed property',
  },
  {
    id: 'Underwriting',
    label: 'Underwriting',
    shortLabel: 'Underwriting',
    icon: FileText,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
    description: 'Numbers being prepared',
  },
  {
    id: 'Contracts',
    label: 'Contracts',
    shortLabel: 'Contracts',
    icon: FileCheck,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-100',
    description: 'Contracts are signed',
  },
  {
    id: 'Qualified',
    label: 'Qualified',
    shortLabel: 'Qualified',
    icon: BadgeCheck,
    color: 'text-teal-600',
    bgColor: 'bg-teal-100',
    description: 'Buyer qualified for property',
  },
  {
    id: 'Closed Deal / Won',
    label: 'Closed Deal / Won',
    shortLabel: 'Closed',
    icon: Trophy,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-100',
    description: 'Deal completed successfully',
  },
];

const getStageUIConfig = (stageId: MatchDealStage): StageUIConfig | undefined => {
  return STAGE_UI_CONFIGS.find(config => config.id === stageId);
};

const getStageIndex = (stageId: MatchDealStage): number => {
  return STAGE_UI_CONFIGS.findIndex(config => config.id === stageId);
};

interface DealProgressKanbanProps {
  currentStage: MatchDealStage;
  onStageChange: (newStage: MatchDealStage) => Promise<void>;
  onNotInterested?: (reason?: string) => Promise<void>;
  isUpdating?: boolean;
  className?: string;
}

export function DealProgressKanban({
  currentStage,
  onStageChange,
  onNotInterested,
  isUpdating = false,
  className,
}: DealProgressKanbanProps) {
  const [confirmStage, setConfirmStage] = useState<MatchDealStage | null>(null);
  const [showNotInterestedDialog, setShowNotInterestedDialog] = useState(false);

  const currentIndex = getStageIndex(currentStage);
  const isNotInterested = currentStage === 'Not Interested';

  const handleStageClick = (stage: MatchDealStage) => {
    if (isUpdating || isNotInterested) return;

    const stageIndex = getStageIndex(stage);

    // Allow clicking on next stage or any stage ahead
    if (stageIndex > currentIndex) {
      setConfirmStage(stage);
    }
  };

  const confirmStageChange = async () => {
    if (!confirmStage) return;
    await onStageChange(confirmStage);
    setConfirmStage(null);
  };

  const handleNotInterested = async () => {
    if (onNotInterested) {
      await onNotInterested();
    } else {
      await onStageChange('Not Interested');
    }
    setShowNotInterestedDialog(false);
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Stage Progress Bar */}
      <div className="relative">
        {/* Background track */}
        <div className="absolute top-6 left-0 right-0 h-1 bg-muted rounded-full" />

        {/* Progress fill */}
        <div
          className={cn(
            'absolute top-6 left-0 h-1 rounded-full transition-all duration-500',
            isNotInterested ? 'bg-red-400' : 'bg-primary'
          )}
          style={{
            width: isNotInterested
              ? '0%'
              : `${(currentIndex / (STAGE_UI_CONFIGS.length - 1)) * 100}%`,
          }}
        />

        {/* Stage Indicators */}
        <TooltipProvider>
          <div className="relative flex justify-between">
            {STAGE_UI_CONFIGS.map((stage, index) => {
              const isCompleted = index < currentIndex && !isNotInterested;
              const isCurrent = index === currentIndex && !isNotInterested;
              const isFuture = index > currentIndex || isNotInterested;
              const StageIcon = stage.icon;

              return (
                <Tooltip key={stage.id}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => handleStageClick(stage.id)}
                      disabled={isUpdating || isNotInterested || index <= currentIndex}
                      className={cn(
                        'relative flex flex-col items-center transition-all duration-200',
                        'focus:outline-none focus:ring-2 focus:ring-primary/50 rounded-lg p-1',
                        isFuture && !isNotInterested && 'cursor-pointer hover:scale-105',
                        (isUpdating || isNotInterested || index <= currentIndex) && 'cursor-default'
                      )}
                    >
                      {/* Stage Circle */}
                      <div
                        className={cn(
                          'w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300',
                          'border-2',
                          isCompleted && 'bg-primary border-primary',
                          isCurrent && cn(stage.bgColor, 'border-primary ring-4 ring-primary/20'),
                          isFuture && 'bg-muted border-muted-foreground/30',
                          isNotInterested && 'bg-red-50 border-red-200'
                        )}
                      >
                        {isCompleted ? (
                          <Check className="h-5 w-5 text-primary-foreground" />
                        ) : isCurrent ? (
                          <StageIcon className={cn('h-5 w-5', stage.color)} />
                        ) : (
                          <StageIcon
                            className={cn(
                              'h-5 w-5',
                              isNotInterested ? 'text-red-300' : 'text-muted-foreground/50'
                            )}
                          />
                        )}

                        {/* Updating indicator */}
                        {isUpdating && isCurrent && (
                          <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-full">
                            <Loader2 className="h-5 w-5 animate-spin text-primary" />
                          </div>
                        )}
                      </div>

                      {/* Stage Label */}
                      <span
                        className={cn(
                          'mt-2 text-xs font-medium text-center whitespace-nowrap',
                          isCompleted && 'text-primary',
                          isCurrent && 'text-foreground',
                          isFuture && 'text-muted-foreground',
                          isNotInterested && 'text-red-300'
                        )}
                      >
                        {stage.shortLabel}
                      </span>

                      {/* Current indicator pulse */}
                      {isCurrent && !isUpdating && (
                        <div className="absolute top-0 left-1/2 -translate-x-1/2">
                          <span className="flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-primary" />
                          </span>
                        </div>
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs">
                    <p className="font-medium">{stage.label}</p>
                    <p className="text-xs text-muted-foreground">{stage.description}</p>
                    {isFuture && !isNotInterested && (
                      <p className="text-xs text-primary mt-1">Click to advance to this stage</p>
                    )}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </TooltipProvider>
      </div>

      {/* Not Interested Button */}
      {!isNotInterested && (
        <div className="flex justify-center pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowNotInterestedDialog(true)}
            disabled={isUpdating}
            className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
          >
            <XCircle className="h-4 w-4 mr-2" />
            Mark Not Interested
          </Button>
        </div>
      )}

      {/* Not Interested State Display */}
      {isNotInterested && (
        <div className="flex items-center justify-center gap-2 p-3 bg-red-50 rounded-lg border border-red-200">
          <XCircle className="h-5 w-5 text-red-500" />
          <span className="text-sm font-medium text-red-700">
            Buyer marked as not interested in this property
          </span>
        </div>
      )}

      {/* Stage Change Confirmation Dialog */}
      <AlertDialog open={!!confirmStage} onOpenChange={() => setConfirmStage(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Advance Deal Stage?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmStage && (
                <>
                  This will move the match from{' '}
                  <strong className="text-foreground">{currentStage}</strong> to{' '}
                  <strong className="text-foreground">{confirmStage}</strong>.
                  {getStageIndex(confirmStage) > currentIndex + 1 && (
                    <span className="block mt-2 text-amber-600">
                      Note: You are skipping{' '}
                      {getStageIndex(confirmStage) - currentIndex - 1} stage(s).
                    </span>
                  )}
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmStageChange}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Not Interested Confirmation Dialog */}
      <AlertDialog
        open={showNotInterestedDialog}
        onOpenChange={setShowNotInterestedDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark as Not Interested?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the buyer as not interested in this property. This action
              removes the match from the active deal pipeline.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleNotInterested}
              className="bg-red-600 hover:bg-red-700"
            >
              Mark Not Interested
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default DealProgressKanban;
