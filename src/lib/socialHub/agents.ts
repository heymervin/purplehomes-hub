/**
 * Team Agents for Social Hub
 *
 * This defines the team members who can be selected for template generation.
 * The selected agent's info (name, phone, email, headshot) will be used
 * in the Imejis API call for template field population.
 *
 * Agents are now fetched dynamically from Airtable Users table (admins only).
 * The hardcoded list below serves as a fallback if the API is unavailable.
 */

export interface TeamAgent {
  id: string;
  name: string;
  phone: string;
  email: string;
  headshot: string;
  title?: string;
}

/**
 * Fallback team members (used if API is unavailable)
 * These should match the admin users in Airtable
 */
export const FALLBACK_AGENTS: TeamAgent[] = [
  {
    id: 'krista',
    name: 'Krista Hartman',
    phone: '504-475-0672',
    email: 'kris@purplehomessolutions.com',
    headshot: 'https://storage.googleapis.com/msgsndr/fJgopVh0YwOMQJtUeQRk/media/696726a4b9e85c71a82bdcba.png',
    title: 'Agent',
  },
  {
    id: 'dustin',
    name: 'Dustin Hartman',
    phone: '504-290-0660',
    email: 'dustin@purplehomessolutions.com',
    headshot: 'https://storage.googleapis.com/msgsndr/fJgopVh0YwOMQJtUeQRk/media/696726a4a3a114b6d009ec67.jpg',
    title: 'Agent',
  },
];

// Keep TEAM_AGENTS for backward compatibility
export const TEAM_AGENTS = FALLBACK_AGENTS;

/**
 * Get agent by ID from a list of agents
 */
export function getAgentById(id: string, agents: TeamAgent[] = FALLBACK_AGENTS): TeamAgent | undefined {
  return agents.find(agent => agent.id === id);
}

/**
 * Get default agent from a list of agents
 */
export function getDefaultAgent(agents: TeamAgent[] = FALLBACK_AGENTS): TeamAgent {
  return agents[0] || FALLBACK_AGENTS[0];
}
