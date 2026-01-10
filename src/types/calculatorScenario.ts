/**
 * Calculator Scenario Type Definitions
 * For saving and loading calculator scenarios to/from Airtable
 */

import type { CalculatorInputs, CalculatorOutputs } from './calculator';

/**
 * Saved Calculator Scenario
 * Represents a saved scenario in Airtable (Calculator Scenario 1/2/3 fields)
 */
export interface SavedCalculatorScenario {
  name: string; // User-defined name e.g., "Standard 20% Down"
  savedAt: string; // ISO timestamp
  inputs: CalculatorInputs; // Full calculator inputs
  outputs: CalculatorOutputs; // Computed outputs at save time
}

/**
 * Scenario Set - All three scenario slots
 */
export interface ScenarioSet {
  scenario1: SavedCalculatorScenario | null;
  scenario2: SavedCalculatorScenario | null;
  scenario3: SavedCalculatorScenario | null;
}

/**
 * Helper type for scenario numbers
 */
export type ScenarioNumber = 1 | 2 | 3;

/**
 * Helper type for scenario field names
 */
export type ScenarioFieldName =
  | 'Calculator Scenario 1'
  | 'Calculator Scenario 2'
  | 'Calculator Scenario 3';
