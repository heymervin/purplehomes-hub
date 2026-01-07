import { Home, Handshake, FileText, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

type PropertySource = 'Inventory' | 'Partnered' | 'Acquisitions' | 'Zillow';

interface SourceBadgeProps {
  source: PropertySource;
  size?: 'sm' | 'md';
}

/**
 * SourceBadge - Display property source as a colored badge
 *
 * Shows where a property came from:
 * - Inventory (green): Properties from internal inventory
 * - Partnered (blue): Properties from partnered agents
 * - Acquisitions (orange): Properties from acquisition pipeline
 * - Zillow (purple): Properties saved from Zillow search
 */
export function SourceBadge({ source, size = 'sm' }: SourceBadgeProps) {
  const config = {
    Inventory: {
      icon: Home,
      className: 'bg-green-100 text-green-700 border-green-200',
    },
    Partnered: {
      icon: Handshake,
      className: 'bg-blue-100 text-blue-700 border-blue-200',
    },
    Acquisitions: {
      icon: FileText,
      className: 'bg-orange-100 text-orange-700 border-orange-200',
    },
    Zillow: {
      icon: Search,
      className: 'bg-purple-100 text-purple-700 border-purple-200',
    },
  };

  const sourceConfig = config[source] || config.Inventory;
  const Icon = sourceConfig.icon;
  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';

  return (
    <Badge
      variant="outline"
      className={`${sourceConfig.className} ${textSize}`}
    >
      <Icon className={`${iconSize} mr-1`} />
      {source}
    </Badge>
  );
}
