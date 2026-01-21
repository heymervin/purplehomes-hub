// src/components/properties/QuickStatsBar.tsx

import { DollarSign, Bed, Bath, Square, MapPin } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface QuickStatsBarProps {
  price?: number;
  beds?: number;
  baths?: number;
  sqft?: number;
  address?: string;
}

export function QuickStatsBar({ price, beds, baths, sqft, address }: QuickStatsBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-4 p-4 bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-950/30 dark:to-violet-950/30 rounded-lg border border-purple-100 dark:border-purple-800/50">
      {/* Price */}
      <div className="flex items-center gap-2">
        <div className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
          <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Price</p>
          <p className="font-semibold text-green-700 dark:text-green-400">
            {price ? `$${price.toLocaleString()}` : '—'}
          </p>
        </div>
      </div>

      <Separator orientation="vertical" className="h-10 hidden sm:block" />

      {/* Beds */}
      <div className="flex items-center gap-2">
        <div className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
          <Bed className="h-4 w-4 text-purple-600 dark:text-purple-400" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Beds</p>
          <p className="font-semibold">{beds ?? '—'}</p>
        </div>
      </div>

      <Separator orientation="vertical" className="h-10 hidden sm:block" />

      {/* Baths */}
      <div className="flex items-center gap-2">
        <div className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
          <Bath className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Baths</p>
          <p className="font-semibold">{baths ?? '—'}</p>
        </div>
      </div>

      <Separator orientation="vertical" className="h-10 hidden sm:block" />

      {/* Sqft */}
      <div className="flex items-center gap-2">
        <div className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
          <Square className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Sqft</p>
          <p className="font-semibold">{sqft ? sqft.toLocaleString() : '—'}</p>
        </div>
      </div>

      {/* Address (mobile: full width) */}
      {address && (
        <>
          <Separator orientation="vertical" className="h-10 hidden lg:block" />
          <div className="flex items-center gap-2 w-full lg:w-auto">
            <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <p className="text-sm text-muted-foreground truncate">{address}</p>
          </div>
        </>
      )}
    </div>
  );
}
