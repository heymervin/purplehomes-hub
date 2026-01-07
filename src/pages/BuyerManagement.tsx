/**
 * Buyer Management Page
 * View, edit, and manage buyer preferences with dual sync to Airtable and GHL
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Users, RefreshCw, AlertCircle, Loader2, Filter, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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
import { BuyerManagementCard } from '@/components/buyers/BuyerManagementCard';
import { BuyerEditModal } from '@/components/buyers/BuyerEditModal';
import { useBuyersList } from '@/services/buyersApi';
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

  // Fetch buyers
  const {
    data: buyersData,
    isLoading,
    isError,
    refetch,
  } = useBuyersList();

  // Filter and paginate buyers
  const { filteredBuyers, stats } = useMemo(() => {
    if (!buyersData?.buyers) {
      return { filteredBuyers: [], stats: { total: 0, qualified: 0, missingCriteria: 0 } };
    }

    let buyers = buyersData.buyers;

    // Calculate stats before filtering
    const stats = {
      total: buyers.length,
      qualified: buyers.filter(b => b.qualified).length,
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-8 w-8 text-purple-500" />
            Buyer Management
          </h1>
          <p className="text-muted-foreground mt-1">
            View and edit buyer preferences with sync to GHL
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

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
          {/* Buyer List */}
          <div className="space-y-3">
            {paginatedBuyers.map((buyer) => (
              <BuyerManagementCard
                key={buyer.recordId}
                buyer={buyer}
                onEdit={() => handleEdit(buyer)}
                onViewMatches={() => handleViewMatches(buyer)}
              />
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
    </div>
  );
}
