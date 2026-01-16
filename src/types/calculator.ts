/**
 * Deal Calculator Type Definitions
 * ~50 input fields organized by section, plus computed outputs
 */

// ============ INPUT SECTION TYPES ============

/**
 * Property Basics - Core property information
 */
export interface PropertyBasicsInputs {
  askingPrice: number;
  arv: number; // After Repair Value
  repairs: number;
  yourFee: number;
  creditToBuyer: number;
  wholesaleDiscount: number; // Percentage (e.g., 70 = 70%)
}

/**
 * Income - Rental income sources
 */
export interface IncomeInputs {
  monthlyRent: number;
  otherIncome: number;
}

/**
 * Purchase Costs - One-time acquisition costs
 */
export interface PurchaseCostsInputs {
  purchasePrice: number;
  closingCosts: number;
  appraisalCost: number;
  llcCost: number;
  servicingFee: number;
  sellerAllowance: number;
}

/**
 * Tax & Insurance - Annual property costs
 */
export interface TaxInsuranceInputs {
  annualTaxes: number;
  annualHomeownersInsurance: number;
  annualFloodInsurance: number;
  hasFloodInsurance: boolean;
  // Legacy field for migration support
  annualInsurance?: number;
}

/**
 * Operating Expenses - Recurring property costs
 */
export interface OperatingInputs {
  warChestPercent: number; // Percentage of rent (renamed from maintenancePercent)
  propertyMgmtPercent: number; // Percentage of rent
  hoa: number;
  utilities: number;
  // Legacy field for migration support
  maintenancePercent?: number;
}

/**
 * Subject-To Loan - Existing loan assumption
 */
export interface SubjectToInputs {
  useSubjectTo: boolean;
  subToLoanType: 'Conventional' | 'FHA' | 'VA' | 'USDA' | 'Other';
  subToPrincipal: number;
  subToInterestRate: number; // Annual percentage
  subToTermYears: number;
  subToStartDate: string; // ISO date string
  subToBalloonYears: number;
}

/**
 * DSCR Loan - Debt Service Coverage Ratio loan (now "Funding Loan 1")
 */
export interface DSCRLoanInputs {
  useDSCRLoan: boolean;
  dscrInterestRate: number; // Annual percentage
  dscrTermYears: number;
  dscrStartDate: string; // ISO date string
  dscrBalloonYears: number;
  dscrPoints: number; // Percentage of loan amount
  dscrFees: number;
  dscrLtvPercent: number; // LTV percentage (default 80)
}

/**
 * Second Loan - Additional financing
 */
export interface SecondLoanInputs {
  useLoan2: boolean;
  loan2Principal: number;
  loan2InterestRate: number; // Annual percentage
  loan2TermYears: number;
  loan2StartDate: string; // ISO date string
  loan2BalloonYears: number;
  loan2Points: number; // Percentage of loan amount
  loan2Fees: number;
}

/**
 * Wrap Loan - Seller financing wrapper
 */
export interface WrapLoanInputs {
  useWrap: boolean;
  wrapLoanType: 'Amortized' | 'Interest Only';
  wrapInterestRate: number; // Annual percentage
  wrapTermYears: number;
  wrapStartDate: string; // ISO date string
  wrapBalloonYears: number;
  wrapPoints: number; // Percentage of loan amount
  wrapFees: number;
  wrapServiceFee: number; // Monthly servicing fee
}

/**
 * Wrap Sales Terms - Buyer's purchase terms
 */
export interface WrapSalesInputs {
  wrapSalesPrice: number;
  buyerDownPayment: number;
  buyerClosingCosts: number;
}

// FlipInputs removed - calculator is now wrap-focused only

/**
 * Complete Calculator Inputs - All sections combined
 * Note: flip inputs removed - calculator is now wrap-focused only
 */
export interface CalculatorInputs {
  // Metadata
  name: string;
  propertyRecordId?: string; // Link to Airtable property
  buyerRecordId?: string; // Link to Airtable buyer
  propertyCode?: string;
  contactId?: string;

  // All input sections
  propertyBasics: PropertyBasicsInputs;
  income: IncomeInputs;
  purchaseCosts: PurchaseCostsInputs;
  taxInsurance: TaxInsuranceInputs;
  operating: OperatingInputs;
  subjectTo: SubjectToInputs;
  dscrLoan: DSCRLoanInputs;
  secondLoan: SecondLoanInputs;
  wrapLoan: WrapLoanInputs;
  wrapSales: WrapSalesInputs;
}

// ============ OUTPUT TYPES ============

/**
 * Quick Stats - Key metrics displayed prominently (WRAP FOCUSED)
 */
export interface QuickStatsOutputs {
  totalEntryFee: number; // Purple Homes' upfront cost
  wrapCashflow: number; // Purple Homes' monthly profit
  cashOnCashWrap: number; // CoC return for wrap (percentage)
  buyerFullMonthlyPayment: number; // The marketing number (P&I + T&I + cushion + service)
  rentalFallbackCashflow: number; // If wrap fails, rental income
  escrowCushion: number; // Monthly escrow cushion amount
}

/**
 * Loan Calculations - Detailed loan outputs
 */
export interface LoanCalcsOutputs {
  // DSCR / Funding Loan 1
  dscrLoanAmount: number;
  dscrMonthlyPayment: number;
  dscrBalloonAmount: number;
  dscrDownPayment: number;
  // Subject-To
  subToMonthlyPayment: number;
  subToCurrentBalance: number;
  subToBalloonAmount: number;
  // Second Loan / Funding Loan 2
  loan2MonthlyPayment: number;
  loan2BalloonAmount: number;
  // Wrap Loan
  wrapPrincipal: number;
  wrapMonthlyPayment: number;
  wrapBalloonAmount: number;
  // Buyer payment breakdown
  buyerMonthlyPITI: number; // Legacy: P&I + T&I only
  buyerFullMonthlyPayment: number; // Full: P&I + T&I + cushion + service fee
  escrowCushion: number;
  // Explicit P&I for display
  fundingLoan1PI: number;
  fundingLoan2PI: number;
}

/**
 * Totals - Aggregated income and expenses
 */
export interface TotalsOutputs {
  totalMonthlyIncome: number;
  totalMonthlyPI: number; // Principal + Interest payments
  totalMonthlyTI: number; // Taxes + Insurance
  totalMonthlyWarChest: number; // Renamed from totalMonthlyMaintenance
  totalMonthlyPropertyMgmt: number;
  totalMonthlyExpenses: number;
}

/**
 * Deal Checklist - Pass/fail criteria (WRAP FOCUSED)
 */
export interface DealChecklistOutputs {
  entryFeeUnder25k: boolean;
  wrapCashflowOver300: boolean;
  ltvUnder75: boolean;
  equityOver15k: boolean;
  rentalFallbackPositive: boolean;
  dealDecision: 'DEAL' | 'NO DEAL' | 'NEEDS REVIEW';
}

/**
 * Complete Calculator Outputs - All computed values
 */
export interface CalculatorOutputs {
  quickStats: QuickStatsOutputs;
  loanCalcs: LoanCalcsOutputs;
  totals: TotalsOutputs;
  dealChecklist: DealChecklistOutputs;
}

// ============ SCENARIO & RECORD TYPES ============

/**
 * Calculator Scenario - For side-by-side comparison
 */
export interface CalculatorScenario {
  id: string;
  name: string;
  inputs: CalculatorInputs;
  outputs: CalculatorOutputs;
  isDefault?: boolean;
}

/**
 * Saved Calculation - Full record from Airtable
 */
export interface SavedCalculation {
  id: string;
  name: string;
  propertyRecordId?: string;
  buyerRecordId?: string;
  propertyCode?: string;
  contactId?: string;
  inputs: CalculatorInputs;
  outputs: CalculatorOutputs;
  createdAt: string;
  updatedAt: string;
}

/**
 * Calculator Defaults - User-configurable default values
 */
export interface CalculatorDefaults {
  id?: string;
  wholesaleDiscount: number;
  yourFee?: number;
  creditToBuyer?: number;
  warChestPercent: number;
  maintenancePercent?: number; // Legacy, kept for migration
  propertyMgmtPercent: number;
  dscrInterestRate: number;
  dscrTermYears: number;
  dscrBalloonYears: number;
  dscrPoints: number;
  dscrFees: number;
  dscrLtvPercent: number;
  wrapInterestRate: number;
  wrapTermYears: number;
  wrapBalloonYears: number;
  wrapServiceFee: number;
  closingCosts: number;
  appraisalCost: number;
  llcCost: number;
  servicingFee: number;
  updatedAt?: string;
}

// ============ API RESPONSE TYPES ============

/**
 * API response for list calculations
 */
export interface CalculationsListResponse {
  calculations: SavedCalculation[];
  nextOffset?: string;
}

/**
 * API response for single calculation
 */
export interface CalculationResponse {
  calculation: SavedCalculation;
}

/**
 * API response for defaults
 */
export interface CalculatorDefaultsResponse {
  defaults: CalculatorDefaults;
}

// ============ SLIDER CONFIGURATION ============

/**
 * Slider field configuration
 */
export interface SliderFieldConfig {
  min: number;
  max: number;
  step: number;
  format?: 'currency' | 'percentage' | 'number' | 'months' | 'years';
  prefix?: string;
  suffix?: string;
}

/**
 * Default slider configurations for common fields
 */
export const SLIDER_CONFIGS: Record<string, SliderFieldConfig> = {
  // Property values
  askingPrice: { min: 50000, max: 1000000, step: 5000, format: 'currency' },
  arv: { min: 50000, max: 1500000, step: 5000, format: 'currency' },
  repairs: { min: 0, max: 200000, step: 1000, format: 'currency' },
  purchasePrice: { min: 50000, max: 1000000, step: 5000, format: 'currency' },

  // Fees and costs
  yourFee: { min: 0, max: 50000, step: 500, format: 'currency' },
  creditToBuyer: { min: 0, max: 25000, step: 500, format: 'currency' },
  closingCosts: { min: 0, max: 25000, step: 500, format: 'currency' },
  appraisalCost: { min: 0, max: 2000, step: 100, format: 'currency' },
  llcCost: { min: 0, max: 1000, step: 50, format: 'currency' },
  servicingFee: { min: 0, max: 500, step: 25, format: 'currency' },
  sellerAllowance: { min: 0, max: 25000, step: 500, format: 'currency' },

  // Income
  monthlyRent: { min: 0, max: 10000, step: 50, format: 'currency' },
  otherIncome: { min: 0, max: 2000, step: 50, format: 'currency' },

  // Annual costs - Split insurance
  annualTaxes: { min: 0, max: 25000, step: 100, format: 'currency' },
  annualHomeownersInsurance: { min: 0, max: 10000, step: 100, format: 'currency' },
  annualFloodInsurance: { min: 0, max: 5000, step: 100, format: 'currency' },
  annualInsurance: { min: 0, max: 10000, step: 100, format: 'currency' }, // Legacy

  // Operating
  hoa: { min: 0, max: 1000, step: 25, format: 'currency' },
  utilities: { min: 0, max: 500, step: 25, format: 'currency' },

  // Percentages
  wholesaleDiscount: { min: 50, max: 95, step: 1, format: 'percentage' },
  warChestPercent: { min: 0, max: 20, step: 1, format: 'percentage' },
  maintenancePercent: { min: 0, max: 20, step: 1, format: 'percentage' }, // Legacy
  propertyMgmtPercent: { min: 0, max: 15, step: 1, format: 'percentage' },

  // LTV
  dscrLtvPercent: { min: 50, max: 100, step: 1, format: 'percentage' },

  // Loan amounts
  subToPrincipal: { min: 0, max: 500000, step: 5000, format: 'currency' },
  loan2Principal: { min: 0, max: 200000, step: 5000, format: 'currency' },

  // Interest rates - Allow 0% for seller financing, finer step
  subToInterestRate: { min: 0, max: 15, step: 0.125, format: 'percentage' },
  dscrInterestRate: { min: 0, max: 15, step: 0.001, format: 'percentage' },
  loan2InterestRate: { min: 0, max: 18, step: 0.125, format: 'percentage' },
  wrapInterestRate: { min: 0, max: 15, step: 0.001, format: 'percentage' },

  // Terms (years) - Extended to 50 years
  subToTermYears: { min: 5, max: 50, step: 1, format: 'years' },
  dscrTermYears: { min: 5, max: 50, step: 1, format: 'years' },
  loan2TermYears: { min: 1, max: 50, step: 1, format: 'years' },
  wrapTermYears: { min: 5, max: 50, step: 1, format: 'years' },

  // Balloon years - Extended to 29 years
  subToBalloonYears: { min: 0, max: 29, step: 1, format: 'years' },
  dscrBalloonYears: { min: 0, max: 29, step: 1, format: 'years' },
  loan2BalloonYears: { min: 0, max: 29, step: 1, format: 'years' },
  wrapBalloonYears: { min: 0, max: 29, step: 1, format: 'years' },

  // Points
  dscrPoints: { min: 0, max: 5, step: 0.25, format: 'percentage' },
  loan2Points: { min: 0, max: 5, step: 0.25, format: 'percentage' },
  wrapPoints: { min: 0, max: 5, step: 0.25, format: 'percentage' },

  // Loan fees
  dscrFees: { min: 0, max: 10000, step: 100, format: 'currency' },
  loan2Fees: { min: 0, max: 5000, step: 100, format: 'currency' },
  wrapFees: { min: 0, max: 5000, step: 100, format: 'currency' },
  wrapServiceFee: { min: 0, max: 100, step: 5, format: 'currency' },

  // Wrap sales
  wrapSalesPrice: { min: 50000, max: 1500000, step: 5000, format: 'currency' },
  buyerDownPayment: { min: 5000, max: 200000, step: 1000, format: 'currency' },
  buyerClosingCosts: { min: 0, max: 15000, step: 500, format: 'currency' },
};

// ============ DEFAULT VALUES ============

/**
 * System default values for calculator
 */
export const DEFAULT_CALCULATOR_VALUES: CalculatorDefaults = {
  wholesaleDiscount: 70,
  warChestPercent: 5,
  maintenancePercent: 5, // Legacy, kept for migration
  propertyMgmtPercent: 10,
  dscrInterestRate: 8,
  dscrTermYears: 30,
  dscrBalloonYears: 5,
  dscrPoints: 2,
  dscrFees: 1500,
  dscrLtvPercent: 80,
  wrapInterestRate: 9,
  wrapTermYears: 30,
  wrapBalloonYears: 5,
  wrapServiceFee: 35,
  closingCosts: 3000,
  appraisalCost: 500,
  llcCost: 200,
  servicingFee: 100,
};
