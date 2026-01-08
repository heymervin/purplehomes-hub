/**
 * AllBuyersSection - Displays all buyers with filtering, sorting, and pagination
 *
 * Replaces the buyer dropdown selector with a visible, filterable list
 */

import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Users,
  Mail,
  Bed,
  Bath,
  DollarSign,
  MapPin,
  Send,
  ArrowRight,
} from 'lucide-react';
import { useBuyersWithMatches } from '@/services/matchingApi';
import { SentPropertiesModal } from './SentPropertiesModal';
import type { BuyerWithMatches } from '@/types/matching';

interface AllBuyersSectionProps {
  onSelectBuyer: (buyerId: string) => void;
}

type QualificationFilter = 'all' | 'qualified' | 'not-qualified';
type SortOption = 'most-matches' | 'fewest-matches' | 'name-az' | 'name-za' | 'newest' | 'oldest' | 'recently-sent';

export function AllBuyersSection({ onSelectBuyer }: AllBuyersSectionProps) {
  // State for filters and pagination
  const [qualificationFilter, setQualificationFilter] = useState<QualificationFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('most-matches');
  const [displayLimit, setDisplayLimit] = useState(20);

  // State for sent properties modal
  const [selectedBuyerForModal, setSelectedBuyerForModal] = useState<BuyerWithMatches | null>(null);
  const [sentPropertiesModalOpen, setSentPropertiesModalOpen] = useState(false);

  // Fetch all buyers with matches
  const { data: buyersData, isLoading } = useBuyersWithMatches({}, 100);
  const buyersList = buyersData?.data || [];

  // Calculate counts
  const allBuyersCount = buyersList.length;
  const qualifiedCount = buyersList.filter(b => b.qualified === true).length;
  const notQualifiedCount = allBuyersCount - qualifiedCount;

  // Filter and sort buyers
  const filteredAndSortedBuyers = useMemo(() => {
    let filtered = [...buyersList];

    // Apply qualification filter
    if (qualificationFilter === 'qualified') {
      filtered = filtered.filter(buyer => buyer.qualified === true);
    } else if (qualificationFilter === 'not-qualified') {
      filtered = filtered.filter(buyer => buyer.qualified === false || !buyer.qualified);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'most-matches':
          return (b.totalMatches || 0) - (a.totalMatches || 0);

        case 'fewest-matches':
          return (a.totalMatches || 0) - (b.totalMatches || 0);

        case 'name-az': {
          const nameA = `${a.firstName} ${a.lastName}`.toLowerCase();
          const nameB = `${b.firstName} ${b.lastName}`.toLowerCase();
          return nameA.localeCompare(nameB);
        }

        case 'name-za': {
          const nameA = `${a.firstName} ${a.lastName}`.toLowerCase();
          const nameB = `${b.firstName} ${b.lastName}`.toLowerCase();
          return nameB.localeCompare(nameA);
        }

        case 'newest':
          if (!a.dateAdded || !b.dateAdded) return 0;
          return new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime();

        case 'oldest':
          if (!a.dateAdded || !b.dateAdded) return 0;
          return new Date(a.dateAdded).getTime() - new Date(b.dateAdded).getTime();

        case 'recently-sent': {
          // Sort by most recent sent date from matches
          const getSentDate = (buyer: BuyerWithMatches) => {
            const sentMatches = buyer.matches.filter(m => m.status && m.status !== 'New Match');
            if (sentMatches.length === 0) return 0;
            // Get most recent updatedAt
            const dates = sentMatches
              .map(m => m.updatedAt ? new Date(m.updatedAt).getTime() : 0)
              .filter(d => d > 0);
            return dates.length > 0 ? Math.max(...dates) : 0;
          };
          return getSentDate(b) - getSentDate(a);
        }

        default:
          return 0;
      }
    });

    return filtered;
  }, [buyersList, qualificationFilter, sortBy]);

  // Paginated buyers
  const displayedBuyers = filteredAndSortedBuyers.slice(0, displayLimit);
  const hasMore = filteredAndSortedBuyers.length > displayLimit;

  // Check if buyer was added in last 7 days
  const isNewBuyer = (dateAdded?: string) => {
    if (!dateAdded) return false;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return new Date(dateAdded) > sevenDaysAgo;
  };

  // Calculate sent count for a buyer
  const getSentCount = (buyer: BuyerWithMatches) => {
    return buyer.matches.filter(m => m.status && m.status !== 'New Match').length;
  };

  // Handle view sent properties
  const handleViewSentProperties = (buyer: BuyerWithMatches) => {
    setSelectedBuyerForModal(buyer);
    setSentPropertiesModalOpen(true);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="border-t pt-6 space-y-4">
        <div>
          <Skeleton className="h-7 w-40 mb-1" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-24 w-full" />
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="border-t pt-6 space-y-4">
      {/* Header */}
      <div>
        <h3 className="text-xl font-semibold flex items-center gap-2 mb-1">
          <Users className="h-5 w-5 text-purple-500" />
          All Buyers
        </h3>
        <p className="text-sm text-muted-foreground">
          Browse and filter complete buyer list
        </p>
      </div>

      {/* Filters & Sort Controls */}
      <div className="bg-card border rounded-lg p-4 space-y-3">
        {/* Filter Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-muted-foreground">Filter:</span>

          <Button
            variant={qualificationFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setQualificationFilter('all')}
            className={qualificationFilter === 'all' ? 'bg-purple-600 hover:bg-purple-700' : ''}
          >
            All ({allBuyersCount})
          </Button>

          <Button
            variant={qualificationFilter === 'qualified' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setQualificationFilter('qualified')}
            className={qualificationFilter === 'qualified' ? 'bg-green-600 hover:bg-green-700' : ''}
          >
            Qualified ({qualifiedCount})
          </Button>

          <Button
            variant={qualificationFilter === 'not-qualified' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setQualificationFilter('not-qualified')}
            className={qualificationFilter === 'not-qualified' ? 'bg-orange-600 hover:bg-orange-700' : ''}
          >
            Not Qualified ({notQualifiedCount})
          </Button>
        </div>

        {/* Sort Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Sort by:</span>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="most-matches">Most Matches First</SelectItem>
              <SelectItem value="fewest-matches">Fewest Matches First</SelectItem>
              <SelectItem value="name-az">Name (A-Z)</SelectItem>
              <SelectItem value="name-za">Name (Z-A)</SelectItem>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
              <SelectItem value="recently-sent">Most Recently Sent</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Stats Summary Bar */}
        <div className="bg-muted/30 rounded-lg px-4 py-2 text-sm text-muted-foreground">
          Showing {filteredAndSortedBuyers.length} buyers
          {qualificationFilter === 'all' && ` • ${qualifiedCount} qualified • ${notQualifiedCount} not qualified`}
          {qualificationFilter === 'qualified' && ' • All qualified'}
          {qualificationFilter === 'not-qualified' && ' • All not qualified'}
        </div>
      </div>

      {/* Buyer Cards List */}
      <div className="space-y-3">
        {displayedBuyers.map((buyer) => {
          const sentCount = getSentCount(buyer);
          const isNew = isNewBuyer(buyer.dateAdded);

          return (
            <Card
              key={buyer.recordId || buyer.contactId}
              className="p-4 hover:shadow-md transition-shadow cursor-pointer group"
              onClick={() => onSelectBuyer(buyer.recordId || buyer.contactId)}
            >
              <div className="flex items-start justify-between">
                {/* Left: Buyer Info */}
                <div className="flex-1 space-y-2">
                  {/* Name & Qualification */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-semibold text-base">
                      {buyer.firstName} {buyer.lastName}
                    </h4>

                    {buyer.qualified ? (
                      <Badge variant="default" className="bg-green-100 text-green-700 border-green-200">
                        Qualified
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-orange-100 text-orange-700 border-orange-200">
                        Not Qualified
                      </Badge>
                    )}

                    {isNew && (
                      <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                        New
                      </Badge>
                    )}
                  </div>

                  {/* Email */}
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5" />
                    {buyer.email}
                  </p>

                  {/* Criteria */}
                  <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                    {buyer.desiredBeds && (
                      <span className="flex items-center gap-1">
                        <Bed className="h-3.5 w-3.5" />
                        {buyer.desiredBeds}bd
                      </span>
                    )}
                    {buyer.desiredBaths && (
                      <span className="flex items-center gap-1">
                        <Bath className="h-3.5 w-3.5" />
                        {buyer.desiredBaths}ba
                      </span>
                    )}
                    {buyer.downPayment && (
                      <span className="flex items-center gap-1">
                        <DollarSign className="h-3.5 w-3.5" />
                        ${buyer.downPayment.toLocaleString()} down
                      </span>
                    )}
                    {(buyer.city || buyer.preferredLocation) && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {buyer.city || buyer.preferredLocation}
                      </span>
                    )}
                  </div>

                  {/* Match Stats */}
                  <div className="flex items-center gap-3 text-sm">
                    <span className="font-medium text-purple-600">
                      {buyer.totalMatches || 0} matches
                    </span>
                    <span className="text-muted-foreground">•</span>
                    {sentCount > 0 ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewSentProperties(buyer);
                        }}
                        className="text-purple-600 hover:text-purple-700 hover:underline font-medium flex items-center gap-1"
                      >
                        <Send className="h-3 w-3" />
                        {sentCount} sent
                      </button>
                    ) : (
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Send className="h-3 w-3" />
                        0 sent
                      </span>
                    )}
                  </div>
                </div>

                {/* Right: Action Button */}
                <Button
                  variant="outline"
                  size="sm"
                  className="ml-4 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectBuyer(buyer.recordId || buyer.contactId);
                  }}
                >
                  View Matches
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Load More Button */}
      {hasMore && (
        <div className="flex justify-center pt-4">
          <Button
            variant="outline"
            onClick={() => setDisplayLimit(prev => prev + 20)}
          >
            Load More ({filteredAndSortedBuyers.length - displayLimit} remaining)
          </Button>
        </div>
      )}

      {/* Show count */}
      {filteredAndSortedBuyers.length > 0 && (
        <p className="text-sm text-center text-muted-foreground pt-2">
          Showing {displayedBuyers.length} of {filteredAndSortedBuyers.length} buyers
        </p>
      )}

      {/* Empty State */}
      {filteredAndSortedBuyers.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>No buyers match your filters</p>
          <Button
            variant="link"
            onClick={() => {
              setQualificationFilter('all');
              setSortBy('most-matches');
            }}
            className="mt-2"
          >
            Clear Filters
          </Button>
        </div>
      )}

      {/* Sent Properties Modal */}
      <SentPropertiesModal
        open={sentPropertiesModalOpen}
        onOpenChange={setSentPropertiesModalOpen}
        buyer={selectedBuyerForModal}
      />
    </div>
  );
}
