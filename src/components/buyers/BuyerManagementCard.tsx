/**
 * BuyerManagementCard - Display buyer info in buyer management list view
 */

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  User,
  Mail,
  Phone,
  Bed,
  Bath,
  MapPin,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Edit,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BuyerRecord } from '@/types/buyer';
import { hasBuyerCriteria, getMissingCriteria } from '@/types/buyer';

interface BuyerManagementCardProps {
  buyer: BuyerRecord;
  onEdit: () => void;
  onViewMatches: () => void;
}

export function BuyerManagementCard({ buyer, onEdit, onViewMatches }: BuyerManagementCardProps) {
  const fullName = `${buyer.firstName} ${buyer.lastName}`.trim() || 'Unnamed Buyer';
  const hasAllCriteria = hasBuyerCriteria(buyer);
  const missingCriteria = getMissingCriteria(buyer);

  return (
    <Card className={cn(
      "p-4 transition-all hover:shadow-md hover:border-primary/30",
      !hasAllCriteria && "border-l-4 border-l-amber-400"
    )}>
      <div className="flex items-start justify-between gap-4">
        {/* Left: Buyer Info */}
        <div className="flex-1 min-w-0">
          {/* Name & Status Row */}
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <h3 className="font-semibold truncate">{fullName}</h3>
            </div>

            {/* Qualified Badge */}
            {buyer.qualified ? (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800">
                <CheckCircle className="h-3 w-3 mr-1" />
                Qualified
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800">
                <XCircle className="h-3 w-3 mr-1" />
                Not Qualified
              </Badge>
            )}

            {/* Missing Criteria Warning */}
            {!hasAllCriteria && (
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Missing Criteria
              </Badge>
            )}
          </div>

          {/* Contact Info */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3 flex-wrap">
            {buyer.email && (
              <span className="flex items-center gap-1 truncate">
                <Mail className="h-3 w-3 flex-shrink-0" />
                <span className="truncate max-w-[200px]">{buyer.email}</span>
              </span>
            )}
            {buyer.phone && (
              <span className="flex items-center gap-1">
                <Phone className="h-3 w-3 flex-shrink-0" />
                {buyer.phone}
              </span>
            )}
          </div>

          {/* Criteria Row */}
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="flex items-center gap-1">
              <Bed className="h-4 w-4 text-purple-500" />
              {buyer.desiredBeds ? `${buyer.desiredBeds} beds` : '--'}
            </span>
            <span className="flex items-center gap-1">
              <Bath className="h-4 w-4 text-purple-500" />
              {buyer.desiredBaths ? `${buyer.desiredBaths} baths` : '--'}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="h-4 w-4 text-purple-500" />
              {buyer.preferredLocation || buyer.city || '--'}
            </span>
            <span className="flex items-center gap-1">
              <DollarSign className="h-4 w-4 text-purple-500" />
              {buyer.downPayment ? `$${buyer.downPayment.toLocaleString()} down` : '--'}
            </span>
          </div>

          {/* Missing Criteria Detail */}
          {missingCriteria.length > 0 && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
              Missing: {missingCriteria.join(', ')}
            </p>
          )}
        </div>

        {/* Right: Actions & Match Count */}
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          {/* Match Count */}
          <Badge
            variant="secondary"
            className={cn(
              "text-sm",
              buyer.matchCount && buyer.matchCount > 0
                ? "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300"
                : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
            )}
          >
            {buyer.matchCount || 0} matches
          </Badge>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); onEdit(); }}>
              <Edit className="h-4 w-4 mr-1" />
              Edit
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => { e.stopPropagation(); onViewMatches(); }}
              disabled={!buyer.matchCount}
              className="text-muted-foreground hover:text-foreground"
            >
              Matches
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
