/**
 * Team Agents for Social Hub
 *
 * This defines the team members who can be selected for template generation.
 * The selected agent's info (name, phone, email, headshot) will be used
 * in the Imejis API call for template field population.
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
 * Purple Homes team members
 */
export const TEAM_AGENTS: TeamAgent[] = [
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

/**
 * Get agent by ID
 */
export function getAgentById(id: string): TeamAgent | undefined {
  return TEAM_AGENTS.find(agent => agent.id === id);
}

/**
 * Get default agent
 */
export function getDefaultAgent(): TeamAgent {
  return TEAM_AGENTS[0];
}
