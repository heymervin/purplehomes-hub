// src/types/customFields.ts

export interface GHLCustomField {
  id: string;
  name: string;
  fieldKey: string;
  dataType: GHLFieldType;
  placeholder?: string;
  position?: number;
  parentId?: string | null;
  isFolder?: boolean;
  model?: 'contact' | 'opportunity' | 'both';
  options?: string[];
  required?: boolean;
}

export type GHLFieldType =
  | 'TEXT'
  | 'LARGE_TEXT'
  | 'NUMERICAL'
  | 'MONETARY'
  | 'SINGLE_OPTIONS'
  | 'MULTIPLE_OPTIONS'
  | 'DATE'
  | 'CHECKBOX'
  | 'FILE'
  | 'PHONE'
  | 'URL';

export interface CustomFieldFolder {
  id: string;
  name: string;
  position: number;
  model?: 'contact' | 'opportunity' | 'both';
  fields: GHLCustomField[];
  color?: FolderColor;
}

export interface FolderColor {
  bg: string;
  border: string;
  icon: string;
  text: string;
}

// All 10 folder colors mapped by folder name
export const FOLDER_COLORS: Record<string, FolderColor> = {
  'Property Details (Required)': {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    icon: 'text-blue-600',
    text: 'text-blue-700'
  },
  'Property Details (Optional)': {
    bg: 'bg-sky-50',
    border: 'border-sky-200',
    icon: 'text-sky-500',
    text: 'text-sky-700'
  },
  'Pricing & Financials': {
    bg: 'bg-green-50',
    border: 'border-green-200',
    icon: 'text-green-600',
    text: 'text-green-700'
  },
  'Social Media': {
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    icon: 'text-purple-600',
    text: 'text-purple-700'
  },
  'Seller Acquisition': {
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    icon: 'text-orange-500',
    text: 'text-orange-700'
  },
  'Property Pipeline': {
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    icon: 'text-orange-500',
    text: 'text-orange-700'
  },
  'Buyer Acquisition': {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    icon: 'text-amber-500',
    text: 'text-amber-700'
  },
  'Buyer Preferences': {
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    icon: 'text-yellow-600',
    text: 'text-yellow-700'
  },
  'Deal Information': {
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    icon: 'text-rose-500',
    text: 'text-rose-700'
  },
  'Document Merge Fields': {
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
    icon: 'text-indigo-500',
    text: 'text-indigo-700'
  },
  'Contact Information': {
    bg: 'bg-teal-50',
    border: 'border-teal-200',
    icon: 'text-teal-500',
    text: 'text-teal-700'
  },
  'default': {
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    icon: 'text-gray-500',
    text: 'text-gray-700'
  },
};
