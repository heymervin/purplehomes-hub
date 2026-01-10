/**
 * PropertyCalculator - Calculator for property-level underwriting
 * Saves scenarios to Properties table in Airtable
 */

import { useState, useEffect, useCallback } from 'react';
import { Calculator, Save, Loader2, Trash2, BarChart3 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
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
import { toast } from 'sonner';

import type { CalculatorInputs } from '@/types/calculator';
import type { ScenarioNumber } from '@/types/calculatorScenario';
import { calculateAll, createDefaultInputs } from '@/lib/calculatorEngine';
import { useCalculatorDefaults } from '@/services/calculatorApi';
import { useCalculatorScenarios } from '@/hooks/useCalculatorScenarios';

import { ScenarioTabs } from './ScenarioTabs';
import { QuickStatsPanel } from './QuickStatsPanel';
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
  FlipSection,
} from './InputSections';
import { LoanCalcsPanel, DealChecklistPanel } from './OutputSections';

interface PropertyCalculatorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  property: {
    recordId: string;
    address: string;
    listingPrice?: number;
    downPayment?: number;
    monthlyPayment?: number;
  };
}

export function PropertyCalculator({ open, onOpenChange, property }: PropertyCalculatorProps) {
  // Fetch defaults
  const { data: defaults } = useCalculatorDefaults();

  // Scenario management
  const {
    scenarios,
    activeScenario,
    currentScenarioData,
    setActiveScenario,
    saveScenario,
    clearScenario,
    isLoading,
    isSaving,
    hasUnsavedChanges,
    setHasUnsavedChanges,
  } = useCalculatorScenarios({
    recordId: property.recordId,
    type: 'property',
  });

  // Local state
  const [inputs, setInputs] = useState<CalculatorInputs | null>(null);
  const [scenarioName, setScenarioName] = useState('');
  const [showClearDialog, setShowClearDialog] = useState(false);

  // Initialize or load scenario data
  useEffect(() => {
    if (open) {
      if (currentScenarioData) {
        // Load saved scenario
        setInputs(currentScenarioData.inputs);
        setScenarioName(currentScenarioData.name);
        setHasUnsavedChanges(false);
      } else {
        // Create new with property data pre-filled
        const defaultInputs = createDefaultInputs(
          {
            price: property.listingPrice,
            address: property.address,
            propertyCode: property.recordId,
            recordId: property.recordId,
          },
          defaults || undefined
        );

        // Pre-fill wrap sales from property fields
        if (property.downPayment !== undefined) {
          defaultInputs.wrapSales.buyerDownPayment = property.downPayment;
        }
        if (property.listingPrice !== undefined) {
          defaultInputs.wrapSales.wrapSalesPrice = property.listingPrice;
        }

        setInputs(defaultInputs);
        setScenarioName(currentScenarioData?.name || `Scenario ${activeScenario}`);
        setHasUnsavedChanges(false);
      }
    }
  }, [open, currentScenarioData, activeScenario, property, defaults, setHasUnsavedChanges]);

  // Reset when switching scenarios
  useEffect(() => {
    if (currentScenarioData) {
      setInputs(currentScenarioData.inputs);
      setScenarioName(currentScenarioData.name);
      setHasUnsavedChanges(false);
    } else if (inputs) {
      // Reset to default for empty scenario
      setScenarioName(`Scenario ${activeScenario}`);
    }
  }, [activeScenario, currentScenarioData, setHasUnsavedChanges]);

  // Calculate outputs
  const outputs = inputs ? calculateAll(inputs) : null;

  // Generic input change handler
  const handleInputChange = useCallback(
    <T extends keyof CalculatorInputs>(
      section: T,
      field: keyof CalculatorInputs[T],
      value: CalculatorInputs[T][keyof CalculatorInputs[T]]
    ) => {
      if (!inputs) return;

      setInputs({
        ...inputs,
        [section]: {
          ...(inputs[section] as Record<string, unknown>),
          [field]: value,
        },
      } as CalculatorInputs);
      setHasUnsavedChanges(true);
    },
    [inputs, setHasUnsavedChanges]
  );

  // Save handler
  const handleSave = async () => {
    if (!inputs || !outputs) return;

    try {
      await saveScenario(scenarioName, inputs, outputs);
      toast.success('Scenario saved successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save scenario');
    }
  };

  // Clear handler
  const handleClear = async () => {
    try {
      await clearScenario();
      setShowClearDialog(false);
      toast.success('Scenario cleared');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to clear scenario');
    }
  };

  // Get last saved timestamp
  const lastSavedText = currentScenarioData
    ? new Date(currentScenarioData.savedAt).toLocaleDateString('en-US', {
        month: 'numeric',
        day: 'numeric',
        year: '2-digit',
      })
    : null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[95vh] p-0 gap-0">
          {/* Header */}
          <DialogHeader className="p-4 pb-3 border-b space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Calculator className="h-6 w-6 text-primary" />
                <div className="flex flex-col">
                  <DialogTitle className="text-lg font-bold">Property Calculator</DialogTitle>
                  <p className="text-sm text-muted-foreground">{property.address}</p>
                </div>
              </div>
            </div>

            {/* Scenario Tabs */}
            <ScenarioTabs
              scenarios={scenarios}
              activeScenario={activeScenario}
              onSelectScenario={(num: ScenarioNumber) => setActiveScenario(num)}
              hasUnsavedChanges={hasUnsavedChanges}
            />

            {/* Scenario Name Input */}
            <div className="space-y-1.5">
              <Label htmlFor="scenario-name" className="text-xs text-muted-foreground">
                Scenario Name
              </Label>
              <Input
                id="scenario-name"
                value={scenarioName}
                onChange={(e) => {
                  setScenarioName(e.target.value);
                  setHasUnsavedChanges(true);
                }}
                placeholder="Enter scenario name..."
                className="h-9"
              />
            </div>
          </DialogHeader>

          {/* Content */}
          <ScrollArea className="max-h-[calc(95vh-280px)]">
            {isLoading || !inputs || !outputs ? (
              <div className="flex items-center justify-center h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="p-4 space-y-4">
                {/* Quick Stats Panel */}
                <QuickStatsPanel outputs={outputs} />

                <Separator />

                {/* Input Tabs */}
                <Tabs defaultValue="property" className="w-full">
                  <TabsList className="grid w-full grid-cols-6">
                    <TabsTrigger value="property">Property</TabsTrigger>
                    <TabsTrigger value="income">Income</TabsTrigger>
                    <TabsTrigger value="loans">Loans</TabsTrigger>
                    <TabsTrigger value="wrap">Wrap</TabsTrigger>
                    <TabsTrigger value="flip">Flip</TabsTrigger>
                    <TabsTrigger value="results">
                      <BarChart3 className="h-4 w-4 mr-1" />
                      Results
                    </TabsTrigger>
                  </TabsList>

                  {/* Property Tab */}
                  <TabsContent value="property" className="space-y-4 mt-4">
                    <PropertyBasicsSection
                      inputs={inputs.propertyBasics}
                      onChange={(field, value) => handleInputChange('propertyBasics', field, value)}
                    />
                    <PurchaseCostsSection
                      inputs={inputs.purchaseCosts}
                      onChange={(field, value) => handleInputChange('purchaseCosts', field, value)}
                    />
                    <TaxInsuranceSection
                      inputs={inputs.taxInsurance}
                      onChange={(field, value) => handleInputChange('taxInsurance', field, value)}
                    />
                  </TabsContent>

                  {/* Income Tab */}
                  <TabsContent value="income" className="space-y-4 mt-4">
                    <IncomeSection
                      inputs={inputs.income}
                      onChange={(field, value) => handleInputChange('income', field, value)}
                    />
                    <OperatingSection
                      inputs={inputs.operating}
                      monthlyRent={inputs.income.monthlyRent}
                      onChange={(field, value) => handleInputChange('operating', field, value)}
                    />
                  </TabsContent>

                  {/* Loans Tab */}
                  <TabsContent value="loans" className="space-y-4 mt-4">
                    <SubjectToSection
                      inputs={inputs.subjectTo}
                      onChange={(field, value) =>
                        handleInputChange('subjectTo', field, value as never)
                      }
                    />
                    <DSCRLoanSection
                      inputs={inputs.dscrLoan}
                      purchasePrice={inputs.purchaseCosts.purchasePrice}
                      onChange={(field, value) => handleInputChange('dscrLoan', field, value as never)}
                    />
                    <SecondLoanSection
                      inputs={inputs.secondLoan}
                      onChange={(field, value) =>
                        handleInputChange('secondLoan', field, value as never)
                      }
                    />
                  </TabsContent>

                  {/* Wrap Tab */}
                  <TabsContent value="wrap" className="space-y-4 mt-4">
                    <WrapLoanSection
                      inputs={inputs.wrapLoan}
                      onChange={(field, value) => handleInputChange('wrapLoan', field, value as never)}
                    />
                    <WrapSalesSection
                      inputs={inputs.wrapSales}
                      useWrap={inputs.wrapLoan.useWrap}
                      onChange={(field, value) => handleInputChange('wrapSales', field, value)}
                    />
                  </TabsContent>

                  {/* Flip Tab */}
                  <TabsContent value="flip" className="space-y-4 mt-4">
                    <FlipSection
                      inputs={inputs.flip}
                      onChange={(field, value) => handleInputChange('flip', field, value)}
                    />
                  </TabsContent>

                  {/* Results Tab */}
                  <TabsContent value="results" className="space-y-4 mt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <LoanCalcsPanel outputs={outputs} inputs={inputs} />
                      <DealChecklistPanel outputs={outputs} inputs={inputs} />
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </ScrollArea>

          {/* Footer */}
          <div className="flex items-center justify-between p-4 border-t bg-muted/30">
            <div className="text-sm text-muted-foreground">
              {hasUnsavedChanges ? (
                <span className="text-yellow-600 font-medium">Unsaved changes</span>
              ) : lastSavedText ? (
                <span>Last saved: {lastSavedText}</span>
              ) : (
                <span>Not saved yet</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {currentScenarioData && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowClearDialog(true)}
                  disabled={isSaving}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              )}
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <Button onClick={handleSave} disabled={!hasUnsavedChanges || isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Scenario
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Clear Confirmation Dialog */}
      <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear Scenario?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the saved scenario "{scenarioName}". This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleClear} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Clear Scenario
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
