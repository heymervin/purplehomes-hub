import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

const MAX_ACTIVITY_ENTRIES = 200;

// App-level activity types (not stored in GHL)
export type AppActivityType =
  | 'caption-generated'
  | 'image-generated'
  | 'inventory-sent'
  | 'property-matched'
  | 'email-sent'
  | 'sms-sent'
  | 'batch-created'
  | 'batch-published'
  | 'ai-content-generated'
  | 'media-uploaded'
  | 'error';

export interface AppActivityEntry {
  id: string;
  type: AppActivityType;
  status: 'success' | 'error' | 'pending';
  details: string;
  timestamp: string;
  // Optional context
  propertyId?: string;
  propertyCode?: string;
  contactId?: string;
  contactName?: string;
  // Metadata for specific activity types
  metadata?: Record<string, unknown>;
}

interface ActivityState {
  // Activity Log
  activities: AppActivityEntry[];

  // Actions
  logActivity: (entry: Omit<AppActivityEntry, 'id' | 'timestamp'>) => void;
  clearActivities: () => void;
  getRecentActivities: (limit?: number) => AppActivityEntry[];
  getActivitiesByType: (type: AppActivityType) => AppActivityEntry[];

  // Stats
  getTodayCount: () => number;
  getErrorCount: () => number;
}

export const useActivityStore = create<ActivityState>()(
  persist(
    (set, get) => ({
      activities: [],

      logActivity: (entry) => {
        const newEntry: AppActivityEntry = {
          ...entry,
          id: `app-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          timestamp: new Date().toISOString(),
        };

        set((state) => ({
          activities: [newEntry, ...state.activities].slice(0, MAX_ACTIVITY_ENTRIES),
        }));
      },

      clearActivities: () => set({ activities: [] }),

      getRecentActivities: (limit = 50) => {
        return get().activities.slice(0, limit);
      },

      getActivitiesByType: (type) => {
        return get().activities.filter((entry) => entry.type === type);
      },

      getTodayCount: () => {
        const today = new Date().toDateString();
        return get().activities.filter(
          (entry) => new Date(entry.timestamp).toDateString() === today
        ).length;
      },

      getErrorCount: () => {
        return get().activities.filter((entry) => entry.status === 'error').length;
      },
    }),
    {
      name: 'app-activity-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Only persist last 50 activities to keep localStorage small
        activities: state.activities.slice(0, 50),
      }),
    }
  )
);

// ============ Helper functions to log specific activities ============

/**
 * Log a caption generation event
 */
export function logCaptionGenerated(
  propertyCode?: string,
  propertyId?: string,
  tone?: string,
  success = true
) {
  useActivityStore.getState().logActivity({
    type: 'caption-generated',
    status: success ? 'success' : 'error',
    details: propertyCode
      ? `Caption generated for ${propertyCode}${tone ? ` (${tone} tone)` : ''}`
      : `Caption generated${tone ? ` (${tone} tone)` : ''}`,
    propertyCode,
    propertyId,
    metadata: { tone },
  });
}

/**
 * Log an image generation event
 */
export function logImageGenerated(
  templateName: string,
  propertyCode?: string,
  propertyId?: string,
  success = true,
  error?: string
) {
  useActivityStore.getState().logActivity({
    type: 'image-generated',
    status: success ? 'success' : 'error',
    details: success
      ? `Image generated using ${templateName} template${propertyCode ? ` for ${propertyCode}` : ''}`
      : `Image generation failed: ${error || 'Unknown error'}`,
    propertyCode,
    propertyId,
    metadata: { templateName, error },
  });
}

/**
 * Log inventory sent to buyers
 */
export function logInventorySent(
  buyerCount: number,
  propertyCount: number,
  contactName?: string,
  success = true
) {
  useActivityStore.getState().logActivity({
    type: 'inventory-sent',
    status: success ? 'success' : 'error',
    details: success
      ? `Inventory sent: ${propertyCount} properties to ${buyerCount} buyer${buyerCount !== 1 ? 's' : ''}${contactName ? ` (${contactName})` : ''}`
      : 'Failed to send inventory',
    contactName,
    metadata: { buyerCount, propertyCount },
  });
}

/**
 * Log property matched to buyer
 */
export function logPropertyMatched(
  propertyCode: string,
  buyerName: string,
  propertyId?: string,
  contactId?: string
) {
  useActivityStore.getState().logActivity({
    type: 'property-matched',
    status: 'success',
    details: `Property ${propertyCode} matched to ${buyerName}`,
    propertyCode,
    propertyId,
    contactId,
    contactName: buyerName,
  });
}

/**
 * Log batch creation
 */
export function logBatchCreated(postCount: number, success = true) {
  useActivityStore.getState().logActivity({
    type: 'batch-created',
    status: success ? 'success' : 'error',
    details: success
      ? `Batch created with ${postCount} posts`
      : 'Failed to create batch',
    metadata: { postCount },
  });
}

/**
 * Log batch published
 */
export function logBatchPublished(
  postCount: number,
  successCount: number,
  failedCount: number
) {
  const allSuccess = failedCount === 0;
  useActivityStore.getState().logActivity({
    type: 'batch-published',
    status: allSuccess ? 'success' : failedCount === postCount ? 'error' : 'pending',
    details: allSuccess
      ? `Batch published: ${successCount} posts successfully`
      : `Batch published: ${successCount} succeeded, ${failedCount} failed`,
    metadata: { postCount, successCount, failedCount },
  });
}

/**
 * Log AI content generation (for Professional posts)
 */
export function logAIContentGenerated(topic: string, success = true, error?: string) {
  useActivityStore.getState().logActivity({
    type: 'ai-content-generated',
    status: success ? 'success' : 'error',
    details: success
      ? `AI content generated for topic: "${topic.substring(0, 50)}${topic.length > 50 ? '...' : ''}"`
      : `AI content generation failed: ${error || 'Unknown error'}`,
    metadata: { topic, error },
  });
}

/**
 * Log media upload
 */
export function logMediaUploaded(fileName: string, success = true, error?: string) {
  useActivityStore.getState().logActivity({
    type: 'media-uploaded',
    status: success ? 'success' : 'error',
    details: success
      ? `Media uploaded: ${fileName}`
      : `Media upload failed: ${error || 'Unknown error'}`,
    metadata: { fileName, error },
  });
}

/**
 * Log a general error
 */
export function logError(details: string, metadata?: Record<string, unknown>) {
  useActivityStore.getState().logActivity({
    type: 'error',
    status: 'error',
    details,
    metadata,
  });
}
