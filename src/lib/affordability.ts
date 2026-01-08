/**
 * Affordability Calculation Utility
 * Uses configurable settings from Airtable/Settings page
 */

import { AffordabilitySettings, DEFAULT_AFFORDABILITY_SETTINGS } from '../types/matching';

/**
 * Calculate maximum affordable price based on down payment and settings
 *
 * @param downPayment - Buyer's available down payment
 * @param settings - Configurable affordability settings
 * @returns Maximum affordable property price (rounded to nearest $1,000)
 *
 * @example
 * calculateMaxAffordablePrice(50000)  // Returns ~$175,000 with defaults
 * calculateMaxAffordablePrice(100000) // Returns ~$397,000 with defaults
 */
export function calculateMaxAffordablePrice(
  downPayment: number,
  settings: AffordabilitySettings = DEFAULT_AFFORDABILITY_SETTINGS
): number {
  const {
    fixedOtherCosts,
    fixedLoanFees,
    downPaymentPercent,
    closingCostPercent,
    pointsPercent,
    pointsFinancedPercent,
    priceBuffer,
  } = settings;

  // Calculate entry factor (percentage of price needed upfront)
  const dpPct = downPaymentPercent / 100;
  const closingPct = closingCostPercent / 100;
  const pointsPct = pointsPercent / 100;
  const financedPct = pointsFinancedPercent / 100;

  const entryFactor = dpPct + closingPct + (pointsPct * financedPct);

  // Calculate fixed costs
  const fixedTotal = fixedOtherCosts + fixedLoanFees;

  // Calculate max price
  const maxPrice = ((downPayment - fixedTotal) / entryFactor) + priceBuffer;

  // Round to nearest thousand
  return Math.round(maxPrice / 1000) * 1000;
}

/**
 * Calculate max affordable price with budget flexibility applied
 *
 * @param downPayment - Buyer's available down payment
 * @param settings - Affordability settings
 * @param budgetFlexPercent - Percentage over max to allow (0, 5, 10, 15, or 20)
 * @returns Max affordable price with flexibility (rounded to nearest $1,000)
 */
export function calculateMaxAffordablePriceWithFlex(
  downPayment: number,
  settings: AffordabilitySettings,
  budgetFlexPercent: number
): number {
  const baseMax = calculateMaxAffordablePrice(downPayment, settings);
  return Math.round(baseMax * (1 + budgetFlexPercent / 100) / 1000) * 1000;
}

/**
 * Validate if buyer has sufficient down payment
 *
 * @param downPayment - Buyer's down payment amount
 * @param settings - Affordability settings with minDownPayment
 * @returns True if down payment is sufficient
 */
export function hasValidDownPayment(
  downPayment: number | undefined,
  settings: AffordabilitySettings = DEFAULT_AFFORDABILITY_SETTINGS
): boolean {
  return !!downPayment && downPayment > settings.minDownPayment;
}

/**
 * Get entry factor for display purposes
 * Entry factor is the total percentage of property price needed upfront
 *
 * @param settings - Affordability settings
 * @returns Entry factor as a decimal (e.g., 0.226 for 22.6%)
 */
export function calculateEntryFactor(settings: AffordabilitySettings): number {
  const dpPct = settings.downPaymentPercent / 100;
  const closingPct = settings.closingCostPercent / 100;
  const pointsPct = settings.pointsPercent / 100;
  const financedPct = settings.pointsFinancedPercent / 100;

  return dpPct + closingPct + (pointsPct * financedPct);
}

/**
 * Get fixed costs total for display purposes
 *
 * @param settings - Affordability settings
 * @returns Total fixed costs in dollars
 */
export function calculateFixedTotal(settings: AffordabilitySettings): number {
  return settings.fixedOtherCosts + settings.fixedLoanFees;
}
