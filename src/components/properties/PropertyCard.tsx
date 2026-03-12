import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bed, Bath, Clock, Square, Share2, Check } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Property } from '@/types';
import { format } from 'date-fns';
import { getPropertyShareUrl } from '@/lib/utils/slug';
import { toast } from 'sonner';

interface PropertyCardProps {
  property: Property;
  selected?: boolean;
  onSelect?: (id: string) => void;
  onViewDetail?: (property: Property) => void;
}

export function PropertyCard({
  property,
  selected,
  onSelect,
  onViewDetail,
}: PropertyCardProps) {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = getPropertyShareUrl(property.address, property.city);

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${property.address} - $${property.price.toLocaleString()}`,
          url,
        });
        return;
      } catch (err) {
        // User cancelled or share failed, fall back to copy
      }
    }

    // Copy to clipboard
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success('Link copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCardClick = () => {
    if (onViewDetail) {
      onViewDetail(property);
    } else {
      navigate(`/properties/${property.id}`);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(price);
  };

  const showPostedDate = property.status === 'posted' && property.postedDate;
  const showScheduledDate = property.status === 'scheduled' && property.scheduledDate;

  // Check if property is NEW (posted within last 7 days)
  const isNew = property.postedDate &&
    (new Date().getTime() - new Date(property.postedDate).getTime()) < 7 * 24 * 60 * 60 * 1000;

  return (
    <Card
      className={cn(
        "overflow-hidden transition-all duration-300 cursor-pointer group bg-white",
        "hover:shadow-xl hover:shadow-purple-500/20 hover:-translate-y-1",
        "border border-gray-200 hover:border-purple-300",
        selected && "ring-2 ring-primary border-primary shadow-lg shadow-purple-500/30",
        property.status === 'deleted' && "opacity-60"
      )}
      onClick={handleCardClick}
    >
      {/* Image */}
      <div className="relative aspect-[16/10] overflow-hidden">
        <img
          src={property.heroImage}
          alt={property.address}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        
        {/* Top badges row */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isNew && (
              <span className="inline-flex items-center rounded-full bg-gradient-to-r from-green-500 to-emerald-500 px-3 py-1 text-xs font-bold text-white shadow-lg animate-pulse">
                NEW!
              </span>
            )}
            <span className="inline-flex items-center rounded-md bg-black/60 backdrop-blur-sm px-2 py-1 text-xs font-medium text-white">
              {property.propertyCode}
            </span>
            {property.isDemo && (
              <span className="inline-flex items-center rounded-md bg-accent px-2 py-1 text-xs font-bold text-accent-foreground">
                DEMO
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {/* Share Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleShare}
              className="h-8 w-8 bg-black/40 backdrop-blur-sm hover:bg-black/60 text-white rounded-full"
              title="Share property link"
            >
              {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
            </Button>

            {/* Selection Checkbox */}
            {onSelect && (
              <div onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  checked={selected}
                  onCheckedChange={() => onSelect(property.id)}
                  className={cn(
                    "h-5 w-5 rounded-full border-2 transition-all",
                    selected
                      ? "bg-primary border-primary"
                      : "bg-black/40 border-white/60 hover:border-white"
                  )}
                />
              </div>
            )}
          </div>
        </div>

        {/* Bottom info on image */}
        <div className="absolute bottom-3 left-3 right-3">
          <div className="flex items-end justify-between">
            <div className="flex items-center gap-2">
              {property.source && (
                <span className={cn(
                  "inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold backdrop-blur-sm",
                  property.source === 'Zillow' && "bg-blue-500/80 text-white",
                  property.source === 'Inventory' && "bg-purple-600/80 text-white",
                  property.source === 'Lead' && "bg-amber-500/80 text-white",
                  !['Zillow', 'Inventory', 'Lead'].includes(property.source) && "bg-black/60 text-white",
                )}>
                  {property.source}
                </span>
              )}
              {showPostedDate && (
                <span className="text-xs text-white/80">
                  {format(new Date(property.postedDate!), 'MMM d')}
                </span>
              )}
              {showScheduledDate && (
                <span className="text-xs text-white/80 flex items-center gap-1 inline-flex">
                  <Clock className="h-3 w-3" />
                  {format(new Date(property.scheduledDate!), 'MMM d')}
                </span>
              )}
            </div>
            {property.propertyType && (
              <Badge variant="secondary" className="bg-white/20 backdrop-blur-sm text-white text-xs">
                {property.propertyType}
              </Badge>
            )}
          </div>
        </div>
      </div>

      <CardContent className="p-4">
        {/* Address */}
        <h3 className="font-semibold text-gray-900 mb-0.5 truncate">
          {property.address}
        </h3>
        <p className="text-sm text-gray-600 mb-3">{property.city}</p>

        {/* Price */}
        <div className="mb-3">
          {property.downPayment !== undefined && (
            <p className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-purple-400 bg-clip-text text-transparent">
              {formatPrice(property.downPayment)} down
            </p>
          )}
          {property.monthlyPayment !== undefined && (
            <p className="text-sm font-semibold text-gray-600 mt-1">
              {formatPrice(property.monthlyPayment)}/mo
            </p>
          )}
        </div>

        {/* Property details row */}
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <span className="flex items-center gap-1.5">
            <Bed className="h-4 w-4" />
            {property.beds}
          </span>
          <span className="flex items-center gap-1.5">
            <Bath className="h-4 w-4" />
            {property.baths}
          </span>
          {property.sqft && (
            <span className="flex items-center gap-1.5">
              <Square className="h-4 w-4" />
              {property.sqft.toLocaleString()}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
