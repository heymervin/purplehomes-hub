/**
 * MatchingSummary - Dashboard summary for the Matching page
 *
 * Shows immediate value on page load:
 * - 3 key stats: Ready to Send, Sent Today, In Pipeline (linked)
 * - Top 5 buyers by match count
 * - Top 5 new buyers by date added
 */

import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Target,
  Send,
  TrendingUp,
  Users,
  ArrowRight,
  Mail,
  UserPlus,
  Calendar,
} from 'lucide-react';
import { useBuyersWithMatches, useNewBuyers, useMatchStats } from '@/services/matchingApi';

interface MatchingSummaryProps {
  onSelectBuyer: (buyerId: string) => void;
  onViewProperty: (propertyCode: string) => void;
}

export function MatchingSummary({ onSelectBuyer, onViewProperty }: MatchingSummaryProps) {
  const navigate = useNavigate();

  // Get match stats from new endpoint
  const { data: matchStats, isLoading: loadingStats } = useMatchStats();

  // Get top 5 buyers by match count
  const { data: topBuyersData, isLoading: loadingBuyers } = useBuyersWithMatches({}, 5);

  // Get top 5 new buyers by date added
  const { data: newBuyersData, isLoading: loadingNewBuyers } = useNewBuyers(5);

  const topBuyers = topBuyersData?.data || [];
  const newBuyers = newBuyersData?.data || [];

  // Use stats from API
  const readyToSend = matchStats?.readyToSend || 0;
  const sentToday = matchStats?.sentToday || 0;
  const inPipeline = matchStats?.inPipeline || 0;

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Ready to Send */}
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-purple-600/5" />
          <div className="relative p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-purple-100">
                <Target className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Ready to Send</p>
                {loadingStats ? (
                  <Skeleton className="h-8 w-16 mt-1" />
                ) : (
                  <p className="text-3xl font-bold text-foreground">{readyToSend}</p>
                )}
                <p className="text-xs text-muted-foreground mt-0.5">
                  matches not yet sent
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Sent Today */}
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-green-600/5" />
          <div className="relative p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-green-100">
                <Send className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Sent Today</p>
                {loadingStats ? (
                  <Skeleton className="h-8 w-16 mt-1" />
                ) : (
                  <p className="text-3xl font-bold text-foreground">{sentToday}</p>
                )}
                <p className="text-xs text-muted-foreground mt-0.5">
                  properties emailed
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* In Pipeline - Clickable */}
        <Card
          className="relative overflow-hidden cursor-pointer hover:shadow-md transition-shadow border-2 border-transparent hover:border-indigo-200"
          onClick={() => navigate('/deals')}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-indigo-600/5" />
          <div className="relative p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-indigo-100">
                <TrendingUp className="h-6 w-6 text-indigo-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">In Pipeline</p>
                {loadingStats ? (
                  <Skeleton className="h-8 w-16 mt-1" />
                ) : (
                  <p className="text-3xl font-bold text-foreground">{inPipeline}</p>
                )}
                <p className="text-xs text-indigo-600 mt-0.5 flex items-center gap-1">
                  View Deal Pipeline
                  <ArrowRight className="h-3 w-3" />
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Top Lists Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Buyers */}
        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Users className="h-5 w-5 text-purple-500" />
                Top Buyers by Matches
              </h3>
              <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                Top 5
              </Badge>
            </div>

            {loadingBuyers ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : topBuyers.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No buyers with matches yet
              </div>
            ) : (
              <div className="space-y-2">
                {topBuyers.map((buyer, index) => {
                  // Count unsent matches for this buyer
                  const unsentCount = buyer.matches.filter((m) => !m.stage).length;

                  return (
                    <div
                      key={buyer.recordId || buyer.contactId}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors group"
                    >
                      {/* Rank */}
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-sm font-semibold text-purple-700">
                        {index + 1}
                      </div>

                      {/* Buyer Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {buyer.firstName} {buyer.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {buyer.email}
                        </p>
                      </div>

                      {/* Match Count with unsent indicator */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge variant="secondary">
                          {buyer.totalMatches} {buyer.totalMatches === 1 ? 'match' : 'matches'}
                        </Badge>
                        {unsentCount > 0 && (
                          <Badge variant="outline" className="text-purple-600 border-purple-300">
                            {unsentCount} unsent
                          </Badge>
                        )}
                      </div>

                      {/* View Button */}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="flex-shrink-0"
                        onClick={() => onSelectBuyer(buyer.recordId || buyer.contactId)}
                      >
                        View
                        <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Card>

        {/* New Buyers */}
        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-green-500" />
                New Buyers
              </h3>
              <Badge variant="secondary" className="bg-green-100 text-green-700">
                Recent 5
              </Badge>
            </div>

            {loadingNewBuyers ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : newBuyers.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No new buyers yet
              </div>
            ) : (
              <div className="space-y-2">
                {newBuyers.map((buyer, index) => {
                  // Count unsent matches for this buyer
                  const unsentCount = buyer.matches.filter((m) => !m.stage).length;

                  // Format date added
                  const dateAdded = buyer.dateAdded
                    ? new Date(buyer.dateAdded).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : 'Unknown';

                  return (
                    <div
                      key={buyer.recordId || buyer.contactId}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors group"
                    >
                      {/* Rank/Position */}
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-sm font-semibold text-green-700">
                        {index + 1}
                      </div>

                      {/* Buyer Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {buyer.firstName} {buyer.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Added {dateAdded}
                        </p>
                      </div>

                      {/* Match Count with unsent indicator */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge variant="secondary">
                          {buyer.totalMatches} {buyer.totalMatches === 1 ? 'match' : 'matches'}
                        </Badge>
                        {unsentCount > 0 && (
                          <Badge variant="outline" className="text-purple-600 border-purple-300">
                            {unsentCount} unsent
                          </Badge>
                        )}
                      </div>

                      {/* View Button */}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="flex-shrink-0"
                        onClick={() => onSelectBuyer(buyer.recordId || buyer.contactId)}
                      >
                        View
                        <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Manual Selection CTA */}
      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          Or select manually from the dropdown below
        </p>
      </div>
    </div>
  );
}
