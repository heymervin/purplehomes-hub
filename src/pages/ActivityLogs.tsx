import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Filter,
  Download,
  ExternalLink,
  CheckCircle,
  XCircle,
  Clock,
  LayoutList,
  Rows3,
  RefreshCcw,
  Sparkles,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ActivityTimeline,
  activityToTimelineItem,
  syncLogToTimelineItem,
  type TimelineItem,
} from '@/components/activity/ActivityTimeline';
import { useActivityLogs, type ActivityItem } from '@/services/ghlApi';
import { useSyncStore } from '@/store/useSyncStore';
import { useActivityStore, type AppActivityEntry } from '@/store/useActivityStore';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { ActivityType } from '@/types';

type ViewMode = 'timeline' | 'table';
type SourceFilter = 'all' | 'social' | 'property' | 'contact' | 'deal' | 'sync' | 'app';

const actionTypeOptions: { value: string; label: string }[] = [
  { value: 'all', label: 'All Actions' },
  // Social
  { value: 'posted', label: 'Posted' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'caption-generated', label: 'Caption Generated' },
  // Properties
  { value: 'property-added', label: 'Property Added' },
  { value: 'status-changed', label: 'Status Changed' },
  // Contacts
  { value: 'contact-added', label: 'Contact Added' },
  { value: 'buyer-added', label: 'Buyer Added' },
  // Deals
  { value: 'deal-created', label: 'Deal Created' },
  { value: 'deal-updated', label: 'Deal Updated' },
  // Sync
  { value: 'contacts', label: 'Contacts Sync' },
  { value: 'properties', label: 'Properties Sync' },
  { value: 'opportunities', label: 'Opportunities Sync' },
  // App activities
  { value: 'image-generated', label: 'Image Generated' },
  { value: 'media-uploaded', label: 'Media Uploaded' },
  { value: 'batch-created', label: 'Batch Created' },
  { value: 'batch-published', label: 'Batch Published' },
  { value: 'ai-content-generated', label: 'AI Content Generated' },
  { value: 'error', label: 'Errors' },
];

const sourceFilterOptions: { value: SourceFilter; label: string }[] = [
  { value: 'all', label: 'All Sources' },
  { value: 'social', label: 'Social Media' },
  { value: 'property', label: 'Properties' },
  { value: 'contact', label: 'Contacts' },
  { value: 'deal', label: 'Deals' },
  { value: 'sync', label: 'Sync Logs' },
  { value: 'app', label: 'App Activity' },
];

const statusIcons = {
  success: CheckCircle,
  error: XCircle,
  pending: Clock,
  failed: XCircle,
  partial: Clock,
};

const statusColors = {
  success: 'text-emerald-600 dark:text-emerald-400',
  error: 'text-red-600 dark:text-red-400',
  pending: 'text-amber-600 dark:text-amber-400',
  failed: 'text-red-600 dark:text-red-400',
  partial: 'text-amber-600 dark:text-amber-400',
};

const actionLabels: Record<string, string> = {
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
  // Deals
  'deal-created': 'Deal Created',
  'deal-updated': 'Deal Updated',
  // Other
  'inventory-sent': 'Inventory Sent',
  // Sync
  contacts: 'Contacts Sync',
  properties: 'Properties Sync',
  opportunities: 'Opportunities Sync',
  'social-accounts': 'Social Sync',
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

// Helper to convert ActivityItem to TimelineItem
const activityItemToTimelineItem = (activity: ActivityItem): TimelineItem => ({
  id: activity.id,
  type: activity.type,
  propertyCode: activity.propertyCode,
  propertyId: activity.propertyId,
  contactId: activity.contactId,
  contactName: activity.contactName,
  details: activity.details,
  user: activity.user,
  status: activity.status,
  timestamp: activity.timestamp,
  source: activity.source,
});

// Helper to convert AppActivityEntry to TimelineItem
const appActivityToTimelineItem = (entry: AppActivityEntry): TimelineItem => ({
  id: entry.id,
  type: entry.type,
  propertyCode: entry.propertyCode,
  propertyId: entry.propertyId,
  contactId: entry.contactId,
  contactName: entry.contactName,
  details: entry.details,
  status: entry.status,
  timestamp: entry.timestamp,
  source: 'app' as const,
});

export default function ActivityLogs() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('timeline');

  // Get real activity logs from GHL
  const { data: activityData, isLoading: isLoadingActivities, refetch } = useActivityLogs(100);

  // Get sync logs from store
  const { syncLog, getRecentSyncLog } = useSyncStore();
  const recentSyncLogs = getRecentSyncLog(50);

  // Get app activities from store
  const { activities: appActivities, getRecentActivities } = useActivityStore();
  const recentAppActivities = getRecentActivities(100);

  // Combine activities and sync logs into unified timeline items
  const allItems = useMemo((): TimelineItem[] => {
    const activities = activityData || [];
    const activityItems = activities.map(activityItemToTimelineItem);
    // Add source='sync' to sync items
    const syncItems = recentSyncLogs.map((log) => ({
      ...syncLogToTimelineItem(log),
      source: 'sync' as const,
    }));
    // Convert app activities to timeline items
    const appItems = recentAppActivities.map(appActivityToTimelineItem);

    // Combine all items
    const combined: TimelineItem[] = [...activityItems, ...syncItems, ...appItems];

    // Filter by source if specified
    let filtered = combined;
    if (sourceFilter !== 'all') {
      filtered = combined.filter((item) => item.source === sourceFilter);
    }

    // Sort by timestamp (most recent first)
    return filtered.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [activityData, recentSyncLogs, recentAppActivities, sourceFilter]);

  // Apply filters
  const filteredItems = useMemo(() => {
    return allItems.filter((item) => {
      // Type filter
      if (actionFilter !== 'all' && item.type !== actionFilter) {
        return false;
      }

      // Search filter
      if (search) {
        const searchLower = search.toLowerCase();
        return (
          item.propertyCode?.toLowerCase().includes(searchLower) ||
          item.details.toLowerCase().includes(searchLower) ||
          item.user?.toLowerCase().includes(searchLower) ||
          item.type.toLowerCase().includes(searchLower)
        );
      }

      return true;
    });
  }, [allItems, actionFilter, search]);

  const handleExport = () => {
    const headers = ['Timestamp', 'Type', 'Property Code', 'Details', 'User', 'Status'];
    const rows = filteredItems.map((item) => [
      format(new Date(item.timestamp), 'yyyy-MM-dd HH:mm:ss'),
      actionLabels[item.type] || item.type,
      item.propertyCode || '',
      item.details,
      item.user || '',
      item.status,
    ]);

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `activity-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  const handleItemClick = (item: TimelineItem) => {
    if (item.propertyId) {
      navigate(`/properties/${item.propertyId}`);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Activity Logs</h1>
          <p className="text-muted-foreground mt-1">
            Track all system activity, syncs, and changes in one place
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <Tabs
            value={viewMode}
            onValueChange={(v) => setViewMode(v as ViewMode)}
            className="hidden sm:block"
          >
            <TabsList className="h-9">
              <TabsTrigger value="timeline" className="gap-1.5 px-3">
                <LayoutList className="h-4 w-4" />
                Timeline
              </TabsTrigger>
              <TabsTrigger value="table" className="gap-1.5 px-3">
                <Rows3 className="h-4 w-4" />
                Table
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <Button
            variant="outline"
            onClick={() => refetch()}
            disabled={isLoadingActivities}
          >
            {isLoadingActivities ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCcw className="h-4 w-4 mr-2" />
            )}
            Refresh
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by property code, details, or user..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Source Filter */}
        <Select value={sourceFilter} onValueChange={(v) => setSourceFilter(v as SourceFilter)}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            {sourceFilterOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Type Filter */}
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            {actionTypeOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Mobile View Toggle */}
        <div className="flex sm:hidden">
          <Button
            variant={viewMode === 'timeline' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setViewMode('timeline')}
            className="rounded-r-none"
          >
            <LayoutList className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'table' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setViewMode('table')}
            className="rounded-l-none border-l-0"
          >
            <Rows3 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span>{filteredItems.length} items</span>
        <span className="text-border">|</span>
        <span className="flex items-center gap-1">
          <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
          {filteredItems.filter((i) => i.status === 'success').length} success
        </span>
        <span className="flex items-center gap-1">
          <XCircle className="h-3.5 w-3.5 text-red-600" />
          {filteredItems.filter((i) => ['error', 'failed'].includes(i.status)).length} failed
        </span>
        {syncLog.length > 0 && (
          <>
            <span className="text-border">|</span>
            <span className="flex items-center gap-1">
              <RefreshCcw className="h-3.5 w-3.5" />
              {syncLog.length} syncs
            </span>
          </>
        )}
        {appActivities.length > 0 && (
          <>
            <span className="text-border">|</span>
            <span className="flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5" />
              {appActivities.length} app events
            </span>
          </>
        )}
      </div>

      {/* Content */}
      {isLoadingActivities ? (
        <div className="flex items-center justify-center py-12 border border-border rounded-lg bg-card">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading activity logs...</p>
          </div>
        </div>
      ) : viewMode === 'timeline' ? (
        <div className="border border-border rounded-lg p-4 bg-card">
          <ActivityTimeline items={filteredItems} onItemClick={handleItemClick} />
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px]">Timestamp</TableHead>
                <TableHead className="w-[150px]">Type</TableHead>
                <TableHead className="w-[120px]">Property</TableHead>
                <TableHead>Details</TableHead>
                <TableHead className="w-[100px]">User</TableHead>
                <TableHead className="w-[100px]">Status</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.map((item) => {
                const StatusIcon = statusIcons[item.status] || Clock;

                return (
                  <TableRow
                    key={item.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleItemClick(item)}
                  >
                    <TableCell className="text-sm">
                      {format(new Date(item.timestamp), 'MMM d, yyyy')}
                      <br />
                      <span className="text-muted-foreground">
                        {format(new Date(item.timestamp), 'h:mm a')}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{actionLabels[item.type] || item.type}</Badge>
                    </TableCell>
                    <TableCell>
                      {item.propertyCode ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/properties/${item.propertyId}`);
                          }}
                          className="text-primary hover:underline"
                        >
                          {item.propertyCode}
                        </button>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[300px]">
                      <p className="truncate">{item.details}</p>
                      {item.recordsProcessed !== undefined && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {item.recordsProcessed} records
                          {item.duration !== undefined && ` • ${item.duration}ms`}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{item.user || '—'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <StatusIcon
                          className={cn('h-4 w-4', statusColors[item.status] || 'text-muted-foreground')}
                        />
                        <span
                          className={cn(
                            'text-sm capitalize',
                            statusColors[item.status] || 'text-muted-foreground'
                          )}
                        >
                          {item.status}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {item.propertyId && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/properties/${item.propertyId}`);
                          }}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {filteredItems.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No activity logs found matching your filters.
        </div>
      )}
    </div>
  );
}
