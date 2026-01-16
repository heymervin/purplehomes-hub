/**
 * Deal Calculator Calculation Engine
 * All formulas run client-side for instant real-time feedback
 */

import type {
  CalculatorInputs,
  CalculatorOutputs,
  QuickStatsOutputs,
  LoanCalcsOutputs,
  TotalsOutputs,
  DealChecklistOutputs,
  CalculatorDefaults,
  PropertyBasicsInputs,
  IncomeInputs,
  PurchaseCostsInputs,
  TaxInsuranceInputs,
  OperatingInputs,
  SubjectToInputs,
  DSCRLoanInputs,
  SecondLoanInputs,
  WrapLoanInputs,
  WrapSalesInputs,
} from '@/types/calculator';
import { DEFAULT_CALCULATOR_VALUES } from '@/types/calculator';

// ============ CORE FINANCIAL FUNCTIONS ============

/**
 * Calculate monthly loan payment using PMT formula
 * PMT = (PV * r * (1+r)^n) / ((1+r)^n - 1)
 *
 * @param principal - Loan amount (PV)
 * @param annualRate - Annual interest rate as percentage (e.g., 8 for 8%)
 * @param termYears - Loan term in years
 * @returns Monthly payment amount
 */
export function calculateMonthlyPayment(
  principal: number,
  annualRate: number,
  termYears: number
): number {
  if (principal <= 0 || termYears <= 0) return 0;
  if (annualRate <= 0) return principal / (termYears * 12);

  const monthlyRate = annualRate / 100 / 12;
  const numPayments = termYears * 12;
  const factor = Math.pow(1 + monthlyRate, numPayments);

  return (principal * monthlyRate * factor) / (factor - 1);
}

/**
 * Calculate interest-only monthly payment
 *
 * @param principal - Loan amount
 * @param annualRate - Annual interest rate as percentage
 * @returns Monthly interest-only payment
 */
export function calculateInterestOnlyPayment(
  principal: number,
  annualRate: number
): number {
  if (principal <= 0 || annualRate <= 0) return 0;
  return (principal * annualRate / 100) / 12;
}

/**
 * Calculate balloon balance at specified years
 * Uses amortization schedule to determine remaining balance
 *
 * @param principal - Original loan amount
 * @param annualRate - Annual interest rate as percentage
 * @param termYears - Original loan term in years
 * @param balloonYears - Years until balloon payment
 * @returns Remaining balance at balloon date
 */
export function calculateBalloonBalance(
  principal: number,
  annualRate: number,
  termYears: number,
  balloonYears: number
): number {
  if (principal <= 0 || termYears <= 0) return 0;
  if (balloonYears <= 0) return principal;
  if (balloonYears >= termYears) return 0;

  const monthlyPayment = calculateMonthlyPayment(principal, annualRate, termYears);
  const monthlyRate = annualRate / 100 / 12;
  const numPayments = balloonYears * 12;

  if (annualRate <= 0) {
    // Simple calculation for 0% interest
    return principal - (monthlyPayment * numPayments);
  }

  let balance = principal;
  for (let i = 0; i < numPayments; i++) {
    const interest = balance * monthlyRate;
    const principalPaid = monthlyPayment - interest;
    balance -= principalPaid;
  }

  return Math.max(0, balance);
}

/**
 * Calculate current loan balance based on start date
 * Estimates how many payments have been made since loan origination
 *
 * @param originalPrincipal - Original loan amount
 * @param annualRate - Annual interest rate as percentage
 * @param termYears - Original loan term in years
 * @param startDate - ISO date string of loan start
 * @returns Current estimated balance
 */
export function calculateCurrentBalance(
  originalPrincipal: number,
  annualRate: number,
  termYears: number,
  startDate: string
): number {
  if (!startDate || originalPrincipal <= 0) return originalPrincipal;

  const start = new Date(startDate);
  const now = new Date();
  const monthsElapsed = Math.max(0,
    (now.getFullYear() - start.getFullYear()) * 12 +
    (now.getMonth() - start.getMonth())
  );

  const yearsElapsed = monthsElapsed / 12;
  if (yearsElapsed >= termYears) return 0;

  return calculateBalloonBalance(originalPrincipal, annualRate, termYears, yearsElapsed);
}

// ============ DEAL CALCULATION FUNCTIONS ============

/**
 * Calculate escrow cushion (T&I buffer)
 * 14 months of T&I spread over 12 months
 */
export function calculateEscrowCushion(annualTaxes: number, annualInsurance: number): number {
  return ((annualTaxes + annualInsurance) * 14) / 12 / 12; // Monthly cushion amount
}

/**
 * Calculate MAO (Maximum Allowable Offer)
 * MAO = (ARV - repairs - yourFee - creditToBuyer) * (wholesaleDiscount / 100)
 */
export function calculateMAO(propertyBasics: PropertyBasicsInputs): number {
  const { arv, repairs, yourFee, creditToBuyer, wholesaleDiscount } = propertyBasics;
  const netARV = arv - repairs - yourFee - creditToBuyer;
  return netARV * (wholesaleDiscount / 100);
}

/**
 * Calculate DSCR loan amount based on LTV
 */
export function calculateDSCRLoanAmount(purchasePrice: number, ltvPercent: number = 80): number {
  return purchasePrice * (ltvPercent / 100);
}

/**
 * Calculate all loan-related outputs
 */
export function calculateLoanCalcs(inputs: CalculatorInputs): LoanCalcsOutputs {
  const { purchaseCosts, subjectTo, dscrLoan, secondLoan, wrapLoan, wrapSales, taxInsurance } = inputs;

  // Get LTV (default 80%)
  const ltvPercent = dscrLoan.dscrLtvPercent ?? 80;

  // DSCR Loan calculations (now "Funding Loan 1")
  const dscrLoanAmount = dscrLoan.useDSCRLoan
    ? calculateDSCRLoanAmount(purchaseCosts.purchasePrice, ltvPercent)
    : 0;
  const dscrDownPayment = dscrLoan.useDSCRLoan
    ? purchaseCosts.purchasePrice - dscrLoanAmount
    : 0;
  const dscrMonthlyPayment = dscrLoan.useDSCRLoan
    ? calculateMonthlyPayment(dscrLoanAmount, dscrLoan.dscrInterestRate, dscrLoan.dscrTermYears)
    : 0;
  const dscrBalloonAmount = dscrLoan.useDSCRLoan && dscrLoan.dscrBalloonYears > 0
    ? calculateBalloonBalance(dscrLoanAmount, dscrLoan.dscrInterestRate, dscrLoan.dscrTermYears, dscrLoan.dscrBalloonYears)
    : 0;

  // Subject-To Loan calculations
  const subToCurrentBalance = subjectTo.useSubjectTo
    ? (subjectTo.subToStartDate
        ? calculateCurrentBalance(subjectTo.subToPrincipal, subjectTo.subToInterestRate, subjectTo.subToTermYears, subjectTo.subToStartDate)
        : subjectTo.subToPrincipal)
    : 0;
  const subToMonthlyPayment = subjectTo.useSubjectTo
    ? calculateMonthlyPayment(subjectTo.subToPrincipal, subjectTo.subToInterestRate, subjectTo.subToTermYears)
    : 0;
  // Subject-To balloon calculation
  const subToBalloonAmount = subjectTo.useSubjectTo && subjectTo.subToBalloonYears > 0
    ? calculateBalloonBalance(subToCurrentBalance, subjectTo.subToInterestRate, subjectTo.subToTermYears, subjectTo.subToBalloonYears)
    : 0;

  // Second Loan calculations (now "Funding Loan 2")
  const loan2MonthlyPayment = secondLoan.useLoan2
    ? calculateMonthlyPayment(secondLoan.loan2Principal, secondLoan.loan2InterestRate, secondLoan.loan2TermYears)
    : 0;
  const loan2BalloonAmount = secondLoan.useLoan2 && secondLoan.loan2BalloonYears > 0
    ? calculateBalloonBalance(secondLoan.loan2Principal, secondLoan.loan2InterestRate, secondLoan.loan2TermYears, secondLoan.loan2BalloonYears)
    : 0;

  // FIXED: Wrap principal formula
  // Closing costs come FROM down payment, not subtracted from principal
  // So principal = salesPrice - downPayment + closingCosts (buyer pays closing from their DP)
  const wrapPrincipal = wrapLoan.useWrap
    ? wrapSales.wrapSalesPrice - wrapSales.buyerDownPayment + wrapSales.buyerClosingCosts
    : 0;
  const wrapMonthlyPayment = wrapLoan.useWrap
    ? (wrapLoan.wrapLoanType === 'Interest Only'
        ? calculateInterestOnlyPayment(wrapPrincipal, wrapLoan.wrapInterestRate)
        : calculateMonthlyPayment(wrapPrincipal, wrapLoan.wrapInterestRate, wrapLoan.wrapTermYears))
    : 0;
  const wrapBalloonAmount = wrapLoan.useWrap && wrapLoan.wrapBalloonYears > 0
    ? (wrapLoan.wrapLoanType === 'Interest Only'
        ? wrapPrincipal // Interest only = full principal due at balloon
        : calculateBalloonBalance(wrapPrincipal, wrapLoan.wrapInterestRate, wrapLoan.wrapTermYears, wrapLoan.wrapBalloonYears))
    : 0;

  // Calculate total annual insurance (homeowners + flood)
  const annualInsurance = (taxInsurance.annualHomeownersInsurance ?? taxInsurance.annualInsurance ?? 0) +
    (taxInsurance.hasFloodInsurance ? (taxInsurance.annualFloodInsurance ?? 0) : 0);

  // Monthly T&I
  const monthlyTaxes = taxInsurance.annualTaxes / 12;
  const monthlyInsurance = annualInsurance / 12;

  // Escrow cushion (14 months T&I spread over 12 months)
  const escrowCushion = calculateEscrowCushion(taxInsurance.annualTaxes, annualInsurance);

  // Buyer Monthly PITI (old calculation for backwards compatibility)
  const buyerMonthlyPITI = wrapMonthlyPayment + monthlyTaxes + monthlyInsurance;

  // NEW: Buyer's full monthly payment (P&I + T&I + escrow cushion + service fee)
  const buyerFullMonthlyPayment = wrapLoan.useWrap
    ? wrapMonthlyPayment + monthlyTaxes + monthlyInsurance + escrowCushion + wrapLoan.wrapServiceFee
    : 0;

  // Explicit P&I displays for funding loans
  const fundingLoan1PI = dscrMonthlyPayment;
  const fundingLoan2PI = loan2MonthlyPayment;

  return {
    dscrLoanAmount,
    dscrDownPayment,
    dscrMonthlyPayment,
    dscrBalloonAmount,
    subToMonthlyPayment,
    subToCurrentBalance,
    subToBalloonAmount,
    loan2MonthlyPayment,
    loan2BalloonAmount,
    wrapPrincipal,
    wrapMonthlyPayment,
    wrapBalloonAmount,
    buyerMonthlyPITI,
    buyerFullMonthlyPayment,
    escrowCushion,
    fundingLoan1PI,
    fundingLoan2PI,
  };
}

/**
 * Calculate income and expense totals
 */
export function calculateTotals(inputs: CalculatorInputs, loanCalcs: LoanCalcsOutputs): TotalsOutputs {
  const { income, taxInsurance, operating } = inputs;

  // Total monthly income
  const totalMonthlyIncome = income.monthlyRent + income.otherIncome;

  // Total monthly P&I (all loan payments)
  const totalMonthlyPI =
    loanCalcs.dscrMonthlyPayment +
    loanCalcs.subToMonthlyPayment +
    loanCalcs.loan2MonthlyPayment;

  // Calculate total annual insurance (homeowners + flood) for backwards compatibility
  const annualInsurance = (taxInsurance.annualHomeownersInsurance ?? taxInsurance.annualInsurance ?? 0) +
    (taxInsurance.hasFloodInsurance ? (taxInsurance.annualFloodInsurance ?? 0) : 0);

  // Total monthly T&I (taxes and insurance)
  const totalMonthlyTI = (taxInsurance.annualTaxes + annualInsurance) / 12;

  // War Chest (renamed from Maintenance) - supports both field names for migration
  const warChestPercent = operating.warChestPercent ?? operating.maintenancePercent ?? 5;
  const totalMonthlyWarChest = income.monthlyRent * (warChestPercent / 100);

  // Property management
  const totalMonthlyPropertyMgmt = totalMonthlyIncome * (operating.propertyMgmtPercent / 100);

  // Total monthly expenses
  const totalMonthlyExpenses =
    totalMonthlyPI +
    totalMonthlyTI +
    totalMonthlyWarChest +
    totalMonthlyPropertyMgmt +
    operating.hoa +
    operating.utilities;

  return {
    totalMonthlyIncome,
    totalMonthlyPI,
    totalMonthlyTI,
    totalMonthlyWarChest,
    totalMonthlyPropertyMgmt,
    totalMonthlyExpenses,
  };
}

/**
 * Calculate quick stats (key metrics) - WRAP FOCUSED
 */
export function calculateQuickStats(
  inputs: CalculatorInputs,
  loanCalcs: LoanCalcsOutputs,
  totals: TotalsOutputs
): QuickStatsOutputs {
  const { propertyBasics, purchaseCosts, income, operating, taxInsurance, wrapLoan, wrapSales, dscrLoan, secondLoan } = inputs;

  // Wrap Cashflow (Purple Homes' monthly profit)
  const underlyingPayments = loanCalcs.subToMonthlyPayment + loanCalcs.dscrMonthlyPayment + loanCalcs.loan2MonthlyPayment;
  const wrapCashflow = wrapLoan.useWrap
    ? loanCalcs.wrapMonthlyPayment - underlyingPayments - wrapLoan.wrapServiceFee
    : 0;

  // Total Entry Fee (Purple Homes' upfront cost)
  const dscrUpfrontCosts = dscrLoan.useDSCRLoan
    ? (loanCalcs.dscrLoanAmount * dscrLoan.dscrPoints / 100) + dscrLoan.dscrFees
    : 0;
  const loan2UpfrontCosts = secondLoan.useLoan2
    ? (secondLoan.loan2Principal * secondLoan.loan2Points / 100) + secondLoan.loan2Fees
    : 0;
  const wrapUpfrontCosts = wrapLoan.useWrap
    ? (loanCalcs.wrapPrincipal * wrapLoan.wrapPoints / 100) + wrapLoan.wrapFees
    : 0;

  const totalEntryFee =
    purchaseCosts.closingCosts +
    purchaseCosts.appraisalCost +
    purchaseCosts.llcCost +
    purchaseCosts.servicingFee +
    dscrUpfrontCosts +
    loan2UpfrontCosts +
    wrapUpfrontCosts;

  // Wrap CoC: Wrap net (including down payment received)
  const wrapNetAtClosing = wrapLoan.useWrap
    ? wrapSales.buyerDownPayment - wrapSales.buyerClosingCosts - totalEntryFee
    : 0;
  const wrapTotalInvested = Math.max(1, Math.abs(wrapNetAtClosing) > 0 ? Math.abs(wrapNetAtClosing) : 1);
  const annualWrapCashflow = wrapCashflow * 12;
  const cashOnCashWrap = wrapLoan.useWrap
    ? (annualWrapCashflow / wrapTotalInvested) * 100
    : 0;

  // Rental Fallback Calculation (if wrap fails)
  // Calculate total annual insurance (homeowners + flood)
  const annualInsurance = (taxInsurance.annualHomeownersInsurance ?? taxInsurance.annualInsurance ?? 0) +
    (taxInsurance.hasFloodInsurance ? (taxInsurance.annualFloodInsurance ?? 0) : 0);
  const warChestPercent = operating.warChestPercent ?? operating.maintenancePercent ?? 5;

  const rentalFallbackCashflow = income.monthlyRent > 0
    ? income.monthlyRent -
      totals.totalMonthlyPI -
      ((taxInsurance.annualTaxes + annualInsurance) / 12) -
      (income.monthlyRent * warChestPercent / 100) -
      (income.monthlyRent * operating.propertyMgmtPercent / 100) -
      operating.hoa -
      operating.utilities
    : 0;

  return {
    totalEntryFee,
    wrapCashflow,
    cashOnCashWrap,
    buyerFullMonthlyPayment: loanCalcs.buyerFullMonthlyPayment,
    rentalFallbackCashflow,
    escrowCushion: loanCalcs.escrowCushion,
  };
}

/**
 * Calculate deal checklist (pass/fail criteria) - WRAP FOCUSED
 */
export function calculateDealChecklist(
  inputs: CalculatorInputs,
  quickStats: QuickStatsOutputs,
  loanCalcs: LoanCalcsOutputs
): DealChecklistOutputs {
  const { propertyBasics, purchaseCosts, wrapLoan } = inputs;

  // Entry Fee < $25k
  const entryFeeUnder25k = quickStats.totalEntryFee < 25000;

  // Wrap Cashflow > $300
  const wrapCashflowOver300 = quickStats.wrapCashflow >= 300;

  // LTV < 75% (total loans / ARV)
  const totalLoanAmount =
    loanCalcs.dscrLoanAmount +
    loanCalcs.subToCurrentBalance +
    (inputs.secondLoan.useLoan2 ? inputs.secondLoan.loan2Principal : 0);
  const ltv = propertyBasics.arv > 0 ? (totalLoanAmount / propertyBasics.arv) * 100 : 0;
  const ltvUnder75 = ltv <= 75;

  // Equity > $15k
  const equity = propertyBasics.arv - purchaseCosts.purchasePrice - propertyBasics.repairs;
  const equityOver15k = equity >= 15000;

  // Rental Fallback positive
  const rentalFallbackPositive = quickStats.rentalFallbackCashflow >= 0;

  // Deal Decision Logic - wrap focused
  const criteriaMet = [
    entryFeeUnder25k,
    wrapCashflowOver300,
    ltvUnder75,
    equityOver15k,
    wrapLoan.useWrap ? rentalFallbackPositive : true, // Only check if wrap enabled
  ].filter(Boolean).length;

  let dealDecision: DealChecklistOutputs['dealDecision'];
  if (criteriaMet >= 4) {
    dealDecision = 'DEAL';
  } else if (criteriaMet >= 2) {
    dealDecision = 'NEEDS REVIEW';
  } else {
    dealDecision = 'NO DEAL';
  }

  return {
    entryFeeUnder25k,
    wrapCashflowOver300,
    ltvUnder75,
    equityOver15k,
    rentalFallbackPositive,
    dealDecision,
  };
}

// ============ MAIN CALCULATION FUNCTION ============

/**
 * Main calculation function - computes all outputs from inputs
 * This is the primary entry point for real-time calculations
 */
export function calculateAll(inputs: CalculatorInputs): CalculatorOutputs {
  const loanCalcs = calculateLoanCalcs(inputs);
  const totals = calculateTotals(inputs, loanCalcs);
  const quickStats = calculateQuickStats(inputs, loanCalcs, totals);
  const dealChecklist = calculateDealChecklist(inputs, quickStats, loanCalcs);

  return {
    quickStats,
    loanCalcs,
    totals,
    dealChecklist,
  };
}

// ============ DEFAULT INPUT GENERATORS ============

/**
 * Create default property basics inputs
 */
export function createDefaultPropertyBasics(
  propertyData?: { price?: number },
  defaults?: Partial<CalculatorDefaults>
): PropertyBasicsInputs {
  const d = { ...DEFAULT_CALCULATOR_VALUES, ...defaults };
  return {
    askingPrice: propertyData?.price || 0,
    arv: propertyData?.price || 0,
    repairs: 0,
    yourFee: 0,
    creditToBuyer: 0,
    wholesaleDiscount: d.wholesaleDiscount,
  };
}

/**
 * Create default income inputs
 */
export function createDefaultIncomeInputs(): IncomeInputs {
  return {
    monthlyRent: 0,
    otherIncome: 0,
  };
}

/**
 * Create default purchase costs inputs
 */
export function createDefaultPurchaseCostsInputs(
  propertyData?: { price?: number },
  defaults?: Partial<CalculatorDefaults>
): PurchaseCostsInputs {
  const d = { ...DEFAULT_CALCULATOR_VALUES, ...defaults };
  return {
    purchasePrice: propertyData?.price || 0,
    closingCosts: d.closingCosts,
    appraisalCost: d.appraisalCost,
    llcCost: d.llcCost,
    servicingFee: d.servicingFee,
    sellerAllowance: 0,
  };
}

/**
 * Create default tax and insurance inputs
 */
export function createDefaultTaxInsuranceInputs(): TaxInsuranceInputs {
  return {
    annualTaxes: 0,
    annualHomeownersInsurance: 0,
    annualFloodInsurance: 0,
    hasFloodInsurance: false,
  };
}

/**
 * Create default operating inputs
 */
export function createDefaultOperatingInputs(
  defaults?: Partial<CalculatorDefaults>
): OperatingInputs {
  const d = { ...DEFAULT_CALCULATOR_VALUES, ...defaults };
  return {
    warChestPercent: d.warChestPercent ?? d.maintenancePercent ?? 5,
    propertyMgmtPercent: d.propertyMgmtPercent,
    hoa: 0,
    utilities: 0,
  };
}

/**
 * Create default subject-to inputs
 */
export function createDefaultSubjectToInputs(): SubjectToInputs {
  return {
    useSubjectTo: false,
    subToLoanType: 'Conventional',
    subToPrincipal: 0,
    subToInterestRate: 0,
    subToTermYears: 30,
    subToStartDate: '',
    subToBalloonYears: 0,
  };
}

/**
 * Create default DSCR loan inputs (Funding Loan 1)
 */
export function createDefaultDSCRLoanInputs(
  defaults?: Partial<CalculatorDefaults>
): DSCRLoanInputs {
  const d = { ...DEFAULT_CALCULATOR_VALUES, ...defaults };
  return {
    useDSCRLoan: false,
    dscrInterestRate: d.dscrInterestRate,
    dscrTermYears: d.dscrTermYears,
    dscrStartDate: '',
    dscrBalloonYears: d.dscrBalloonYears,
    dscrPoints: d.dscrPoints,
    dscrFees: d.dscrFees,
    dscrLtvPercent: d.dscrLtvPercent ?? 80,
  };
}

/**
 * Create default second loan inputs
 */
export function createDefaultSecondLoanInputs(): SecondLoanInputs {
  return {
    useLoan2: false,
    loan2Principal: 0,
    loan2InterestRate: 10,
    loan2TermYears: 5,
    loan2StartDate: '',
    loan2BalloonYears: 5,
    loan2Points: 0,
    loan2Fees: 0,
  };
}

/**
 * Create default wrap loan inputs
 */
export function createDefaultWrapLoanInputs(
  defaults?: Partial<CalculatorDefaults>
): WrapLoanInputs {
  const d = { ...DEFAULT_CALCULATOR_VALUES, ...defaults };
  return {
    useWrap: false,
    wrapLoanType: 'Amortized',
    wrapInterestRate: d.wrapInterestRate,
    wrapTermYears: d.wrapTermYears,
    wrapStartDate: '',
    wrapBalloonYears: d.wrapBalloonYears,
    wrapPoints: 0,
    wrapFees: 0,
    wrapServiceFee: d.wrapServiceFee,
  };
}

/**
 * Create default wrap sales inputs
 */
export function createDefaultWrapSalesInputs(): WrapSalesInputs {
  return {
    wrapSalesPrice: 0,
    buyerDownPayment: 0,
    buyerClosingCosts: 0,
  };
}


/**
 * Create complete default inputs
 * Auto-populates from property data if provided
 */
export function createDefaultInputs(
  propertyData?: {
    price?: number;
    beds?: number;
    baths?: number;
    sqft?: number;
    address?: string;
    propertyCode?: string;
    recordId?: string;
  },
  defaults?: Partial<CalculatorDefaults>
): CalculatorInputs {
  return {
    name: propertyData?.address || 'New Calculation',
    propertyRecordId: propertyData?.recordId,
    propertyCode: propertyData?.propertyCode,
    propertyBasics: createDefaultPropertyBasics(propertyData, defaults),
    income: createDefaultIncomeInputs(),
    purchaseCosts: createDefaultPurchaseCostsInputs(propertyData, defaults),
    taxInsurance: createDefaultTaxInsuranceInputs(),
    operating: createDefaultOperatingInputs(defaults),
    subjectTo: createDefaultSubjectToInputs(),
    dscrLoan: createDefaultDSCRLoanInputs(defaults),
    secondLoan: createDefaultSecondLoanInputs(),
    wrapLoan: createDefaultWrapLoanInputs(defaults),
    wrapSales: createDefaultWrapSalesInputs(),
  };
}

// ============ UTILITY FUNCTIONS ============

/**
 * Format currency for display (2 decimal places)
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Format currency for display (no decimals) - for large values
 */
export function formatCurrencyWhole(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Format percentage for display
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Parse currency string to number
 */
export function parseCurrency(value: string): number {
  const cleaned = value.replace(/[$,]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Deep clone inputs for scenario duplication
 */
export function cloneInputs(inputs: CalculatorInputs): CalculatorInputs {
  return JSON.parse(JSON.stringify(inputs));
}

/**
 * Migrate old scenario inputs to new format
 * Handles backwards compatibility for:
 * - maintenancePercent → warChestPercent
 * - annualInsurance → annualHomeownersInsurance (flood split)
 * - Removes flip data if present
 */
export function migrateScenarioInputs(oldInputs: unknown): CalculatorInputs {
  const inputs = oldInputs as Record<string, unknown>;

  // Start with sensible defaults
  const migrated = createDefaultInputs();

  // Copy over all valid sections
  if (inputs.name) migrated.name = inputs.name as string;
  if (inputs.propertyRecordId) migrated.propertyRecordId = inputs.propertyRecordId as string;
  if (inputs.propertyCode) migrated.propertyCode = inputs.propertyCode as string;
  if (inputs.buyerRecordId) migrated.buyerRecordId = inputs.buyerRecordId as string;
  if (inputs.contactId) migrated.contactId = inputs.contactId as string;

  // Copy property basics
  if (inputs.propertyBasics) {
    migrated.propertyBasics = { ...migrated.propertyBasics, ...(inputs.propertyBasics as object) };
  }

  // Copy income
  if (inputs.income) {
    migrated.income = { ...migrated.income, ...(inputs.income as object) };
  }

  // Copy purchase costs
  if (inputs.purchaseCosts) {
    migrated.purchaseCosts = { ...migrated.purchaseCosts, ...(inputs.purchaseCosts as object) };
  }

  // Migrate tax & insurance (split insurance)
  if (inputs.taxInsurance) {
    const oldTaxIns = inputs.taxInsurance as Record<string, unknown>;
    migrated.taxInsurance.annualTaxes = (oldTaxIns.annualTaxes as number) || 0;
    // Map old annualInsurance to annualHomeownersInsurance
    migrated.taxInsurance.annualHomeownersInsurance =
      (oldTaxIns.annualHomeownersInsurance as number) ||
      (oldTaxIns.annualInsurance as number) ||
      0;
    migrated.taxInsurance.annualFloodInsurance = (oldTaxIns.annualFloodInsurance as number) || 0;
    migrated.taxInsurance.hasFloodInsurance = (oldTaxIns.hasFloodInsurance as boolean) || false;
  }

  // Migrate operating (maintenancePercent → warChestPercent)
  if (inputs.operating) {
    const oldOp = inputs.operating as Record<string, unknown>;
    migrated.operating.warChestPercent =
      (oldOp.warChestPercent as number) ||
      (oldOp.maintenancePercent as number) ||
      5;
    migrated.operating.propertyMgmtPercent = (oldOp.propertyMgmtPercent as number) || 10;
    migrated.operating.hoa = (oldOp.hoa as number) || 0;
    migrated.operating.utilities = (oldOp.utilities as number) || 0;
  }

  // Copy subject-to
  if (inputs.subjectTo) {
    migrated.subjectTo = { ...migrated.subjectTo, ...(inputs.subjectTo as object) };
  }

  // Copy DSCR loan (add dscrLtvPercent if missing)
  if (inputs.dscrLoan) {
    const oldDscr = inputs.dscrLoan as Record<string, unknown>;
    migrated.dscrLoan = {
      ...migrated.dscrLoan,
      ...oldDscr,
      dscrLtvPercent: (oldDscr.dscrLtvPercent as number) || 80,
    } as DSCRLoanInputs;
  }

  // Copy second loan
  if (inputs.secondLoan) {
    migrated.secondLoan = { ...migrated.secondLoan, ...(inputs.secondLoan as object) };
  }

  // Copy wrap loan
  if (inputs.wrapLoan) {
    migrated.wrapLoan = { ...migrated.wrapLoan, ...(inputs.wrapLoan as object) };
  }

  // Copy wrap sales
  if (inputs.wrapSales) {
    migrated.wrapSales = { ...migrated.wrapSales, ...(inputs.wrapSales as object) };
  }

  // NOTE: flip data is intentionally ignored (removed from calculator)

  return migrated;
}
