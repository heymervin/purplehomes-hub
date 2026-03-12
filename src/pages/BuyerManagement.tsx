/**
 * Buyer Management Page
 * View, edit, and manage buyer preferences with dual sync to Airtable and GHL
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Users, RefreshCw, AlertCircle, Loader2, Filter, X, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PageContainer, PageHeader } from '@/components/ui/page-container';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { BuyerManagementCard } from '@/components/buyers/BuyerManagementCard';
import { BuyerEditModal } from '@/components/buyers/BuyerEditModal';
import { useBuyersList, useDeleteBuyers } from '@/services/buyersApi';
import { toast } from 'sonner';
import type { BuyerRecord, BuyerListFilters } from '@/types/buyer';
import { hasBuyerCriteria } from '@/types/buyer';

const BUYERS_PER_PAGE = 20;

export default function BuyerManagement() {
  const navigate = useNavigate();

  // Filters
  const [filters, setFilters] = useState<BuyerListFilters>({
    search: '',
    qualified: 'all',
    hasCriteria: 'all',
  });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  // Modal state
  const [selectedBuyer, setSelectedBuyer] = useState<BuyerRecord | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  // Fetch buyers
  const {
    data: buyersData,
    isLoading,
    isError,
    refetch,
  } = useBuyersList();

  const deleteBuyers = useDeleteBuyers();

  // Filter and paginate buyers
  const { filteredBuyers, stats } = useMemo(() => {
    if (!buyersData?.buyers) {
      return { filteredBuyers: [], stats: { total: 0, qualified: 0, notQualified: 0, missingCriteria: 0 } };
    }

    let buyers = buyersData.buyers;

    // Calculate stats before filtering
    const stats = {
      total: buyers.length,
      qualified: buyers.filter(b => b.qualified).length,
      notQualified: buyers.filter(b => !b.qualified).length,
      missingCriteria: buyers.filter(b => !hasBuyerCriteria(b)).length,
    };

    // Apply search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      buyers = buyers.filter(b =>
        `${b.firstName} ${b.lastName}`.toLowerCase().includes(searchLower) ||
        b.email?.toLowerCase().includes(searchLower) ||
        b.phone?.includes(filters.search) ||
        b.preferredLocation?.toLowerCase().includes(searchLower) ||
        b.city?.toLowerCase().includes(searchLower)
      );
    }

    // Apply qualified filter
    if (filters.qualified === 'yes') {
      buyers = buyers.filter(b => b.qualified);
    } else if (filters.qualified === 'no') {
      buyers = buyers.filter(b => !b.qualified);
    }

    // Apply criteria filter
    if (filters.hasCriteria === 'complete') {
      buyers = buyers.filter(b => hasBuyerCriteria(b));
    } else if (filters.hasCriteria === 'incomplete') {
      buyers = buyers.filter(b => !hasBuyerCriteria(b));
    }

    return { filteredBuyers: buyers, stats };
  }, [buyersData, filters]);

  // Paginate
  const totalPages = Math.ceil(filteredBuyers.length / BUYERS_PER_PAGE);
  const paginatedBuyers = filteredBuyers.slice(
    (currentPage - 1) * BUYERS_PER_PAGE,
    currentPage * BUYERS_PER_PAGE
  );

  // Reset page when filters change
  const updateFilter = <K extends keyof BuyerListFilters>(key: K, value: BuyerListFilters[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({ search: '', qualified: 'all', hasCriteria: 'all' });
    setCurrentPage(1);
  };

  const hasActiveFilters = filters.search || filters.qualified !== 'all' || filters.hasCriteria !== 'all';

  // Handle selection
  const handleToggleSelect = (recordId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(recordId)) {
        next.delete(recordId);
      } else {
        next.add(recordId);
      }
      return next;
    });
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleBulkDelete = async () => {
    if (!buyersData?.buyers) return;
    const buyersToDelete = buyersData.buyers
      .filter(b => selectedIds.has(b.recordId))
      .map(b => ({ recordId: b.recordId, contactId: b.contactId }));

    try {
      const result = await deleteBuyers.mutateAsync(buyersToDelete);
      toast.success(`Deleted ${result.deletedCount} buyers and ${result.matchesDeleted} related matches`);
      setShowBulkDeleteConfirm(false);
      handleClearSelection();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete buyers');
    }
  };

  // Handle edit
  const handleEdit = (buyer: BuyerRecord) => {
    setSelectedBuyer(buyer);
    setIsEditModalOpen(true);
  };

  // Handle view matches
  const handleViewMatches = (buyer: BuyerRecord) => {
    // Navigate to matching page with buyer filter
    navigate(`/matching?buyerId=${buyer.recordId}`);
  };

  // Handle modal close
  const handleModalSaved = () => {
    refetch();
  };

  return (
    <PageContainer>
      <PageHeader
        title="Buyers"
        description="View and edit buyer preferences with sync to GHL"
        actions={
          <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search buyers..."
            value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={filters.qualified} onValueChange={(v) => updateFilter('qualified', v as BuyerListFilters['qualified'])}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Qualified" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="yes">Qualified</SelectItem>
            <SelectItem value="no">Not Qualified</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filters.hasCriteria} onValueChange={(v) => updateFilter('hasCriteria', v as BuyerListFilters['hasCriteria'])}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Criteria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Criteria</SelectItem>
            <SelectItem value="complete">Has Criteria</SelectItem>
            <SelectItem value="incomplete">Missing Criteria</SelectItem>
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Stats Summary */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>Found <strong className="text-foreground">{filteredBuyers.length}</strong> buyers</span>
        <span className="text-muted-foreground/50">•</span>
        <span><strong className="text-green-600">{stats.qualified}</strong> qualified</span>
        <span className="text-muted-foreground/50">•</span>
        <span><strong className="text-red-600">{stats.notQualified}</strong> not qualified</span>
        <span className="text-muted-foreground/50">•</span>
        <span><strong className="text-amber-600">{stats.missingCriteria}</strong> missing criteria</span>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <AlertCircle className="h-12 w-12 text-destructive mb-4" />
          <h3 className="text-lg font-semibold">Failed to load buyers</h3>
          <p className="text-muted-foreground mb-4">There was an error fetching the buyer data.</p>
          <Button onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      ) : paginatedBuyers.length === 0 ? (
        <EmptyState
          icon={Users}
          title={hasActiveFilters ? "No buyers match your filters" : "No buyers found"}
          description={hasActiveFilters ? "Try adjusting your search or filters" : "Buyers will appear here when added to the system"}
          action={hasActiveFilters ? (
            <Button variant="outline" onClick={clearFilters}>
              Clear Filters
            </Button>
          ) : undefined}
        />
      ) : (
        <>
          {/* Bulk Selection Toolbar */}
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-3 p-4 bg-primary/10 rounded-lg animate-in slide-in-from-top-2">
              <span className="font-medium">
                {selectedIds.size} buyer{selectedIds.size > 1 ? 's' : ''} selected
              </span>
              <div className="flex-1" />
              <Button
                size="sm"
                variant="outline"
                className="text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={() => setShowBulkDeleteConfirm(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete ({selectedIds.size})
              </Button>
              <Button size="sm" variant="ghost" onClick={handleClearSelection}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Buyer List */}
          <div className="space-y-3">
            {paginatedBuyers.map((buyer) => (
              <div key={buyer.recordId} className="flex items-start gap-3">
                <Checkbox
                  checked={selectedIds.has(buyer.recordId)}
                  onCheckedChange={() => handleToggleSelect(buyer.recordId)}
                  className="mt-4"
                />
                <div className="flex-1">
                  <BuyerManagementCard
                    buyer={buyer}
                    onEdit={() => handleEdit(buyer)}
                    onViewMatches={() => handleViewMatches(buyer)}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <p className="text-sm text-muted-foreground">
                Showing {(currentPage - 1) * BUYERS_PER_PAGE + 1} to{' '}
                {Math.min(currentPage * BUYERS_PER_PAGE, filteredBuyers.length)} of{' '}
                {filteredBuyers.length} buyers
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => p - 1)}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground px-2">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(p => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Edit Modal */}
      <BuyerEditModal
        buyer={selectedBuyer}
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        onSaved={handleModalSaved}
      />

      {/* Bulk Delete Confirmation */}
      <AlertDialog open={showBulkDeleteConfirm} onOpenChange={setShowBulkDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.size} Buyers</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure? This will also remove related match records and GHL contacts. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteBuyers.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={deleteBuyers.isPending}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleteBuyers.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                `Delete ${selectedIds.size} Buyers`
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageContainer>
  );
}
