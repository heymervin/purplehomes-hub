/**
 * ScenarioTabs - Reusable tabs component for calculator scenarios
 * Shows three scenario tabs with visual indicators for saved state
 */

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ScenarioSet, ScenarioNumber } from '@/types/calculatorScenario';
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
import { useState } from 'react';

interface ScenarioTabsProps {
  scenarios: ScenarioSet;
  activeScenario: ScenarioNumber;
  onSelectScenario: (num: ScenarioNumber) => void;
  hasUnsavedChanges?: boolean;
}

export function ScenarioTabs({
  scenarios,
  activeScenario,
  onSelectScenario,
  hasUnsavedChanges = false,
}: ScenarioTabsProps) {
  const [pendingScenario, setPendingScenario] = useState<ScenarioNumber | null>(null);

  const handleTabClick = (scenarioNum: ScenarioNumber) => {
    if (scenarioNum === activeScenario) return;

    if (hasUnsavedChanges) {
      setPendingScenario(scenarioNum);
    } else {
      onSelectScenario(scenarioNum);
    }
  };

  const handleConfirmSwitch = () => {
    if (pendingScenario) {
      onSelectScenario(pendingScenario);
      setPendingScenario(null);
    }
  };

  const getScenarioName = (num: ScenarioNumber): string => {
    const scenarioKey = `scenario${num}` as keyof ScenarioSet;
    return scenarios[scenarioKey]?.name || 'Empty';
  };

  const isScenarioSaved = (num: ScenarioNumber): boolean => {
    const scenarioKey = `scenario${num}` as keyof ScenarioSet;
    return scenarios[scenarioKey] !== null;
  };

  return (
    <>
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {([1, 2, 3] as ScenarioNumber[]).map((num) => {
          const isActive = activeScenario === num;
          const isSaved = isScenarioSaved(num);
          const name = getScenarioName(num);

          return (
            <button
              key={num}
              onClick={() => handleTabClick(num)}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all duration-200',
                'border-2 min-w-[140px]',
                isActive
                  ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                  : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted hover:border-muted-foreground/30'
              )}
            >
              <div className="flex flex-col items-start flex-1 min-w-0">
                <span className="text-xs font-medium opacity-75">
                  Scenario {num}
                </span>
                <span
                  className={cn(
                    'text-sm font-semibold truncate w-full text-left',
                    !isSaved && 'opacity-50'
                  )}
                >
                  {name}
                </span>
              </div>
              {isSaved && (
                <Check className={cn('h-4 w-4 flex-shrink-0', isActive && 'opacity-100')} />
              )}
            </button>
          );
        })}
      </div>

      {/* Unsaved Changes Dialog */}
      <AlertDialog open={pendingScenario !== null} onOpenChange={() => setPendingScenario(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes in the current scenario. Switching to another scenario will
              discard these changes. Are you sure you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSwitch}>
              Switch Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
