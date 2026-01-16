/**
 * DealCalculatorModal - Main calculator modal container
 * Supports real-time calculations and multiple scenarios
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Calculator,
  Save,
  Loader2,
  Plus,
  Trash2,
  X,
  BarChart3,
  Columns,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

import type {
  CalculatorInputs,
  CalculatorOutputs,
  CalculatorScenario,
} from '@/types/calculator';
import {
  calculateAll,
  createDefaultInputs,
  cloneInputs,
} from '@/lib/calculatorEngine';
import {
  useCalculatorDefaults,
  useCreateCalculation,
  useUpdateCalculation,
  useCalculation,
} from '@/services/calculatorApi';

import { QuickStatsPanel } from './QuickStatsPanel';
import { ScenarioComparison } from './ScenarioComparison';
import {
  PropertyBasicsSection,
  IncomeSection,
  PurchaseCostsSection,
  TaxInsuranceSection,
  OperatingSection,
  SubjectToSection,
  DSCRLoanSection,
  SecondLoanSection,
  WrapLoanSection,
  WrapSalesSection,
} from './InputSections';
import { LoanCalcsPanel, DealChecklistPanel } from './OutputSections';

interface DealCalculatorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  property?: {
    price?: number;
    beds?: number;
    baths?: number;
    sqft?: number;
    address?: string;
    propertyCode?: string;
    recordId?: string;
  };
  buyerContactId?: string;
  existingCalculationId?: string;
  onSaved?: () => void;
}

function generateScenarioId(): string {
  return `scenario_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function DealCalculatorModal({
  open,
  onOpenChange,
  property,
  buyerContactId,
  existingCalculationId,
  onSaved,
}: DealCalculatorModalProps) {
  // Fetch defaults and existing calculation
  const { data: defaults } = useCalculatorDefaults();
  const { data: existingData } = useCalculation(existingCalculationId);
  const createCalculation = useCreateCalculation();
  const updateCalculation = useUpdateCalculation();

  // Scenarios state
  const [scenarios, setScenarios] = useState<CalculatorScenario[]>([]);
  const [activeScenarioId, setActiveScenarioId] = useState<string>('');
  const [hasChanges, setHasChanges] = useState(false);
  const [viewMode, setViewMode] = useState<'single' | 'compare'>('single');
  const [calculationName, setCalculationName] = useState('');

  // Initialize scenarios when modal opens
  useEffect(() => {
    if (open && scenarios.length === 0) {
      let initialInputs: CalculatorInputs;
      let initialName: string;

      if (existingData?.calculation) {
        // Load existing calculation
        initialInputs = existingData.calculation.inputs;
        initialName = existingData.calculation.name;
      } else {
        // Create new with property data
        initialInputs = createDefaultInputs(property, defaults || undefined);
        initialName = property?.address || 'New Calculation';
      }

      const initialOutputs = calculateAll(initialInputs);
      const scenario: CalculatorScenario = {
        id: generateScenarioId(),
        name: 'Base Case',
        inputs: initialInputs,
        outputs: initialOutputs,
        isDefault: true,
      };

      setScenarios([scenario]);
      setActiveScenarioId(scenario.id);
      setCalculationName(initialName);
    }
  }, [open, property, defaults, existingData, scenarios.length]);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setScenarios([]);
      setActiveScenarioId('');
      setHasChanges(false);
      setViewMode('single');
      setCalculationName('');
    }
  }, [open]);

  // Get active scenario
  const activeScenario = useMemo(
    () => scenarios.find((s) => s.id === activeScenarioId),
    [scenarios, activeScenarioId]
  );

  // Generic input change handler
  const handleInputChange = useCallback(
    <T extends keyof CalculatorInputs>(
      section: T,
      field: keyof CalculatorInputs[T],
      value: CalculatorInputs[T][keyof CalculatorInputs[T]]
    ) => {
      setScenarios((prev) =>
        prev.map((scenario) => {
          if (scenario.id !== activeScenarioId) return scenario;

          const newInputs = {
            ...scenario.inputs,
            [section]: {
              ...(scenario.inputs[section] as Record<string, unknown>),
              [field]: value,
            },
          } as CalculatorInputs;

          const newOutputs = calculateAll(newInputs);

          return {
            ...scenario,
            inputs: newInputs,
            outputs: newOutputs,
          };
        })
      );
      setHasChanges(true);
    },
    [activeScenarioId]
  );

  // Add new scenario
  const handleAddScenario = useCallback(() => {
    if (scenarios.length >= 3) {
      toast.error('Maximum 3 scenarios allowed');
      return;
    }

    const baseScenario = activeScenario;
    if (!baseScenario) return;

    const newScenario: CalculatorScenario = {
      id: generateScenarioId(),
      name: `Scenario ${scenarios.length + 1}`,
      inputs: cloneInputs(baseScenario.inputs),
      outputs: { ...baseScenario.outputs },
    };

    setScenarios((prev) => [...prev, newScenario]);
    setActiveScenarioId(newScenario.id);
    setHasChanges(true);
    toast.success('Scenario added');
  }, [scenarios, activeScenario]);

  // Delete scenario
  const handleDeleteScenario = useCallback(
    (scenarioId: string) => {
      if (scenarios.length <= 1) {
        toast.error('Cannot delete the last scenario');
        return;
      }

      const newScenarios = scenarios.filter((s) => s.id !== scenarioId);
      setScenarios(newScenarios);

      if (activeScenarioId === scenarioId) {
        setActiveScenarioId(newScenarios[0].id);
      }

      setHasChanges(true);
      toast.success('Scenario deleted');
    },
    [scenarios, activeScenarioId]
  );

  // Rename scenario
  const handleRenameScenario = useCallback(
    (scenarioId: string, newName: string) => {
      setScenarios((prev) =>
        prev.map((s) =>
          s.id === scenarioId ? { ...s, name: newName } : s
        )
      );
      setHasChanges(true);
    },
    []
  );

  // Save calculation
  const handleSave = async () => {
    if (!activeScenario) return;

    try {
      const dataToSave = {
        name: calculationName || 'Untitled Calculation',
        propertyCode: property?.propertyCode,
        contactId: buyerContactId,
        inputs: activeScenario.inputs,
        outputs: activeScenario.outputs,
      };

      if (existingCalculationId) {
        await updateCalculation.mutateAsync({
          recordId: existingCalculationId,
          ...dataToSave,
        });
        toast.success('Calculation updated!');
      } else {
        await createCalculation.mutateAsync(dataToSave);
        toast.success('Calculation saved!');
      }

      setHasChanges(false);
      onSaved?.();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to save calculation'
      );
    }
  };

  const isSaving = createCalculation.isPending || updateCalculation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[95vh] p-0 gap-0">
        {/* Header */}
        <DialogHeader className="p-4 pb-3 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calculator className="h-6 w-6 text-primary" />
              <div className="flex flex-col">
                <DialogTitle className="text-lg font-bold">
                  Deal Calculator
                </DialogTitle>
                <Input
                  value={calculationName}
                  onChange={(e) => {
                    setCalculationName(e.target.value);
                    setHasChanges(true);
                  }}
                  placeholder="Calculation name..."
                  className="h-7 text-sm mt-1 max-w-xs"
                />
              </div>
              {property?.propertyCode && (
                <Badge variant="secondary">{property.propertyCode}</Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              {/* View Mode Toggle */}
              <Button
                variant={viewMode === 'compare' ? 'default' : 'outline'}
                size="sm"
                onClick={() =>
                  setViewMode(viewMode === 'single' ? 'compare' : 'single')
                }
                disabled={scenarios.length < 2}
              >
                <Columns className="h-4 w-4 mr-1" />
                Compare ({scenarios.length})
              </Button>

              {/* Add Scenario */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddScenario}
                disabled={scenarios.length >= 3}
              >
                <Plus className="h-4 w-4 mr-1" />
                Scenario
              </Button>
            </div>
          </div>

          {/* Scenario Tabs */}
          {scenarios.length > 1 && viewMode === 'single' && (
            <div className="flex items-center gap-2 mt-3 overflow-x-auto pb-1">
              {scenarios.map((scenario) => (
                <div
                  key={scenario.id}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-md cursor-pointer transition-colors ${
                    activeScenarioId === scenario.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted hover:bg-muted/80'
                  }`}
                  onClick={() => setActiveScenarioId(scenario.id)}
                >
                  <span className="text-sm font-medium">{scenario.name}</span>
                  {scenarios.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteScenario(scenario.id);
                      }}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </DialogHeader>

        {/* Content */}
        <ScrollArea className="max-h-[calc(95vh-180px)]">
          {viewMode === 'compare' && scenarios.length >= 2 ? (
            <ScenarioComparison
              scenarios={scenarios}
              onRenameScenario={handleRenameScenario}
            />
          ) : activeScenario ? (
            <div className="p-4 space-y-4">
              {/* Quick Stats Panel */}
              <QuickStatsPanel outputs={activeScenario.outputs} inputs={activeScenario.inputs} />

              <Separator />

              {/* Input Tabs - Wrap Focused (no flip) */}
              <Tabs defaultValue="property" className="w-full">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="property">Property</TabsTrigger>
                  <TabsTrigger value="income">Income</TabsTrigger>
                  <TabsTrigger value="loans">Your Loans</TabsTrigger>
                  <TabsTrigger value="wrap">Wrap Terms</TabsTrigger>
                  <TabsTrigger value="results">
                    <BarChart3 className="h-4 w-4 mr-1" />
                    Results
                  </TabsTrigger>
                </TabsList>

                {/* Property Tab */}
                <TabsContent value="property" className="space-y-4 mt-4">
                  <PropertyBasicsSection
                    inputs={activeScenario.inputs.propertyBasics}
                    onChange={(field, value) =>
                      handleInputChange('propertyBasics', field, value)
                    }
                  />
                  <PurchaseCostsSection
                    inputs={activeScenario.inputs.purchaseCosts}
                    onChange={(field, value) =>
                      handleInputChange('purchaseCosts', field, value)
                    }
                  />
                  <TaxInsuranceSection
                    inputs={activeScenario.inputs.taxInsurance}
                    onChange={(field, value) =>
                      handleInputChange('taxInsurance', field, value)
                    }
                  />
                </TabsContent>

                {/* Income Tab */}
                <TabsContent value="income" className="space-y-4 mt-4">
                  <IncomeSection
                    inputs={activeScenario.inputs.income}
                    onChange={(field, value) =>
                      handleInputChange('income', field, value)
                    }
                  />
                  <OperatingSection
                    inputs={activeScenario.inputs.operating}
                    monthlyRent={activeScenario.inputs.income.monthlyRent}
                    onChange={(field, value) =>
                      handleInputChange('operating', field, value)
                    }
                  />
                </TabsContent>

                {/* Loans Tab */}
                <TabsContent value="loans" className="space-y-4 mt-4">
                  <SubjectToSection
                    inputs={activeScenario.inputs.subjectTo}
                    onChange={(field, value) =>
                      handleInputChange('subjectTo', field, value as never)
                    }
                  />
                  <DSCRLoanSection
                    inputs={activeScenario.inputs.dscrLoan}
                    purchasePrice={activeScenario.inputs.purchaseCosts.purchasePrice}
                    onChange={(field, value) =>
                      handleInputChange('dscrLoan', field, value as never)
                    }
                  />
                  <SecondLoanSection
                    inputs={activeScenario.inputs.secondLoan}
                    onChange={(field, value) =>
                      handleInputChange('secondLoan', field, value as never)
                    }
                  />
                </TabsContent>

                {/* Wrap Tab - Buyer Terms first, then Loan Terms */}
                <TabsContent value="wrap" className="space-y-4 mt-4">
                  <WrapSalesSection
                    inputs={activeScenario.inputs.wrapSales}
                    useWrap={activeScenario.inputs.wrapLoan.useWrap}
                    onChange={(field, value) =>
                      handleInputChange('wrapSales', field, value)
                    }
                  />
                  <WrapLoanSection
                    inputs={activeScenario.inputs.wrapLoan}
                    onChange={(field, value) =>
                      handleInputChange('wrapLoan', field, value as never)
                    }
                  />
                </TabsContent>

                {/* Results Tab */}
                <TabsContent value="results" className="space-y-4 mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <LoanCalcsPanel
                      outputs={activeScenario.outputs}
                      inputs={activeScenario.inputs}
                    />
                    <DealChecklistPanel
                      outputs={activeScenario.outputs}
                      inputs={activeScenario.inputs}
                    />
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[400px]">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t bg-muted/30">
          <div className="text-sm text-muted-foreground">
            {hasChanges ? (
              <span className="text-yellow-600 font-medium">Unsaved changes</span>
            ) : (
              <span>All changes saved</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button onClick={handleSave} disabled={!hasChanges || isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default DealCalculatorModal;
