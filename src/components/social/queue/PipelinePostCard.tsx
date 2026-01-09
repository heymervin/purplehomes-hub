/**
 * PipelinePostCard
 *
 * Individual post card in the pipeline view showing time, thumbnail,
 * content preview, platforms, and actions.
 */

import {
  Clock,
  Edit2,
  Trash2,
  Facebook,
  Instagram,
  Linkedin,
  Image,
  MoreHorizontal,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { PipelinePost } from '@/lib/queue/types';

interface PipelinePostCardProps {
  post: PipelinePost;
  onEdit: () => void;
  onDelete: () => void;
}

const platformIcons: Record<string, React.ElementType> = {
  facebook: Facebook,
  instagram: Instagram,
  linkedin: Linkedin,
};

const platformColors: Record<string, string> = {
  facebook: 'text-blue-500',
  instagram: 'text-pink-500',
  linkedin: 'text-blue-700',
};

export function PipelinePostCard({
  post,
  onEdit,
  onDelete,
}: PipelinePostCardProps) {
  const timeLabel = post.scheduledAt.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  // Calculate time until post
  const now = new Date();
  const diffMs = post.scheduledAt.getTime() - now.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  let timeUntil = '';
  if (diffMs < 0) {
    timeUntil = 'Overdue';
  } else if (diffHours > 24) {
    const days = Math.floor(diffHours / 24);
    timeUntil = `${days}d`;
  } else if (diffHours > 0) {
    timeUntil = `${diffHours}h ${diffMins}m`;
  } else {
    timeUntil = `${diffMins}m`;
  }

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
      {/* Time */}
      <div className="flex flex-col items-center w-16 flex-shrink-0">
        <span className="text-sm font-medium">{timeLabel}</span>
        <span className="text-xs text-muted-foreground">{timeUntil}</span>
      </div>

      {/* Thumbnail */}
      <div className="w-12 h-12 rounded overflow-hidden bg-muted flex-shrink-0">
        {post.imageUrl ? (
          <img
            src={post.imageUrl}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Image className="h-5 w-5 text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          {post.propertyCode && (
            <Badge variant="outline" className="text-xs text-purple-600">
              {post.propertyCode}
            </Badge>
          )}
          {/* Platform Icons */}
          <div className="flex items-center gap-1">
            {post.platforms.map((platform) => {
              const Icon = platformIcons[platform];
              return Icon ? (
                <Icon
                  key={platform}
                  className={cn('h-3 w-3', platformColors[platform])}
                />
              ) : null;
            })}
          </div>
        </div>
        <p className="text-sm text-muted-foreground line-clamp-2">
          {post.content}
        </p>
      </div>

      {/* Actions */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onEdit}>
            <Edit2 className="h-4 w-4 mr-2" /> Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onDelete} className="text-red-600">
            <Trash2 className="h-4 w-4 mr-2" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
