/**
 * ConfirmFinalPropertyCard - UI component for confirming/removing final property selection
 *
 * Displays two states:
 * 1. Not Confirmed: Prompts user to select this property as the final choice
 * 2. Confirmed: Shows confirmation status with option to remove selection
 */

import { useState } from 'react';
import {
  Star,
  CheckCircle2,
  Home,
  Loader2,
  Lightbulb,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import { MatchDealStage } from '@/types/associations';

interface ConfirmFinalPropertyCardProps {
  currentStage: MatchDealStage;
  isFinalProperty: boolean;
  propertyAddress: string;
  propertyPrice: number;
  buyerName: string;
  onConfirm: () => Promise<void>;
  onRemove: () => Promise<void>;
  isConfirming?: boolean;
  isRemoving?: boolean;
  className?: string;
}

/**
 * Get a friendly stage label for display
 */
function getStageLabel(stage: MatchDealStage): string {
  const stageLabels: Record<MatchDealStage, string> = {
    'Sent to Buyer': 'Early Stage',
    'Buyer Responded': 'Interested',
    'Showing Scheduled': 'Showing Scheduled',
    'Property Viewed': 'Property Viewed',
    'Underwriting': 'Underwriting',
    'Contracts': 'Contracts',
    'Qualified': 'Qualifying',
    'Closed Deal / Won': 'Closed',
    'Not Interested': 'Not Interested',
  };
  return stageLabels[stage] || stage;
}

/**
 * Get stage badge variant based on stage
 */
function getStageBadgeVariant(stage: MatchDealStage): 'default' | 'secondary' | 'outline' {
  const advancedStages: MatchDealStage[] = ['Property Viewed', 'Underwriting', 'Contracts', 'Qualified', 'Closed Deal / Won'];
  if (advancedStages.includes(stage)) {
    return 'default';
  }
  return 'secondary';
}

export function ConfirmFinalPropertyCard({
  currentStage,
  isFinalProperty,
  propertyAddress,
  propertyPrice,
  buyerName,
  onConfirm,
  onRemove,
  isConfirming = false,
  isRemoving = false,
  className,
}: ConfirmFinalPropertyCardProps) {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);

  const isLoading = isConfirming || isRemoving;

  // Format price for display
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(price);
  };

  const handleConfirmClick = () => {
    setShowConfirmDialog(true);
  };

  const handleConfirmAction = async () => {
    setShowConfirmDialog(false);
    await onConfirm();
  };

  const handleRemoveClick = () => {
    setShowRemoveDialog(true);
  };

  const handleRemoveAction = async () => {
    setShowRemoveDialog(false);
    await onRemove();
  };

  // Confirmed State
  if (isFinalProperty) {
    return (
      <>
        <Card className={cn('border-green-200 bg-green-50/50', className)}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <CardTitle className="text-base text-green-800">
                  Final Property Selected
                </CardTitle>
              </div>
              <Badge variant="default" className="bg-green-600">
                Confirmed
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center justify-between">
              <CardDescription className="text-green-700">
                This property has been confirmed as {buyerName}'s final selection.
              </CardDescription>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRemoveClick}
                disabled={isLoading}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 -mr-2"
              >
                {isRemoving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : null}
                Remove selection
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Remove Confirmation Dialog */}
        <AlertDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove Final Property Selection?</AlertDialogTitle>
              <AlertDialogDescription>
                This will remove <strong>{propertyAddress}</strong> as {buyerName}'s
                final property selection. The property will remain in their matches,
                but CRM deal records will be cleared.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleRemoveAction}
                className="bg-red-600 hover:bg-red-700"
              >
                Remove Selection
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  // Not Confirmed State
  return (
    <>
      <Card className={cn('border-purple-200 bg-purple-50/30', className)}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-purple-600" />
              <CardTitle className="text-base">Confirm as Final Property</CardTitle>
            </div>
            <Badge variant={getStageBadgeVariant(currentStage)}>
              {getStageLabel(currentStage)}
            </Badge>
          </div>
          <CardDescription>
            Ready to move forward? Confirm this as the property that will proceed to closing.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          {/* Tip */}
          <div className="flex items-start gap-2 text-sm text-muted-foreground bg-amber-50 border border-amber-200 rounded-lg p-3">
            <Lightbulb className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            <span>
              <strong className="text-amber-700">Tip:</strong> Most buyers confirm after viewing the property
            </span>
          </div>

          {/* What happens list */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">This will:</p>
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-600 shrink-0" />
                Mark this as the buyer's chosen property
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-600 shrink-0" />
                Sync property details to CRM deal record
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-600 shrink-0" />
                Enable contract and closing workflows
              </li>
            </ul>
          </div>

          {/* Confirm Button */}
          <Button
            onClick={handleConfirmClick}
            disabled={isLoading}
            className="w-full bg-purple-600 hover:bg-purple-700"
          >
            {isConfirming ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Home className="h-4 w-4 mr-2" />
            )}
            Select This Property
          </Button>
        </CardContent>
      </Card>

      {/* Confirm Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Final Property Selection</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                You are about to confirm <strong>{propertyAddress}</strong> as{' '}
                {buyerName}'s final property selection.
              </p>
              {propertyPrice > 0 && (
                <p className="font-medium text-foreground">
                  Property Price: {formatPrice(propertyPrice)}
                </p>
              )}
              <p className="text-amber-600">
                This will sync the property details to the buyer's CRM deal record.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmAction}
              className="bg-purple-600 hover:bg-purple-700"
            >
              Confirm Selection
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default ConfirmFinalPropertyCard;
