import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns';
import {
  Send,
  Calendar,
  Sparkles,
  Building2,
  RefreshCcw,
  UserPlus,
  Mail,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Target,
  Activity as ActivityIcon,
  Handshake,
  TrendingUp,
  Image,
  Upload,
  Layers,
  Zap,
  Bot,
  AlertCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Activity, ActivityType, SyncLogEntry, SyncType } from '@/types';

// Icon mapping for activity types
const activityIcons: Record<ActivityType | SyncType | string, typeof Send> = {
  // Social
  posted: Send,
  scheduled: Calendar,
  'caption-generated': Sparkles,
  // Properties
  'property-added': Building2,
  'status-changed': RefreshCcw,
  // Contacts
  'contact-added': UserPlus,
  'buyer-added': UserPlus,
  'inventory-sent': Mail,
  // Deals
  'deal-created': Handshake,
  'deal-updated': TrendingUp,
  // Sync types
  contacts: UserPlus,
  properties: Building2,
  opportunities: Target,
  'social-accounts': Send,
  documents: Mail,
  // App activity types
  'image-generated': Image,
  'media-uploaded': Upload,
  'batch-created': Layers,
  'batch-published': Zap,
  'ai-content-generated': Bot,
  'property-matched': Target,
  'email-sent': Mail,
  'sms-sent': Mail,
  error: AlertCircle,
};

// Color mapping for activity types
// Background fills are normalized to bg-muted for consistency.
// Text colors are kept semantic per activity type.
const activityColors: Record<ActivityType | SyncType | string, string> = {
  // Social
  posted: 'bg-muted text-emerald-600 dark:text-emerald-400',
  scheduled: 'bg-muted text-blue-600 dark:text-blue-400',
  'caption-generated': 'bg-muted text-primary',
  // Properties
  'property-added': 'bg-muted text-amber-600 dark:text-amber-400',
  'status-changed': 'bg-muted text-muted-foreground',
  // Contacts
  'contact-added': 'bg-muted text-cyan-600 dark:text-cyan-400',
  'buyer-added': 'bg-muted text-teal-600 dark:text-teal-400',
  'inventory-sent': 'bg-muted text-indigo-600 dark:text-indigo-400',
  // Deals
  'deal-created': 'bg-muted text-emerald-600 dark:text-emerald-400',
  'deal-updated': 'bg-muted text-emerald-600 dark:text-emerald-400',
  // Sync types
  contacts: 'bg-muted text-cyan-600 dark:text-cyan-400',
  properties: 'bg-muted text-amber-600 dark:text-amber-400',
  opportunities: 'bg-muted text-primary',
  'social-accounts': 'bg-muted text-muted-foreground',
  documents: 'bg-muted text-indigo-600 dark:text-indigo-400',
  // App activity types
  'image-generated': 'bg-muted text-primary',
  'media-uploaded': 'bg-muted text-blue-600 dark:text-blue-400',
  'batch-created': 'bg-muted text-amber-600 dark:text-amber-400',
  'batch-published': 'bg-muted text-emerald-600 dark:text-emerald-400',
  'ai-content-generated': 'bg-muted text-primary',
  'property-matched': 'bg-muted text-muted-foreground',
  'email-sent': 'bg-muted text-blue-600 dark:text-blue-400',
  'sms-sent': 'bg-muted text-emerald-600 dark:text-emerald-400',
  error: 'bg-muted text-red-600 dark:text-red-400',
};

// Status icons
const statusIcons = {
  success: CheckCircle,
  error: XCircle,
  pending: Clock,
  failed: XCircle,
  partial: AlertTriangle,
};

const statusColors = {
  success: 'text-emerald-600 dark:text-emerald-400',
  error: 'text-red-600 dark:text-red-400',
  pending: 'text-amber-600 dark:text-amber-400',
  failed: 'text-red-600 dark:text-red-400',
  partial: 'text-amber-600 dark:text-amber-400',
};

// Activity type labels
const typeLabels: Record<ActivityType | SyncType | string, string> = {
  // Social
  posted: 'Posted',
  scheduled: 'Scheduled',
  'caption-generated': 'Caption Generated',
  // Properties
  'property-added': 'Property Added',
  'status-changed': 'Status Changed',
  // Contacts
  'contact-added': 'Contact Added',
  'buyer-added': 'Buyer Added',
  'inventory-sent': 'Inventory Sent',
  // Deals
  'deal-created': 'Deal Created',
  'deal-updated': 'Deal Updated',
  // Sync
  contacts: 'Contacts Sync',
  properties: 'Properties Sync',
  opportunities: 'Opportunities Sync',
  'social-accounts': 'Social Accounts Sync',
  documents: 'Documents Sync',
  // App activities
  'image-generated': 'Image Generated',
  'media-uploaded': 'Media Uploaded',
  'batch-created': 'Batch Created',
  'batch-published': 'Batch Published',
  'ai-content-generated': 'AI Content Generated',
  'property-matched': 'Property Matched',
  'email-sent': 'Email Sent',
  'sms-sent': 'SMS Sent',
  error: 'Error',
};

// Unified activity item that can be either Activity or SyncLogEntry
export interface TimelineItem {
  id: string;
  type: ActivityType | SyncType | string;
  status: 'success' | 'error' | 'pending' | 'failed' | 'partial';
  details: string;
  timestamp: string;
  propertyCode?: string;
  propertyId?: string;
  contactId?: string;
  contactName?: string;
  user?: string;
  // Source tracking for filtering
  source?: 'social' | 'property' | 'contact' | 'deal' | 'sync' | 'app';
  // Sync-specific fields
  recordsProcessed?: number;
  recordsCreated?: number;
  recordsUpdated?: number;
  recordsFailed?: number;
  duration?: number;
  errorMessage?: string;
}

// Group activities by date
function groupByDate(items: TimelineItem[]): Map<string, TimelineItem[]> {
  const groups = new Map<string, TimelineItem[]>();

  items.forEach((item) => {
    const date = new Date(item.timestamp);
    let dateKey: string;

    if (isToday(date)) {
      dateKey = 'Today';
    } else if (isYesterday(date)) {
      dateKey = 'Yesterday';
    } else {
      dateKey = format(date, 'MMMM d, yyyy');
    }

    const existing = groups.get(dateKey) || [];
    groups.set(dateKey, [...existing, item]);
  });

  return groups;
}

interface ActivityTimelineProps {
  items: TimelineItem[];
  onItemClick?: (item: TimelineItem) => void;
  showDateGroups?: boolean;
  maxItems?: number;
}

export function ActivityTimeline({
  items,
  onItemClick,
  showDateGroups = true,
  maxItems,
}: ActivityTimelineProps) {
  const displayItems = maxItems ? items.slice(0, maxItems) : items;
  const groupedItems = showDateGroups ? groupByDate(displayItems) : null;

  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <ActivityIcon className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground">No activity yet</p>
        <p className="text-sm text-muted-foreground mt-1">
          Activity will appear here as you use the system
        </p>
      </div>
    );
  }

  if (showDateGroups && groupedItems) {
    return (
      <div className="space-y-8">
        {Array.from(groupedItems.entries()).map(([dateGroup, groupItems]) => (
          <div key={dateGroup}>
            {/* Date Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px flex-1 bg-border" />
              <span className="text-sm font-medium text-muted-foreground px-2">
                {dateGroup}
              </span>
              <div className="h-px flex-1 bg-border" />
            </div>

            {/* Timeline Items */}
            <div className="relative">
              {/* Vertical line */}
              <div className="absolute left-5 top-3 bottom-3 w-px bg-border" />

              <div className="space-y-1">
                {groupItems.map((item, idx) => (
                  <TimelineItemRow
                    key={item.id}
                    item={item}
                    onClick={onItemClick}
                    isLast={idx === groupItems.length - 1}
                  />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Flat timeline without date groups
  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-5 top-3 bottom-3 w-px bg-border" />

      <div className="space-y-1">
        {displayItems.map((item, idx) => (
          <TimelineItemRow
            key={item.id}
            item={item}
            onClick={onItemClick}
            isLast={idx === displayItems.length - 1}
          />
        ))}
      </div>
    </div>
  );
}

interface TimelineItemRowProps {
  item: TimelineItem;
  onClick?: (item: TimelineItem) => void;
  isLast?: boolean;
}

function TimelineItemRow({ item, onClick, isLast }: TimelineItemRowProps) {
  const Icon = activityIcons[item.type] || ActivityIcon;
  const colorClass = activityColors[item.type] || 'bg-gray-100 dark:bg-gray-900/30 text-gray-600 dark:text-gray-400';
  const StatusIcon = statusIcons[item.status] || Clock;
  const statusColor = statusColors[item.status] || 'text-muted-foreground';

  const isSyncItem = ['contacts', 'properties', 'opportunities', 'social-accounts', 'documents'].includes(item.type);

  return (
    <div
      className={cn(
        'relative flex items-start gap-4 p-3 rounded-lg transition-colors',
        onClick && 'cursor-pointer hover:bg-muted/50'
      )}
      onClick={() => onClick?.(item)}
    >
      {/* Icon */}
      <div className={cn('relative z-10 p-2 rounded-lg flex-shrink-0', colorClass)}>
        <Icon className="h-4 w-4" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pt-0.5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            {/* Title row */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm">
                {typeLabels[item.type] || item.type}
              </span>
              {item.propertyCode && (
                <Badge variant="secondary" className="text-xs">
                  {item.propertyCode}
                </Badge>
              )}
            </div>

            {/* Details */}
            <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
              {item.details}
            </p>

            {/* Sync stats (if applicable) */}
            {isSyncItem && item.recordsProcessed !== undefined && (
              <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                <span>{item.recordsProcessed} processed</span>
                {item.recordsCreated !== undefined && item.recordsCreated > 0 && (
                  <span className="text-emerald-600 dark:text-emerald-400">
                    +{item.recordsCreated} created
                  </span>
                )}
                {item.recordsUpdated !== undefined && item.recordsUpdated > 0 && (
                  <span className="text-blue-600 dark:text-blue-400">
                    {item.recordsUpdated} updated
                  </span>
                )}
                {item.recordsFailed !== undefined && item.recordsFailed > 0 && (
                  <span className="text-red-600 dark:text-red-400">
                    {item.recordsFailed} failed
                  </span>
                )}
                {item.duration !== undefined && (
                  <span>{item.duration}ms</span>
                )}
              </div>
            )}

            {/* Error message */}
            {item.errorMessage && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                {item.errorMessage}
              </p>
            )}
          </div>

          {/* Right side: status + time */}
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            <div className="flex items-center gap-1">
              <StatusIcon className={cn('h-3.5 w-3.5', statusColor)} />
              <span className={cn('text-xs capitalize', statusColor)}>
                {item.status}
              </span>
            </div>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
            </span>
          </div>
        </div>

        {/* User */}
        {item.user && (
          <p className="text-xs text-muted-foreground mt-1">
            by {item.user}
          </p>
        )}
      </div>
    </div>
  );
}

// Helper function to convert Activity to TimelineItem
export function activityToTimelineItem(activity: Activity): TimelineItem {
  return {
    id: activity.id,
    type: activity.type,
    status: activity.status,
    details: activity.details,
    timestamp: activity.timestamp,
    propertyCode: activity.propertyCode,
    propertyId: activity.propertyId,
    user: activity.user,
  };
}

// Helper function to convert SyncLogEntry to TimelineItem
export function syncLogToTimelineItem(log: SyncLogEntry): TimelineItem {
  return {
    id: log.id,
    type: log.type,
    status: log.status,
    details: `${log.type} sync: ${log.recordsProcessed} records processed`,
    timestamp: log.timestamp,
    recordsProcessed: log.recordsProcessed,
    recordsCreated: log.recordsCreated,
    recordsUpdated: log.recordsUpdated,
    recordsFailed: log.recordsFailed,
    duration: log.duration,
    errorMessage: log.error,
  };
}
