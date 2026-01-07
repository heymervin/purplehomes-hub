import { useState, useMemo } from 'react';
import { Search, Filter, User, Mail, Phone, DollarSign, Building2, Calendar, ArrowRight, LayoutGrid, List, RefreshCw, Loader2, Eye, EyeOff, Bed, Bath, Maximize2, Tag, X, Plus, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { UnifiedPipelineBoard, UnifiedPipelineCard, type PipelineColumn } from '@/components/pipeline';
import { useOpportunities, useUpdateOpportunityStage, useUpdateOpportunityCustomFields, useTags, useUpdateContactTags, GHLOpportunity } from '@/services/ghlApi';
import type { BuyerAcquisition, AcquisitionStage, ChecklistItem, BuyerChecklist } from '@/types';
import { format } from 'date-fns';
import { toast } from 'sonner';

// Map GHL stage IDs to our stage types - USING ACTUAL STAGE IDs FROM "2. Buyer Home Acquisition" PIPELINE
const stageIdMap: Record<string, AcquisitionStage> = {
  '82b1d31b-4807-44a4-a2e5-aa2fe17a74b0': 'matching',
  '305be21b-3c52-4fae-abdf-23c5477d05a5': 'underwriting-checklist',
  '75bf05cb-0f78-48ec-962a-708b8d13a6ab': 'buyer-review',
  '1e7c6dc4-9a41-47ff-9445-497f1081774c': 'offer-received',
  '4377ef1f-a103-42e9-adfa-c7a78d22723a': 'buyer-contract-signed',
  'bc8d6c4b-4da3-4c5d-8aa0-eeb7feed3859': 'qualification-phase',
  '6f3f0a41-3c31-4f33-aa41-47e4d61fdc51': 'closing-scheduled',
  '1caa0fe9-608d-4f55-82f9-d43f35bb5123': 'closed-won',
  '9b88275f-ae74-44f9-85be-f9c8ae78a0c4': 'lost',
};

// Using unified pipeline colors from COLUMN_COLORS
const stages: { id: AcquisitionStage; label: string; color: string; ghlId: string }[] = [
  { id: 'matching', label: 'Matching', color: 'blue', ghlId: '82b1d31b-4807-44a4-a2e5-aa2fe17a74b0' },
  { id: 'underwriting-checklist', label: 'Underwriting / Checklist', color: 'cyan', ghlId: '305be21b-3c52-4fae-abdf-23c5477d05a5' },
  { id: 'buyer-review', label: 'Buyer Review', color: 'indigo', ghlId: '75bf05cb-0f78-48ec-962a-708b8d13a6ab' },
  { id: 'offer-received', label: 'Offer Received', color: 'amber', ghlId: '1e7c6dc4-9a41-47ff-9445-497f1081774c' },
  { id: 'buyer-contract-signed', label: 'Buyer Contract Signed', color: 'orange', ghlId: '4377ef1f-a103-42e9-adfa-c7a78d22723a' },
  { id: 'qualification-phase', label: 'Qualification Phase', color: 'purple', ghlId: 'bc8d6c4b-4da3-4c5d-8aa0-eeb7feed3859' },
  { id: 'closing-scheduled', label: 'Closing Scheduled', color: 'teal', ghlId: '6f3f0a41-3c31-4f33-aa41-47e4d61fdc51' },
  { id: 'closed-won', label: 'Closed = Won', color: 'green', ghlId: '1caa0fe9-608d-4f55-82f9-d43f35bb5123' },
  { id: 'lost', label: 'Lost', color: 'gray', ghlId: '9b88275f-ae74-44f9-85be-f9c8ae78a0c4' },
];

// Helper to get badge background color from unified color key
const getBadgeBgClass = (colorKey: string): string => {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-500',
    cyan: 'bg-cyan-500',
    indigo: 'bg-indigo-500',
    amber: 'bg-amber-500',
    orange: 'bg-orange-500',
    purple: 'bg-purple-500',
    teal: 'bg-teal-500',
    green: 'bg-green-500',
    gray: 'bg-gray-400',
  };
  return colorMap[colorKey] || 'bg-gray-500';
};

// Default checklist structure - USING REAL GHL CUSTOM FIELDS
const defaultChecklist: BuyerChecklist = {
  bcClosing: [
    { id: 'draft_receipt', label: 'Send them Draft Receipt and E-sign Purchase Agreement', completed: false },
    { id: 'signed_agreement', label: 'Received signed Purchase Agreement', completed: false },
    { id: 'deposit_received', label: 'Deposit Received', completed: false },
    { id: 'open_title', label: 'Open file with title/Send docs', completed: false },
    { id: 'begin_qualification', label: 'If Wrap Buyer, begin Qualification Process', completed: false },
    { id: 'submitted_to_larry', label: 'If Wrap Buyer, submitted all items to Larry', completed: false },
    { id: 'qualification_completed', label: 'If Wrap Buyer, Qualification Completed', completed: false },
    { id: 'servicing_agreement', label: 'Received Servicing Agreement to Buyer', completed: false },
    { id: 'title_clear', label: 'Title clean & clear to close', completed: false },
    { id: 'closing_scheduled', label: 'Closing Scheduled', completed: false },
    { id: 'closing_packet', label: 'Send closing packet to Title', completed: false },
    { id: 'closing_complete', label: 'Closing Complete', completed: false },
  ],
  postClose: [
    { id: 'closing_docs', label: 'Received scanned copy of closing docs from title', completed: false },
    { id: 'buyer_email', label: 'Send buyer email with copy of documents', completed: false },
    { id: 'transmittal_sheet', label: 'Received Transmittal Sheet from Larry', completed: false },
    { id: 'insurance_policy', label: 'Add Buyer to insurance policy', completed: false },
    { id: 'utilities', label: 'Turn off/switch Utilities', completed: false },
  ],
  activeBuyer: [
    { id: 'mls_search', label: 'MLS Search', completed: false },
    { id: 'fb_group_search', label: 'Facebook Group Search', completed: false },
    { id: 'fb_marketplace', label: 'Facebook Marketplace', completed: false },
    { id: 'wholesaler_outreach', label: 'Wholesaler Outreach', completed: false },
    { id: 'agent_outreach', label: 'Agent Outreach', completed: false },
    { id: 'zillow_scrape', label: 'Zillow Scrape', completed: false },
    { id: 'sms_wholesalers', label: 'Send SMS to Wholesalers', completed: false },
    { id: 'send_inventory', label: 'Send Inventory', completed: false },
  ],
};

interface ExtendedBuyerAcquisition extends BuyerAcquisition {
  ghlStageId: string;
  checklist: BuyerChecklist;
  contactId?: string;
  contactTags?: string[];
  contactPropertyPreferences?: {
    bedCount?: number;
    bathCount?: number;
    squareFeet?: number;
    propertyType?: string;
  };
}

// Transform GHL Opportunity to BuyerAcquisition
const transformToBuyerAcquisition = (opp: GHLOpportunity): ExtendedBuyerAcquisition => {
  const getCustomField = (fieldKey: string): string => {
    const field = opp.customFields?.find(
      (cf) => cf.id === fieldKey || cf.id.toLowerCase().includes(fieldKey.toLowerCase())
    );
    return typeof field?.fieldValue === 'string' ? field.fieldValue : '';
  };

  // Get CONTACT custom fields (including property preferences)
  const getContactField = (fieldKey: string): string => {
    const field = opp.contact?.customFields?.find(
      (cf) => cf.id === fieldKey || cf.id.toLowerCase().includes(fieldKey.toLowerCase())
    );
    return typeof field?.fieldValue === 'string' ? field.fieldValue : '';
  };

  // Extract contact property preferences
  const contactBedCount = parseInt(getContactField('bed_count') || getContactField('aZpoXXBf0DCm8ZbwSCBQ')) || undefined;
  const contactBathCount = parseInt(getContactField('bath_count') || getContactField('6dnLT9WrX4G1NDFgRbiw')) || undefined;
  const contactSquareFeet = parseInt(getContactField('square_feet') || getContactField('yqIAK6Cqqiu8E2ASD9ku')) || undefined;
  const contactPropertyType = getContactField('property_type') || getContactField('bagWtxQFWwBbGf9kn9th') || undefined;

  // Map the GHL stage ID directly to our stage
  const stage = stageIdMap[opp.pipelineStageId] || 'matching';

  return {
    id: opp.id,
    ghlStageId: opp.pipelineStageId,
    name: opp.name || opp.contact?.name || 'Unknown',
    email: opp.contact?.email || getCustomField('email') || '',
    phone: opp.contact?.phone || getCustomField('phone') || '',
    propertyId: getCustomField('property_id'),
    propertyAddress: getCustomField('property_address') || '',
    offerAmount: opp.monetaryValue || undefined,
    message: getCustomField('message') || getCustomField('notes'),
    stage,
    checklist: defaultChecklist,
    createdAt: opp.createdAt,
    updatedAt: opp.updatedAt,
    // Add contact ID and tags
    contactId: opp.contactId,
    contactTags: (opp.contact as any)?.tags || [],
    // Add contact property preferences
    contactPropertyPreferences: {
      bedCount: contactBedCount,
      bathCount: contactBathCount,
      squareFeet: contactSquareFeet,
      propertyType: contactPropertyType,
    },
  };
};

export default function BuyerAcquisitions() {
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [selectedAcquisition, setSelectedAcquisition] = useState<ExtendedBuyerAcquisition | null>(null);
  const [localAcquisitions, setLocalAcquisitions] = useState<Record<string, Partial<ExtendedBuyerAcquisition>>>({});
  const [hideEmpty, setHideEmpty] = useState(false);
  
  // Tags state
  const [tagSearch, setTagSearch] = useState('');
  const [tagsOpen, setTagsOpen] = useState(false);
  const [savingTagId, setSavingTagId] = useState<string | null>(null);
  const [localTags, setLocalTags] = useState<Record<string, string[]>>({});

  // Fetch real data from GHL
  const { data: opportunities, isLoading, isError, refetch } = useOpportunities('buyer-acquisition');
  const updateStageMutation = useUpdateOpportunityStage();
  const updateCustomFieldsMutation = useUpdateOpportunityCustomFields();
  
  // Tags
  const { data: tagsData } = useTags();
  const availableTags = tagsData?.tags || [];
  const updateTagsMutation = useUpdateContactTags();

  // Transform opportunities to acquisitions and merge with local state
  const acquisitions = useMemo(() => {
    if (!opportunities) return [];
    return opportunities.map(opp => {
      const baseAcquisition = transformToBuyerAcquisition(opp);
      const localUpdates = localAcquisitions[baseAcquisition.id];
      // Merge local tags if exists
      const mergedTags = localTags[baseAcquisition.contactId || ''] || baseAcquisition.contactTags;
      return localUpdates 
        ? { ...baseAcquisition, ...localUpdates, contactTags: mergedTags } as ExtendedBuyerAcquisition 
        : { ...baseAcquisition, contactTags: mergedTags };
    });
  }, [opportunities, localAcquisitions, localTags]);

  // Get current tags for selected acquisition
  const currentTags = useMemo(() => {
    if (!selectedAcquisition) return [];
    return localTags[selectedAcquisition.contactId || ''] || selectedAcquisition.contactTags || [];
  }, [selectedAcquisition, localTags]);

  const filteredAvailableTags = availableTags.filter((tag: any) =>
    tag.name.toLowerCase().includes(tagSearch.toLowerCase())
  );

  const handleToggleTag = async (tagName: string) => {
    if (!selectedAcquisition?.contactId) {
      toast.error('Contact ID not available');
      return;
    }

    const contactId = selectedAcquisition.contactId;
    const newTags = currentTags.includes(tagName)
      ? currentTags.filter((tag) => tag !== tagName)
      : [...currentTags, tagName];
    
    setSavingTagId(tagName);
    
    // Optimistic update
    setLocalTags(prev => ({
      ...prev,
      [contactId]: newTags
    }));
    
    // Update selected acquisition immediately
    setSelectedAcquisition(prev => prev ? { ...prev, contactTags: newTags } : null);
    
    try {
      await updateTagsMutation.mutateAsync({ contactId, tags: newTags });
      toast.success(currentTags.includes(tagName) ? 'Tag removed' : 'Tag added');
      setTagsOpen(false);
    } catch (error) {
      console.error('Failed to update tags:', error);
      toast.error('Failed to update tags');
      // Rollback on error
      setLocalTags(prev => ({
        ...prev,
        [contactId]: currentTags
      }));
      setSelectedAcquisition(prev => prev ? { ...prev, contactTags: currentTags } : null);
    } finally {
      setSavingTagId(null);
    }
  };

  const handleRemoveTag = async (tagName: string) => {
    if (!selectedAcquisition?.contactId) return;
    
    const contactId = selectedAcquisition.contactId;
    const newTags = currentTags.filter((tag) => tag !== tagName);
    
    setSavingTagId(tagName);
    
    // Optimistic update
    setLocalTags(prev => ({
      ...prev,
      [contactId]: newTags
    }));
    setSelectedAcquisition(prev => prev ? { ...prev, contactTags: newTags } : null);
    
    try {
      await updateTagsMutation.mutateAsync({ contactId, tags: newTags });
      toast.success('Tag removed');
    } catch (error) {
      console.error('Failed to remove tag:', error);
      toast.error('Failed to remove tag');
      // Rollback
      setLocalTags(prev => ({
        ...prev,
        [contactId]: currentTags
      }));
      setSelectedAcquisition(prev => prev ? { ...prev, contactTags: currentTags } : null);
    } finally {
      setSavingTagId(null);
    }
  };

  const filteredAcquisitions = useMemo(() => {
    if (!search) return acquisitions;
    const searchLower = search.toLowerCase();
    return acquisitions.filter(
      (a) =>
        a.name.toLowerCase().includes(searchLower) ||
        a.email.toLowerCase().includes(searchLower) ||
        a.propertyAddress?.toLowerCase().includes(searchLower)
    );
  }, [acquisitions, search]);

  const pipelineColumns: PipelineColumn<ExtendedBuyerAcquisition>[] = useMemo(() => {
    return stages.map((stage) => ({
      id: stage.id,
      label: stage.label,
      color: stage.color, // Already using unified color keys (e.g., 'blue', 'cyan')
      items: filteredAcquisitions.filter((a) => a.stage === stage.id),
      isHidden: stage.id === 'lost',
    }));
  }, [filteredAcquisitions]);

  const moveToNextStage = async (acquisition: ExtendedBuyerAcquisition) => {
    const currentIndex = stages.findIndex((s) => s.id === acquisition.stage);
    if (currentIndex < stages.length - 1) {
      const nextStage = stages[currentIndex + 1];

      try {
        await updateStageMutation.mutateAsync({
          opportunityId: acquisition.id,
          stageId: nextStage.ghlId,
          pipelineType: 'buyer-acquisition',
        });
        toast.success(`Moved to ${nextStage.label}`);
      } catch (err) {
        toast.error('Failed to update stage in GHL');
      }
    }
  };

  const markAsLost = async (acquisition: ExtendedBuyerAcquisition) => {
    const lostStage = stages.find(s => s.id === 'lost');
    if (!lostStage) return;
    
    try {
      await updateStageMutation.mutateAsync({
        opportunityId: acquisition.id,
        stageId: lostStage.ghlId,
        pipelineType: 'buyer-acquisition',
      });
      toast.success('Marked as Lost');
    } catch (err) {
      toast.error('Failed to update stage in GHL');
    }
  };

  const renderChecklistSection = (
    title: string,
    items: ChecklistItem[],
    section: 'bcClosing' | 'postClose' | 'activeBuyer',
    acquisitionId: string
  ) => {
    const displayItems = hideEmpty ? items.filter(item => item.completed) : items;
    const completedCount = items.filter(i => i.completed).length;

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-foreground">{title}</h4>
          <span className="text-xs text-muted-foreground">
            {completedCount}/{items.length} completed
          </span>
        </div>
        <div className="space-y-2">
          {displayItems.map((item) => (
            <div key={item.id} className="flex items-center gap-3">
              <Checkbox
                id={item.id}
                checked={item.completed}
                onCheckedChange={(checked) => 
                  handleUpdateChecklist(acquisitionId, section, item.id, checked as boolean)
                }
              />
              <label
                htmlFor={item.id}
                className={`text-sm cursor-pointer ${
                  item.completed ? 'text-muted-foreground line-through' : 'text-foreground'
                }`}
              >
                {item.label}
              </label>
            </div>
          ))}
          {hideEmpty && displayItems.length === 0 && (
            <p className="text-sm text-muted-foreground italic">No completed items</p>
          )}
        </div>
      </div>
    );
  };

  const handleUpdateChecklist = async (
    acquisitionId: string,
    section: 'bcClosing' | 'postClose' | 'activeBuyer',
    itemId: string,
    completed: boolean
  ) => {
    // Update UI immediately (local state)
    setLocalAcquisitions(prev => {
      const existing = prev[acquisitionId] || {};
      const currentChecklist = existing.checklist || defaultChecklist;
      return {
        ...prev,
        [acquisitionId]: {
          ...existing,
          checklist: {
            ...currentChecklist,
            [section]: currentChecklist[section].map(item =>
              item.id === itemId ? { ...item, completed } : item
            ),
          },
        },
      };
    });
    
    // Update selected acquisition for modal
    setSelectedAcquisition(prev => {
      if (!prev || prev.id !== acquisitionId) return prev;
      return {
        ...prev,
        checklist: {
          ...prev.checklist,
          [section]: prev.checklist[section].map(item =>
            item.id === itemId ? { ...item, completed } : item
          ),
        },
      };
    });

    // Sync to GHL - Map section to GHL custom field name
    const customFieldMap: Record<string, string> = {
      'bcClosing': 'bc_closing_checklist',
      'postClose': 'post_close_actions_checklist',
      'activeBuyer': 'deploy_deal_finder',
    };

    const fieldKey = customFieldMap[section];
    
    try {
      // Get the updated checklist for this section
      const acquisition = acquisitions.find(a => a.id === acquisitionId);
      if (!acquisition) return;

      const updatedSection = acquisition.checklist[section].map(item =>
        item.id === itemId ? { ...item, completed } : item
      );

      // Convert checklist to GHL format (array of completed item labels)
      const completedItems = updatedSection
        .filter(item => item.completed)
        .map(item => item.label);

      // Update in GHL
      await updateCustomFieldsMutation.mutateAsync({
        opportunityId: acquisitionId,
        customFields: {
          [fieldKey]: completedItems,
        },
        pipelineType: 'buyer-acquisition',
      });

      toast.success('Checklist synced to GHL');
    } catch (err) {
      console.error('Failed to sync checklist to GHL:', err);
      toast.error('Failed to sync to GHL');
    }
  };

  const renderCard = (acquisition: ExtendedBuyerAcquisition) => (
    <UnifiedPipelineCard
      id={acquisition.id}
      title={acquisition.name}
      subtitle={acquisition.email}
      location={acquisition.propertyAddress}
      amount={acquisition.offerAmount}
      date={acquisition.createdAt}
      dateFormat="absolute"
      onClick={() => setSelectedAcquisition(acquisition)}
      onAdvance={() => moveToNextStage(acquisition)}
      onMarkLost={() => markAsLost(acquisition)}
      variant="contact"
      imageFallbackIcon="user"
    />
  );

  const activeCount = filteredAcquisitions.filter((a) => a.stage !== 'lost' && a.stage !== 'closed-won').length;

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6 animate-fade-in">
        <EmptyState
          icon={User}
          title="Failed to load acquisitions"
          description="Could not connect to HighLevel API. Please check your connection settings."
          action={
            <Button onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Buyer Home Acquisitions</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {activeCount} active · {filteredAcquisitions.length} total opportunities
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'kanban' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('kanban')}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or property..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" size="icon">
          <Filter className="h-4 w-4" />
        </Button>
      </div>

      {filteredAcquisitions.length === 0 ? (
        <EmptyState
          icon={User}
          title="No acquisitions found"
          description="No buyer acquisitions match your search criteria."
        />
      ) : (
        <>
          {/* Kanban View */}
          {viewMode === 'kanban' && (
            <UnifiedPipelineBoard
              columns={pipelineColumns}
              renderCard={renderCard}
              onDrop={(item, columnId) => {
                const targetStageConfig = stages.find(s => s.id === columnId);
                if (!targetStageConfig) {
                  toast.error('Unable to find target stage');
                  return;
                }
                updateStageMutation.mutateAsync({
                  opportunityId: item.id,
                  stageId: targetStageConfig.ghlId,
                  pipelineType: 'buyer-acquisition',
                }).then(() => {
                  toast.success(`Moved to ${targetStageConfig.label}`);
                }).catch(() => {
                  toast.error('Failed to update stage in GHL');
                });
              }}
              isLoading={isLoading}
              hiddenColumnLabel="Lost"
              emptyStateMessage="No buyers in this stage"
            />
          )}

          {/* List View */}
          {viewMode === 'list' && (
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Buyer</TableHead>
                    <TableHead>Property</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead>Offer Amount</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAcquisitions.map((acq) => {
                    const stage = stages.find((s) => s.id === acq.stage);
                    return (
                      <TableRow 
                        key={acq.id} 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setSelectedAcquisition(acq)}
                      >
                        <TableCell>
                          <div>
                            <p className="font-medium">{acq.name}</p>
                            <p className="text-xs text-muted-foreground">{acq.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>{acq.propertyAddress || '-'}</TableCell>
                        <TableCell>
                          <Badge className={`${getBadgeBgClass(stage?.color || 'gray')} text-white`}>
                            {stage?.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {acq.offerAmount ? `$${acq.offerAmount.toLocaleString()}` : '-'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(acq.createdAt), 'MMM d, yyyy')}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </>
      )}

      {/* Detail Modal */}
      <Dialog open={!!selectedAcquisition} onOpenChange={() => setSelectedAcquisition(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle>Buyer Details</DialogTitle>
          </DialogHeader>
          {selectedAcquisition && (
            <div className="max-h-[calc(90vh-80px)] overflow-y-auto p-6 pt-4 space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-7 w-7 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold">{selectedAcquisition.name}</h3>
                  <Badge className={`${getBadgeBgClass(stages.find(s => s.id === selectedAcquisition.stage)?.color || 'gray')} text-white`}>
                    {stages.find(s => s.id === selectedAcquisition.stage)?.label}
                  </Badge>
                </div>
              </div>

              <div className="grid gap-3">
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="font-medium">{selectedAcquisition.email || '-'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Phone className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Phone</p>
                    <p className="font-medium">{selectedAcquisition.phone || '-'}</p>
                  </div>
                </div>
                {selectedAcquisition.propertyAddress && (
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <Building2 className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Interested Property</p>
                      <p className="font-medium">{selectedAcquisition.propertyAddress}</p>
                    </div>
                  </div>
                )}
                {selectedAcquisition.offerAmount && (
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <DollarSign className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Offer Amount</p>
                      <p className="font-medium">${selectedAcquisition.offerAmount.toLocaleString()}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Submitted</p>
                    <p className="font-medium">{format(new Date(selectedAcquisition.createdAt), 'MMMM d, yyyy')}</p>
                  </div>
                </div>
              </div>

              {selectedAcquisition.message && (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Message</p>
                  <p className="text-sm">{selectedAcquisition.message}</p>
                </div>
              )}

              {/* Tags Section */}
              <Separator />
              <div className="space-y-3">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  Tags
                </h4>
                
                {/* Current Tags */}
                <div className="flex flex-wrap gap-2 min-h-[40px] p-3 border border-border rounded-lg bg-muted/30">
                  {currentTags.length > 0 ? (
                    currentTags.map((tag: string) => (
                      <Badge key={tag} variant="secondary" className="flex items-center gap-1 pr-1">
                        {tag}
                        <button
                          onClick={() => handleRemoveTag(tag)}
                          disabled={savingTagId === tag}
                          className="ml-1 hover:text-destructive rounded-full p-0.5 hover:bg-destructive/10"
                        >
                          {savingTagId === tag ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <X className="h-3 w-3" />
                          )}
                        </button>
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">No tags assigned</span>
                  )}
                </div>

                {/* Add Tags Popover */}
                <Popover open={tagsOpen} onOpenChange={setTagsOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Tags
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent 
                    className="w-80 p-0" 
                    align="start"
                    onWheel={(e) => e.stopPropagation()}
                  >
                    <div className="p-2 border-b">
                      <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search tags..."
                          value={tagSearch}
                          onChange={(e) => setTagSearch(e.target.value)}
                          className="pl-8"
                        />
                      </div>
                    </div>
                    <div className="max-h-[300px] overflow-y-auto p-2">
                      {filteredAvailableTags.length > 0 ? (
                        <div className="space-y-1">
                          {filteredAvailableTags.map((tag: any) => {
                            const isSelected = currentTags.includes(tag.name);
                            const isSaving = savingTagId === tag.name;
                            
                            return (
                              <div
                                key={tag.id}
                                className={`flex items-center justify-between p-2 hover:bg-muted rounded-md cursor-pointer ${
                                  isSelected ? 'bg-primary/10' : ''
                                }`}
                                onClick={() => !isSaving && handleToggleTag(tag.name)}
                              >
                                <span className="text-sm">{tag.name}</span>
                                {isSaving ? (
                                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                ) : isSelected ? (
                                  <Check className="h-4 w-4 text-primary" />
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                          No tags found
                        </div>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Property Preferences */}
              {selectedAcquisition.contactPropertyPreferences && (selectedAcquisition.contactPropertyPreferences.bedCount || selectedAcquisition.contactPropertyPreferences.bathCount || selectedAcquisition.contactPropertyPreferences.squareFeet || selectedAcquisition.contactPropertyPreferences.propertyType) && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm">Property Preferences</h4>
                    <div className="grid grid-cols-2 gap-3">
                      {selectedAcquisition.contactPropertyPreferences.bedCount && (
                        <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-lg border border-primary/20">
                          <Bed className="h-5 w-5 text-primary" />
                          <div>
                            <p className="text-xs text-muted-foreground">Bedrooms</p>
                            <p className="font-semibold">{selectedAcquisition.contactPropertyPreferences.bedCount}</p>
                          </div>
                        </div>
                      )}
                      {selectedAcquisition.contactPropertyPreferences.bathCount && (
                        <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-lg border border-primary/20">
                          <Bath className="h-5 w-5 text-primary" />
                          <div>
                            <p className="text-xs text-muted-foreground">Bathrooms</p>
                            <p className="font-semibold">{selectedAcquisition.contactPropertyPreferences.bathCount}</p>
                          </div>
                        </div>
                      )}
                      {selectedAcquisition.contactPropertyPreferences.squareFeet && (
                        <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-lg border border-primary/20">
                          <Maximize2 className="h-5 w-5 text-primary" />
                          <div>
                            <p className="text-xs text-muted-foreground">Square Feet</p>
                            <p className="font-semibold">{selectedAcquisition.contactPropertyPreferences.squareFeet.toLocaleString()} sqft</p>
                          </div>
                        </div>
                      )}
                      {selectedAcquisition.contactPropertyPreferences.propertyType && (
                        <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-lg border border-primary/20">
                          <Building2 className="h-5 w-5 text-primary" />
                          <div>
                            <p className="text-xs text-muted-foreground">Property Type</p>
                            <p className="font-semibold">{selectedAcquisition.contactPropertyPreferences.propertyType}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              <Separator />

              {/* Hide Empty Toggle */}
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Buyer Closing Checklist</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setHideEmpty(!hideEmpty)}
                  className="text-muted-foreground"
                >
                  {hideEmpty ? <Eye className="h-4 w-4 mr-2" /> : <EyeOff className="h-4 w-4 mr-2" />}
                  {hideEmpty ? 'Show All' : 'Hide Empty Fields'}
                </Button>
              </div>

              {/* B-C Closing Checklist */}
              {renderChecklistSection('B-C Closing Checklist', selectedAcquisition.checklist.bcClosing, 'bcClosing', selectedAcquisition.id)}

              <Separator />

              {/* Post Close Actions */}
              {renderChecklistSection('Post Close Actions: Checklist', selectedAcquisition.checklist.postClose, 'postClose', selectedAcquisition.id)}

              <Separator />

              {/* Active Buyer Checklist */}
              {renderChecklistSection('Deploy Deal Finder', selectedAcquisition.checklist.activeBuyer, 'activeBuyer', selectedAcquisition.id)}

              <Separator />

              <div className="flex gap-2">
                <Button 
                  className="flex-1"
                  onClick={() => {
                    moveToNextStage(selectedAcquisition);
                    setSelectedAcquisition(null);
                  }}
                  disabled={updateStageMutation.isPending}
                >
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Move to Next Stage
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => {
                    markAsLost(selectedAcquisition);
                    setSelectedAcquisition(null);
                  }}
                  disabled={updateStageMutation.isPending}
                >
                  Mark as Lost
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}