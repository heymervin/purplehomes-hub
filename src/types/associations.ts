/**
 * GHL Custom Objects & Associations Types
 *
 * These types support the buyer-property matching system that uses
 * GHL Custom Objects and Associations for many-to-many relationships.
 */

/**
 * GHL Association - Connection definition between object types
 */
export interface GHLAssociation {
  id: string;
  locationId: string;
  name: string;
  sourceObjectKey: string; // e.g., "contact"
  targetObjectKey: string; // e.g., "property" (custom object)
  createdAt?: string;
  updatedAt?: string;
}

/**
 * GHL Association Label - Specific label/category for an association
 * These represent the buyer journey stages with a property
 */
export interface GHLAssociationLabel {
  id: string;
  associationId: string;
  name: string;
  color?: string;
  order?: number;
}

/**
 * GHL Relation - Instance of an association between two records
 */
export interface GHLRelation {
  id: string;
  sourceRecordId: string;  // e.g., contact ID
  targetRecordId: string;  // e.g., property custom object ID
  associationId: string;
  labelId?: string;
  label?: GHLAssociationLabel;
  createdAt?: string;
  updatedAt?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Request payload for creating a relation
 */
export interface CreateRelationRequest {
  sourceRecordId: string;
  targetRecordId: string;
  associationId: string;
  labelId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Request payload for updating a relation label
 */
export interface UpdateRelationLabelRequest {
  labelId: string;
}

/**
 * API Response for fetching associations
 */
export interface GHLAssociationsResponse {
  associations: GHLAssociation[];
  labels?: GHLAssociationLabel[];
  meta?: {
    total: number;
    locationId: string;
  };
}

/**
 * API Response for fetching relations
 */
export interface GHLRelationsResponse {
  relations: GHLRelation[];
  meta?: {
    total: number;
    nextPageUrl?: string;
  };
}

/**
 * Label name to ID mapping for quick lookups
 */
export interface AssociationLabelMap {
  [labelName: string]: string;
}

/**
 * Cached association data structure for localStorage
 */
export interface CachedAssociationData {
  associations: GHLAssociation[];
  labels: GHLAssociationLabel[];
  labelMap: AssociationLabelMap;
  fetchedAt: string;
  expiresAt: string;
  locationId: string;
}

/**
 * Deal stage labels that map to GHL association labels
 * These are the buyer journey stages with a specific property
 */
export const MATCH_DEAL_STAGES = [
  'Sent to Buyer',
  'Buyer Responded',
  'Showing Scheduled',
  'Property Viewed',
  'Underwriting',
  'Contracts',
  'Qualified',
  'Closed Deal / Won',
] as const;

export const MATCH_EXIT_STAGES = ['Not Interested'] as const;

export type MatchDealStage = typeof MATCH_DEAL_STAGES[number] | typeof MATCH_EXIT_STAGES[number];

/**
 * GHL Association IDs for each match stage
 * Each stage is its own association (NOT labels within one association)
 * Used for creating relations between Contact and Property Custom Object
 */
export const STAGE_ASSOCIATION_IDS: Record<MatchDealStage, string> = {
  'Sent to Buyer': '69451ecd5fba08f5525758a6',
  'Buyer Responded': '693944eb0c32be3d486d83c0',
  'Showing Scheduled': '69451eb4a09d396fae2e81fb',
  'Property Viewed': '69451ea83246701a7740063b',
  'Underwriting': '69451e925fba087bc357502b',
  'Contracts': '69451e83a6d620ecd98d70d8',
  'Qualified': '694bbb6fa09d3903b4da9be3',
  'Closed Deal / Won': '69451e67a09d39427b2e7870',
  'Not Interested': '69451e36a09d39271e2e7383',
};

/**
 * Stage metadata for UI rendering
 */
export interface StageConfig {
  id: MatchDealStage;
  label: string;
  shortLabel: string;
  order: number;
  isExitState: boolean;
  color: string;
  description: string;
}

export const STAGE_CONFIGS: StageConfig[] = [
  { id: 'Sent to Buyer', label: 'Sent to Buyer', shortLabel: 'Sent', order: 1, isExitState: false, color: 'blue', description: 'Property details sent to buyer' },
  { id: 'Buyer Responded', label: 'Interested', shortLabel: 'Interested', order: 2, isExitState: false, color: 'cyan', description: 'Buyer replied with interest' },
  { id: 'Showing Scheduled', label: 'Showing Scheduled', shortLabel: 'Scheduled', order: 3, isExitState: false, color: 'amber', description: 'Property showing scheduled' },
  { id: 'Property Viewed', label: 'Property Viewed', shortLabel: 'Viewed', order: 4, isExitState: false, color: 'purple', description: 'Buyer has viewed property' },
  { id: 'Underwriting', label: 'Underwriting', shortLabel: 'Underwriting', order: 5, isExitState: false, color: 'orange', description: 'Numbers being prepared' },
  { id: 'Contracts', label: 'Contracts Signed', shortLabel: 'Contracts Signed', order: 6, isExitState: false, color: 'indigo', description: 'Contracts in progress' },
  { id: 'Qualified', label: 'Qualified', shortLabel: 'Qualified', order: 7, isExitState: false, color: 'teal', description: 'Buyer qualified for property' },
  { id: 'Closed Deal / Won', label: 'Closed Deal / Won', shortLabel: 'Closed', order: 8, isExitState: false, color: 'emerald', description: 'Deal completed successfully' },
  { id: 'Not Interested', label: 'Not Interested', shortLabel: 'Not Interested', order: 99, isExitState: true, color: 'red', description: 'Buyer not interested in property' },
];

/**
 * Get stage config by stage ID
 */
export const getStageConfig = (stage: MatchDealStage): StageConfig | undefined => {
  return STAGE_CONFIGS.find(config => config.id === stage);
};

/**
 * Get next stage in progression
 */
export const getNextStage = (currentStage: MatchDealStage): MatchDealStage | null => {
  const currentConfig = getStageConfig(currentStage);
  if (!currentConfig || currentConfig.isExitState) return null;

  const nextConfig = STAGE_CONFIGS.find(
    config => !config.isExitState && config.order === currentConfig.order + 1
  );
  return nextConfig?.id || null;
};

/**
 * Check if a stage transition is valid
 */
export const isValidTransition = (from: MatchDealStage, to: MatchDealStage): boolean => {
  const fromConfig = getStageConfig(from);
  const toConfig = getStageConfig(to);

  if (!fromConfig || !toConfig) return false;

  // Can always go to exit state
  if (toConfig.isExitState) return true;

  // Can't transition from exit state back to normal flow
  if (fromConfig.isExitState) return false;

  // Can advance forward or stay same
  return toConfig.order >= fromConfig.order;
};
