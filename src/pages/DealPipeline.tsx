/**
 * DealPipeline - Main page for deal management
 *
 * Navigation:
 * - Overview (default): Stats, needs attention, upcoming showings
 * - All Deals: List view, By Buyer, By Property
 * - Pipeline Board: Kanban with drag-drop
 */

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageContainer, PageHeader } from '@/components/ui/page-container';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  LayoutDashboard,
  List,
  Columns,
  Users,
  Home,
} from 'lucide-react';
import {
  SearchInput,
  FilterSelect,
  FilterCheckbox,
  FilterBar,
} from '@/components/filters';
import { MATCH_DEAL_STAGES, MATCH_EXIT_STAGES } from '@/types/associations';

// Deal components
import {
  PipelineOverview,
  DealsListView,
  DealsByBuyerView,
  DealsByPropertyView,
  PipelineBoard,
  DealDetailModal,
} from '@/components/deals';

// Hooks
import { useDeals } from '@/services/dealsApi';

// Types
import type { Deal } from '@/types/deals';

type MainView = 'overview' | 'deals' | 'pipeline';
type DealsSubView = 'list' | 'by-buyer' | 'by-property';

// Filter options
const STAGE_OPTIONS = [
  { value: 'all', label: 'All Stages' },
  ...MATCH_DEAL_STAGES.map((stage) => ({ value: stage, label: stage })),
  ...MATCH_EXIT_STAGES.map((stage) => ({ value: stage, label: stage })),
];

const MIN_SCORE_OPTIONS = [
  { value: 'all', label: 'All Scores' },
  { value: '50', label: '50+' },
  { value: '60', label: '60+' },
  { value: '70', label: '70+' },
  { value: '80', label: '80+' },
  { value: '90', label: '90+' },
];

export interface DealPipelineFilters {
  search: string;
  stage: string;
  minScore: string;
  staleOnly: boolean;
  sentToday: boolean;
}

export default function DealPipeline() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Navigation state
  const [mainView, setMainView] = useState<MainView>('overview');
  const [dealsSubView, setDealsSubView] = useState<DealsSubView>('list');

  // Filter state - check URL for initial sentToday filter
  const initialSentToday = searchParams.get('filter') === 'today';
  const [filters, setFilters] = useState<DealPipelineFilters>({
    search: '',
    stage: 'all',
    minScore: 'all',
    staleOnly: false,
    sentToday: initialSentToday,
  });

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return (
      filters.search !== '' ||
      filters.stage !== 'all' ||
      filters.minScore !== 'all' ||
      filters.staleOnly ||
      filters.sentToday
    );
  }, [filters]);

  // Clear all filters
  const clearAllFilters = () => {
    setFilters({
      search: '',
      stage: 'all',
      minScore: 'all',
      staleOnly: false,
      sentToday: false,
    });
  };

  // Selected deal for modal
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  // Fetch deals for deep linking
  const { data: deals } = useDeals();

  // Keep selectedDeal in sync with latest data from deals query
  useEffect(() => {
    if (selectedDeal && deals) {
      const updatedDeal = deals.find((d) => d.id === selectedDeal.id);
      if (updatedDeal) {
        // Check if any relevant fields have changed
        const hasChanges =
          updatedDeal.status !== selectedDeal.status ||
          JSON.stringify(updatedDeal.activities) !== JSON.stringify(selectedDeal.activities) ||
          JSON.stringify(updatedDeal.notes) !== JSON.stringify(selectedDeal.notes);

        if (hasChanges) {
          setSelectedDeal(updatedDeal);
        }
      }
    }
  }, [deals, selectedDeal]);

  // Handle deep linking via URL params
  useEffect(() => {
    const dealId = searchParams.get('dealId');
    const buyerId = searchParams.get('buyerId');
    const filterParam = searchParams.get('filter');

    if (dealId && deals) {
      const deal = deals.find((d) => d.id === dealId);
      if (deal) {
        setSelectedDeal(deal);
        setDetailModalOpen(true);
        setMainView('pipeline');
      }
      // Clear the URL param after using it
      setSearchParams({}, { replace: true });
    } else if (buyerId) {
      // Filter deals by buyer
      setFilters((f) => ({ ...f, search: buyerId }));
      setMainView('deals');
      setDealsSubView('by-buyer');
      // Clear the URL param after using it
      setSearchParams({}, { replace: true });
    } else if (filterParam === 'today') {
      // Filter deals to show only sent today
      setFilters((f) => ({ ...f, sentToday: true }));
      setMainView('deals');
      // Clear the URL param after using it
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams, deals]);

  const handleViewDeal = (deal: Deal) => {
    setSelectedDeal(deal);
    setDetailModalOpen(true);
  };

  const handleCloseModal = (open: boolean) => {
    setDetailModalOpen(open);
    if (!open) {
      // Clear selected deal after modal close animation
      setTimeout(() => setSelectedDeal(null), 200);
    }
  };

  // Handle viewing stale deals from overview
  const handleViewStaleDeals = () => {
    setFilters((f) => ({ ...f, staleOnly: true }));
    setMainView('deals');
    setDealsSubView('list');
  };

  return (
    <PageContainer>
      <PageHeader
        title="Deal Pipeline"
        description="Manage your buyer-property deals through the sales funnel"
      />

      {/* Filter Bar - visible on deals and pipeline tabs */}
      {mainView !== 'overview' && (
        <FilterBar hasActiveFilters={hasActiveFilters} onClearAll={clearAllFilters}>
          <SearchInput
            value={filters.search}
            onChange={(value) => setFilters((f) => ({ ...f, search: value }))}
            placeholder="Search by buyer name or property address..."
            className="w-full sm:w-72"
          />
          <FilterSelect
            label="Stage"
            value={filters.stage}
            options={STAGE_OPTIONS}
            onChange={(value) => setFilters((f) => ({ ...f, stage: value }))}
          />
          <FilterSelect
            label="Min Score"
            value={filters.minScore}
            options={MIN_SCORE_OPTIONS}
            onChange={(value) => setFilters((f) => ({ ...f, minScore: value }))}
          />
          <FilterCheckbox
            label="Stale Only"
            checked={filters.staleOnly}
            onChange={(checked) => setFilters((f) => ({ ...f, staleOnly: checked }))}
          />
          <FilterCheckbox
            label="Sent Today"
            checked={filters.sentToday}
            onChange={(checked) => setFilters((f) => ({ ...f, sentToday: checked }))}
          />
        </FilterBar>
      )}

      {/* Main Navigation Tabs */}
      <Tabs
        value={mainView}
        onValueChange={(v) => setMainView(v as MainView)}
        className="space-y-6"
      >
        <TabsList>
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="deals" className="flex items-center gap-2">
            <List className="h-4 w-4" />
            <span className="hidden sm:inline">All Deals</span>
          </TabsTrigger>
          <TabsTrigger value="pipeline" className="flex items-center gap-2">
            <Columns className="h-4 w-4" />
            <span className="hidden sm:inline">Pipeline Board</span>
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-6">
          <PipelineOverview
            onViewDeal={handleViewDeal}
            onViewStaleDeals={handleViewStaleDeals}
          />
        </TabsContent>

        {/* All Deals Tab */}
        <TabsContent value="deals" className="mt-6 space-y-4">
          {/* Sub-navigation for deals view */}
          <Tabs
            value={dealsSubView}
            onValueChange={(v) => setDealsSubView(v as DealsSubView)}
          >
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">View:</span>
              <TabsList className="h-9">
                <TabsTrigger value="list" className="text-xs px-3">
                  <List className="h-3 w-3 mr-1" />
                  List
                </TabsTrigger>
                <TabsTrigger value="by-buyer" className="text-xs px-3">
                  <Users className="h-3 w-3 mr-1" />
                  By Buyer
                </TabsTrigger>
                <TabsTrigger value="by-property" className="text-xs px-3">
                  <Home className="h-3 w-3 mr-1" />
                  By Property
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="list" className="mt-4">
              <DealsListView
                filters={filters}
                onViewDeal={handleViewDeal}
              />
            </TabsContent>

            <TabsContent value="by-buyer" className="mt-4">
              <DealsByBuyerView
                filters={filters}
                onViewDeal={handleViewDeal}
              />
            </TabsContent>

            <TabsContent value="by-property" className="mt-4">
              <DealsByPropertyView
                filters={filters}
                onViewDeal={handleViewDeal}
              />
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* Pipeline Board Tab */}
        <TabsContent value="pipeline" className="mt-6">
          <PipelineBoard filters={filters} onViewDeal={handleViewDeal} />
        </TabsContent>
      </Tabs>

      {/* Deal Detail Modal */}
      <DealDetailModal
        deal={selectedDeal}
        open={detailModalOpen}
        onOpenChange={handleCloseModal}
      />
    </PageContainer>
  );
}
