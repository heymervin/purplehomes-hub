// src/lib/customFieldsUtils.ts

import type {
  GHLCustomField,
  CustomFieldFolder,
  FolderColor
} from '@/types/customFields';
import { FOLDER_COLORS } from '@/types/customFields';

/**
 * Groups custom fields by their parent folder with model filtering
 */
export function groupFieldsByFolder(
  fields: GHLCustomField[],
  modelFilter: 'all' | 'opportunity' | 'contact' = 'all'
): {
  folders: CustomFieldFolder[];
  ungroupedFields: GHLCustomField[];
} {
  // Filter folders by model
  const folders = fields
    .filter(f => f.isFolder)
    .filter(f => modelFilter === 'all' || f.model === modelFilter || f.model === 'both');

  // Create a set of valid folder IDs for quick lookup
  const folderIds = new Set(folders.map(f => f.id));

  const allFields = fields.filter(f => !f.isFolder);

  // Group fields by parentId
  const fieldsByParent = new Map<string | null, GHLCustomField[]>();

  allFields.forEach(field => {
    // If field has a parentId but that folder doesn't exist, treat as ungrouped
    const parentId = field.parentId && folderIds.has(field.parentId) ? field.parentId : null;
    if (!fieldsByParent.has(parentId)) {
      fieldsByParent.set(parentId, []);
    }
    fieldsByParent.get(parentId)!.push(field);
  });

  // Build folder structure
  const organizedFolders: CustomFieldFolder[] = folders
    .sort((a, b) => (a.position || 0) - (b.position || 0))
    .map(folder => ({
      id: folder.id,
      name: folder.name,
      position: folder.position || 0,
      model: folder.model,
      fields: (fieldsByParent.get(folder.id) || [])
        .sort((a, b) => (a.position || 0) - (b.position || 0)),
      color: getFolderColor(folder.name),
    }));

  const ungroupedFields = fieldsByParent.get(null) || [];

  return {
    folders: organizedFolders,
    ungroupedFields: ungroupedFields.sort((a, b) => (a.position || 0) - (b.position || 0)),
  };
}

/**
 * Get color scheme for a folder based on its name
 */
export function getFolderColor(folderName: string): FolderColor {
  // Exact match
  if (FOLDER_COLORS[folderName]) {
    return FOLDER_COLORS[folderName];
  }

  // Partial match based on keywords
  const lowerName = folderName.toLowerCase();

  if (lowerName.includes('required')) return FOLDER_COLORS['Property Details (Required)'];
  if (lowerName.includes('optional')) return FOLDER_COLORS['Property Details (Optional)'];
  if (lowerName.includes('property') || lowerName.includes('details')) {
    return FOLDER_COLORS['Property Details (Required)'];
  }
  if (lowerName.includes('price') || lowerName.includes('pricing') || lowerName.includes('financial')) {
    return FOLDER_COLORS['Pricing & Financials'];
  }
  if (lowerName.includes('social') || lowerName.includes('media')) {
    return FOLDER_COLORS['Social Media'];
  }
  if (lowerName.includes('seller') || lowerName.includes('property pipeline')) {
    return FOLDER_COLORS['Property Pipeline'];
  }
  if (lowerName.includes('buyer') && lowerName.includes('acq')) {
    return FOLDER_COLORS['Buyer Acquisition'];
  }
  if (lowerName.includes('buyer') || lowerName.includes('preference')) {
    return FOLDER_COLORS['Buyer Preferences'];
  }
  if (lowerName.includes('deal')) return FOLDER_COLORS['Deal Information'];
  if (lowerName.includes('document') || lowerName.includes('merge')) {
    return FOLDER_COLORS['Document Merge Fields'];
  }
  if (lowerName.includes('contact')) return FOLDER_COLORS['Contact Information'];

  return FOLDER_COLORS['default'];
}

/**
 * Filter fields based on search query
 */
export function filterFields(
  fields: GHLCustomField[],
  searchQuery: string
): GHLCustomField[] {
  if (!searchQuery.trim()) return fields;

  const query = searchQuery.toLowerCase();
  return fields.filter(field =>
    field.name.toLowerCase().includes(query) ||
    field.fieldKey.toLowerCase().includes(query)
  );
}

/**
 * Get icon name for field data type
 */
export function getFieldTypeIcon(dataType: string): string {
  const icons: Record<string, string> = {
    'TEXT': 'Type',
    'LARGE_TEXT': 'FileText',
    'NUMERICAL': 'Hash',
    'MONETARY': 'DollarSign',
    'SINGLE_OPTIONS': 'List',
    'MULTIPLE_OPTIONS': 'List',
    'DATE': 'Calendar',
    'CHECKBOX': 'ToggleLeft',
    'FILE': 'Image',
    'PHONE': 'Phone',
    'URL': 'Link',
  };
  return icons[dataType] || 'Tag';
}

/**
 * Calculate completion stats for a set of folders
 */
export function calculateCompletionStats(
  folders: CustomFieldFolder[],
  ungroupedFields: GHLCustomField[],
  values: Record<string, string>
): {
  totalFields: number;
  filledFields: number;
  completionPercent: number;
  requiredMissing: number;
} {
  const allFields = [
    ...folders.flatMap(f => f.fields),
    ...ungroupedFields
  ];

  const totalFields = allFields.length;
  const filledFields = allFields.filter(f => {
    const value = values[f.id] || '';
    return value !== '';
  }).length;

  const requiredFields = allFields.filter(f => f.required);
  const requiredMissing = requiredFields.filter(f => {
    const value = values[f.id] || '';
    return value === '';
  }).length;

  const completionPercent = totalFields > 0 ? (filledFields / totalFields) * 100 : 0;

  return {
    totalFields,
    filledFields,
    completionPercent,
    requiredMissing,
  };
}
