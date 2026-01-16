/**
 * Hook for managing calculator scenarios
 * Handles loading, saving, and switching between scenarios for both Property and Match calculators
 * Includes migration support for backwards compatibility with old scenario formats
 */

import { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  SavedCalculatorScenario,
  ScenarioSet,
  ScenarioNumber,
} from '@/types/calculatorScenario';
import type { CalculatorInputs, CalculatorOutputs } from '@/types/calculator';
import {
  getPropertyScenarios,
  savePropertyScenario,
  getMatchScenarios,
  saveMatchScenario,
} from '@/services/calculatorApi';
import { migrateScenarioInputs } from '@/lib/calculatorEngine';

interface UseCalculatorScenariosOptions {
  recordId: string;
  type: 'property' | 'match';
}

interface UseCalculatorScenariosReturn {
  // Scenario data
  scenarios: ScenarioSet;
  activeScenario: ScenarioNumber;
  currentScenarioData: SavedCalculatorScenario | null;

  // Actions
  setActiveScenario: (num: ScenarioNumber) => void;
  saveScenario: (
    name: string,
    inputs: CalculatorInputs,
    outputs: CalculatorOutputs
  ) => Promise<void>;
  clearScenario: () => Promise<void>;

  // State
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;

  // Tracking changes
  hasUnsavedChanges: boolean;
  setHasUnsavedChanges: (value: boolean) => void;
}

export function useCalculatorScenarios({
  recordId,
  type,
}: UseCalculatorScenariosOptions): UseCalculatorScenariosReturn {
  const [activeScenario, setActiveScenario] = useState<ScenarioNumber>(1);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const queryClient = useQueryClient();

  // Fetch scenarios
  const {
    data: scenarios,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['calculator-scenarios', type, recordId],
    queryFn: () =>
      type === 'property'
        ? getPropertyScenarios(recordId)
        : getMatchScenarios(recordId),
    enabled: !!recordId,
    staleTime: 30 * 1000, // 30 seconds
  });

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async ({
      scenarioNumber,
      scenario,
    }: {
      scenarioNumber: ScenarioNumber;
      scenario: SavedCalculatorScenario | null;
    }) => {
      if (type === 'property') {
        return savePropertyScenario(recordId, scenarioNumber, scenario);
      } else {
        return saveMatchScenario(recordId, scenarioNumber, scenario);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['calculator-scenarios', type, recordId],
      });
      setHasUnsavedChanges(false);
    },
  });

  // Get current scenario data with migration support
  const currentScenarioData = useMemo(() => {
    if (!scenarios) return null;
    const scenarioKey = `scenario${activeScenario}` as keyof ScenarioSet;
    const rawScenario = scenarios[scenarioKey];

    // If no scenario, return null
    if (!rawScenario) return null;

    // Migrate inputs to ensure backwards compatibility
    // This handles:
    // - maintenancePercent → warChestPercent
    // - annualInsurance → annualHomeownersInsurance
    // - Removes flip data if present
    // - Adds dscrLtvPercent if missing
    const migratedInputs = migrateScenarioInputs(rawScenario.inputs);

    return {
      ...rawScenario,
      inputs: migratedInputs,
    };
  }, [scenarios, activeScenario]);

  // Save handler
  const saveScenario = useCallback(
    async (name: string, inputs: CalculatorInputs, outputs: CalculatorOutputs) => {
      const scenario: SavedCalculatorScenario = {
        name,
        savedAt: new Date().toISOString(),
        inputs,
        outputs,
      };

      const result = await saveMutation.mutateAsync({
        scenarioNumber: activeScenario,
        scenario,
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to save scenario');
      }
    },
    [activeScenario, saveMutation]
  );

  // Clear handler
  const clearScenario = useCallback(async () => {
    const result = await saveMutation.mutateAsync({
      scenarioNumber: activeScenario,
      scenario: null,
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to clear scenario');
    }
  }, [activeScenario, saveMutation]);

  return {
    scenarios: scenarios ?? { scenario1: null, scenario2: null, scenario3: null },
    activeScenario,
    currentScenarioData,
    setActiveScenario,
    saveScenario,
    clearScenario,
    isLoading,
    isSaving: saveMutation.isPending,
    error: error?.message ?? null,
    hasUnsavedChanges,
    setHasUnsavedChanges,
  };
}
