/**
 * DealCalculatorEnhanced - Enhanced calculator for Property-Buyer Matches
 * Includes persistent scenarios, buyer/property info cards, and property scenario loading
 */

import { useState, useEffect, useCallback } from 'react';
import { Calculator, Save, Loader2, Trash2, BarChart3, Download } from 'lucide-react';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import type { ScenarioNumber, SavedCalculatorScenario } from '@/types/calculatorScenario';
import { calculateAll, createDefaultInputs } from '@/lib/calculatorEngine';
import { useCalculatorDefaults, getPropertyScenarios } from '@/services/calculatorApi';
import { useCalculatorScenarios } from '@/hooks/useCalculatorScenarios';

import { ScenarioTabs } from './ScenarioTabs';
import { BuyerPropertyInfoCard } from './BuyerPropertyInfoCard';
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
} from './InputSections';
import { LoanCalcsPanel, DealChecklistPanel } from './OutputSections';

/**
 * Calculate buyer's maximum affordable monthly payment
 * Standard DTI ratio is 28% of gross monthly income for housing
 */
function calculateBuyerMaxMonthlyPayment(monthlyIncome?: number): number | undefined {
  if (!monthlyIncome || monthlyIncome <= 0) return undefined;
  return Math.round(monthlyIncome * 0.28);
}

interface DealCalculatorEnhancedProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  match: {
    matchId: string;
    property: {
      recordId: string;
      address: string;
      listingPrice?: number;
      downPayment?: number;
      monthlyPayment?: number;
    };
    buyer: {
      recordId: string;
      firstName: string;
      lastName: string;
      downPayment?: number;
      monthlyIncome?: number;
    };
  };
}

export function DealCalculatorEnhanced({
  open,
  onOpenChange,
  match,
}: DealCalculatorEnhancedProps) {
  // Fetch defaults
  const { data: defaults } = useCalculatorDefaults();

  // Scenario management for the match
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
    recordId: match.matchId,
    type: 'match',
  });

  // Local state
  const [inputs, setInputs] = useState<CalculatorInputs | null>(null);
  const [scenarioName, setScenarioName] = useState('');
  const [showClearDialog, setShowClearDialog] = useState(false);

  // Property scenarios for loading
  const [propertyScenarios, setPropertyScenarios] = useState<{
    scenario1: SavedCalculatorScenario | null;
    scenario2: SavedCalculatorScenario | null;
    scenario3: SavedCalculatorScenario | null;
  }>({ scenario1: null, scenario2: null, scenario3: null });
  const [selectedPropertyScenario, setSelectedPropertyScenario] = useState<string>('');

  // Fetch property scenarios when modal opens
  useEffect(() => {
    if (open && match.property.recordId) {
      getPropertyScenarios(match.property.recordId)
        .then(setPropertyScenarios)
        .catch((error) => {
          console.error('Failed to load property scenarios:', error);
        });
    }
  }, [open, match.property.recordId]);

  // Initialize or load scenario data
  useEffect(() => {
    if (open) {
      if (currentScenarioData) {
        // Load saved scenario
        setInputs(currentScenarioData.inputs);
        setScenarioName(currentScenarioData.name);
        setHasUnsavedChanges(false);
      } else {
        // Create new with property/buyer data pre-filled
        const defaultInputs = createDefaultInputs(
          {
            price: match.property.listingPrice,
            address: match.property.address,
            propertyCode: match.property.recordId,
            recordId: match.property.recordId,
          },
          defaults || undefined
        );

        // =====================================================
        // AUTO-POPULATE FROM BUYER DATA
        // =====================================================

        // 1. Use BUYER's down payment (not property's)
        if (match.buyer.downPayment !== undefined && match.buyer.downPayment > 0) {
          defaultInputs.wrapSales.buyerDownPayment = match.buyer.downPayment;
        } else if (match.property.downPayment !== undefined) {
          // Fallback to property's suggested down payment
          defaultInputs.wrapSales.buyerDownPayment = match.property.downPayment;
        }

        // 2. Set wrap sales price from property listing price
        if (match.property.listingPrice !== undefined) {
          defaultInputs.wrapSales.wrapSalesPrice = match.property.listingPrice;
        }

        // 3. Estimate closing costs (typically 3-4% of sales price)
        if (defaultInputs.wrapSales.wrapSalesPrice > 0) {
          defaultInputs.wrapSales.buyerClosingCosts = Math.round(
            defaultInputs.wrapSales.wrapSalesPrice * 0.03
          );
        }

        // 4. Auto-enable wrap if buyer data is present
        if (match.buyer.downPayment !== undefined && match.buyer.downPayment > 0) {
          defaultInputs.wrapLoan.useWrap = true;
        }

        setInputs(defaultInputs);
        setScenarioName(`Scenario ${activeScenario}`);
        setHasUnsavedChanges(false);
      }
    }
  }, [open, currentScenarioData, activeScenario, match, defaults, setHasUnsavedChanges]);

  // Reset when switching scenarios
  useEffect(() => {
    if (currentScenarioData) {
      setInputs(currentScenarioData.inputs);
      setScenarioName(currentScenarioData.name);
      setHasUnsavedChanges(false);
    } else if (inputs) {
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

  // Load property scenario
  const handleLoadPropertyScenario = () => {
    if (!selectedPropertyScenario) return;

    const [, scenarioNumStr] = selectedPropertyScenario.split('-');
    const scenarioNum = parseInt(scenarioNumStr) as 1 | 2 | 3;
    const scenarioKey = `scenario${scenarioNum}` as 'scenario1' | 'scenario2' | 'scenario3';
    const propertyScenario = propertyScenarios[scenarioKey];

    if (propertyScenario) {
      setInputs(propertyScenario.inputs);
      setScenarioName(`From Property: ${propertyScenario.name}`);
      setHasUnsavedChanges(true);
      toast.success(`Loaded property scenario: ${propertyScenario.name}`);
    }
  };

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

  // Build property scenario options for dropdown
  const propertyScenarioOptions: { value: string; label: string }[] = [];
  if (propertyScenarios.scenario1) {
    propertyScenarioOptions.push({
      value: 'property-1',
      label: `Scenario 1: ${propertyScenarios.scenario1.name}`,
    });
  }
  if (propertyScenarios.scenario2) {
    propertyScenarioOptions.push({
      value: 'property-2',
      label: `Scenario 2: ${propertyScenarios.scenario2.name}`,
    });
  }
  if (propertyScenarios.scenario3) {
    propertyScenarioOptions.push({
      value: 'property-3',
      label: `Scenario 3: ${propertyScenarios.scenario3.name}`,
    });
  }

  const buyerName = `${match.buyer.firstName} ${match.buyer.lastName}`.trim();

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[95vh] p-0 gap-0">
          {/* Header */}
          <DialogHeader className="p-4 pb-3 border-b space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Calculator className="h-6 w-6 text-primary" />
                <DialogTitle className="text-lg font-bold">Deal Calculator</DialogTitle>
              </div>
            </div>
          </DialogHeader>

          {/* Content */}
          <ScrollArea className="max-h-[calc(95vh-220px)]">
            {isLoading || !inputs || !outputs ? (
              <div className="flex items-center justify-center h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="p-4 space-y-4">
                {/* Property & Buyer Info Cards */}
                <BuyerPropertyInfoCard
                  property={{
                    address: match.property.address,
                    listingPrice: match.property.listingPrice,
                    downPayment: match.property.downPayment,
                    monthlyPayment: match.property.monthlyPayment,
                  }}
                  buyer={{
                    name: buyerName,
                    downPayment: match.buyer.downPayment,
                    monthlyIncome: match.buyer.monthlyIncome,
                  }}
                />

                <Separator />

                {/* Load from Property Scenario */}
                {propertyScenarioOptions.length > 0 && (
                  <>
                    <div className="flex items-end gap-2">
                      <div className="flex-1 space-y-1.5">
                        <Label htmlFor="property-scenario" className="text-xs text-muted-foreground">
                          Load from Property Scenario
                        </Label>
                        <Select value={selectedPropertyScenario} onValueChange={setSelectedPropertyScenario}>
                          <SelectTrigger id="property-scenario">
                            <SelectValue placeholder="Select a property scenario..." />
                          </SelectTrigger>
                          <SelectContent>
                            {propertyScenarioOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        onClick={handleLoadPropertyScenario}
                        disabled={!selectedPropertyScenario}
                        size="default"
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Apply
                      </Button>
                    </div>
                    <Separator />
                  </>
                )}

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

                <Separator />

                {/* Quick Stats Panel */}
                <QuickStatsPanel outputs={outputs} inputs={inputs} />

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

                  {/* Wrap Tab - Buyer Terms first, then Loan Terms */}
                  <TabsContent value="wrap" className="space-y-4 mt-4">
                    <WrapSalesSection
                      inputs={inputs.wrapSales}
                      useWrap={inputs.wrapLoan.useWrap}
                      onChange={(field, value) => handleInputChange('wrapSales', field, value)}
                      buyerLimits={{
                        maxDownPayment: match.buyer.downPayment,
                        maxMonthlyPayment: calculateBuyerMaxMonthlyPayment(match.buyer.monthlyIncome),
                        buyerName: `${match.buyer.firstName} ${match.buyer.lastName}`,
                      }}
                      calculatedMonthlyPayment={outputs?.quickStats.buyerFullMonthlyPayment}
                    />
                    <WrapLoanSection
                      inputs={inputs.wrapLoan}
                      onChange={(field, value) => handleInputChange('wrapLoan', field, value as never)}
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
            <AlertDialogAction
              onClick={handleClear}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Clear Scenario
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
