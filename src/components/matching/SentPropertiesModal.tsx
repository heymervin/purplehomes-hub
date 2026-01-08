import { useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ExternalLink,
  Mail,
  Phone,
  MapPin,
  Bed,
  Bath,
  Square,
  DollarSign,
  Home,
  AlertCircle,
} from 'lucide-react';
import { useBuyerProperties } from '@/services/matchingApi';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { StageBadge } from './StageBadge';
import { SourceBadge } from './SourceBadge';
import { MatchScoreBadge } from './MatchScoreBadge';
import type { BuyerCriteria, ScoredProperty } from '@/types/matching';
import type { MatchDealStage } from '@/types/associations';

interface SentPropertiesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  buyer: BuyerCriteria | null;
}

export function SentPropertiesModal({ open, onOpenChange, buyer }: SentPropertiesModalProps) {
  const navigate = useNavigate();

  // Reuse existing API hook - this already fetches all properties for the buyer
  const buyerId = buyer?.recordId || buyer?.contactId;
  const { data: buyerProperties, isLoading, error } = useBuyerProperties(buyerId, {
    enabled: !!buyerId && open,
  });

  // Filter to only show properties that have been sent (have currentStage)
  const sentProperties = useMemo(() => {
    if (!buyerProperties) return [];

    const allProperties = [
      ...(buyerProperties.priorityMatches || []),
      ...(buyerProperties.exploreMatches || [])
    ];

    // Filter for properties with currentStage (meaning they were sent to deal pipeline)
    return allProperties.filter(item => item.currentStage);
  }, [buyerProperties]);

  // Get the most recent send date
  const lastSentDate = useMemo(() => {
    if (sentProperties.length === 0) return null;

    const dates = sentProperties
      .map(item => item.dateSent)
      .filter(Boolean)
      .sort((a, b) => new Date(b!).getTime() - new Date(a!).getTime());

    return dates[0] || null;
  }, [sentProperties]);

  if (!buyer) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            Sent Properties for {buyer.firstName} {buyer.lastName}
          </DialogTitle>
          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
            {buyer.email && (
              <span className="flex items-center gap-1">
                <Mail className="h-3.5 w-3.5" />
                {buyer.email}
              </span>
            )}
            {buyer.phone && (
              <span className="flex items-center gap-1">
                <Phone className="h-3.5 w-3.5" />
                {buyer.phone}
              </span>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-2">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="p-4">
                  <Skeleton className="h-32 w-full" />
                </Card>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-600">
              <AlertCircle className="h-12 w-12 mx-auto mb-2" />
              <p>Failed to load sent properties</p>
            </div>
          ) : sentProperties.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Mail className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No properties sent to this buyer yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Summary */}
              <div className="bg-muted/30 rounded-lg p-3 flex items-center gap-4 text-sm flex-wrap">
                <span className="font-medium">
                  {sentProperties.length} {sentProperties.length === 1 ? 'property' : 'properties'} sent
                </span>
                {lastSentDate && (
                  <span className="text-muted-foreground">
                    Last sent: {formatDistanceToNow(new Date(lastSentDate), { addSuffix: true })}
                  </span>
                )}
              </div>

              {/* Property Cards */}
              {sentProperties.map((item) => (
                <SentPropertyCard
                  key={item.property.recordId}
                  scoredProperty={item}
                  buyerId={buyerId!}
                  onNavigate={() => onOpenChange(false)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {sentProperties.length > 0 && (
          <div className="border-t pt-4 mt-4">
            <Button
              variant="default"
              className="w-full"
              onClick={() => {
                navigate(`/deals?buyer=${buyerId}`);
                onOpenChange(false);
              }}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              View All in Deal Pipeline
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

interface SentPropertyCardProps {
  scoredProperty: ScoredProperty;
  buyerId: string;
  onNavigate: () => void;
}

function SentPropertyCard({ scoredProperty, buyerId, onNavigate }: SentPropertyCardProps) {
  const navigate = useNavigate();
  const { property, score, currentStage, dateSent } = scoredProperty;

  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="flex gap-4">
        {/* Property Image */}
        <div className="flex-shrink-0 w-24 h-24 rounded-lg overflow-hidden bg-gradient-to-br from-purple-100 to-purple-50 flex items-center justify-center">
          {property.heroImage ? (
            <img
              src={property.heroImage}
              alt={property.address}
              className="w-full h-full object-cover"
            />
          ) : (
            <Home className="h-8 w-8 text-purple-300" />
          )}
        </div>

        {/* Property Details */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <h3 className="font-semibold text-base truncate">{property.address}</h3>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {/* Source Badge */}
                {property.source && (
                  <SourceBadge source={property.source} size="sm" />
                )}

                {/* Match Score */}
                <MatchScoreBadge score={score.score} size="sm" showLabel={false} />
              </div>
            </div>

            {/* Stage Badge */}
            {currentStage && (
              <StageBadge stage={currentStage as MatchDealStage} size="sm" showIcon />
            )}
          </div>

          {/* Property Stats */}
          <div className="flex items-center gap-3 text-sm text-muted-foreground mb-2">
            {property.price && (
              <span className="flex items-center gap-1 font-medium text-foreground">
                <DollarSign className="h-3.5 w-3.5" />
                ${property.price.toLocaleString()}
              </span>
            )}
            {property.beds && (
              <span className="flex items-center gap-1">
                <Bed className="h-3.5 w-3.5" />
                {property.beds}
              </span>
            )}
            {property.baths && (
              <span className="flex items-center gap-1">
                <Bath className="h-3.5 w-3.5" />
                {property.baths}
              </span>
            )}
            {property.sqft && (
              <span className="flex items-center gap-1">
                <Square className="h-3.5 w-3.5" />
                {property.sqft.toLocaleString()}
              </span>
            )}
          </div>

          {/* Location */}
          {(property.city || property.state) && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
              <MapPin className="h-3.5 w-3.5" />
              <span>
                {property.city && property.state
                  ? `${property.city}, ${property.state}`
                  : property.city || property.state
                }
                {property.zipCode && ` ${property.zipCode}`}
              </span>
              {score.distanceMiles !== null && (
                <Badge variant="secondary" className="text-xs">
                  {score.distanceMiles < 1
                    ? '< 1 mi'
                    : `${score.distanceMiles.toFixed(1)} mi`
                  }
                </Badge>
              )}
            </div>
          )}

          {/* Date Sent and Actions */}
          <div className="flex items-center justify-between">
            {dateSent && (
              <span className="text-xs text-muted-foreground">
                Sent {formatDistanceToNow(new Date(dateSent), { addSuffix: true })}
              </span>
            )}

            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => {
                navigate(`/deals?buyer=${buyerId}&property=${property.propertyCode || property.recordId}`);
                onNavigate();
              }}
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              View in Pipeline
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
