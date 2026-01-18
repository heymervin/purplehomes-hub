/**
 * Global toggle for Agent Profile Override
 *
 * When enabled: Use agent profile data from Airtable (selected in Social Hub dropdown)
 * When disabled: Let Imejis templates use their hardcoded defaults (Krista/Dustin Hartman)
 */

const STORAGE_KEY = 'agent_profile_override_enabled';

/**
 * Check if agent profile override is enabled
 */
export function isAgentProfileOverrideEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(STORAGE_KEY) === 'true';
}

/**
 * Set the agent profile override state
 */
export function setAgentProfileOverrideEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, String(enabled));
}
