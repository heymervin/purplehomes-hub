import React from 'react';
import { Check, Lock, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { TemplateProfile } from '@/lib/templates/types';

interface TemplateCardProps {
  template: TemplateProfile;
  isSelected: boolean;
  isAvailable: boolean;
  unavailableReason: string | null;
  onSelect: () => void;
}

export function TemplateCard({
  template,
  isSelected,
  isAvailable,
  unavailableReason,
  onSelect,
}: TemplateCardProps) {
  const content = (
    <Card
      onClick={isAvailable ? onSelect : undefined}
      className={cn(
        "relative overflow-hidden transition-all cursor-pointer",
        isSelected && "ring-2 ring-purple-600 border-purple-600",
        isAvailable && !isSelected && "hover:border-purple-400 hover:shadow-md",
        !isAvailable && "opacity-60 cursor-not-allowed"
      )}
    >
      <CardContent className="p-0">
        {/* Preview Image */}
        <div className="relative aspect-square bg-muted">
          {template.previewImage ? (
            <img
              src={template.previewImage}
              alt={template.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                // Fallback to icon if image fails to load
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const parent = target.parentElement;
                if (parent) {
                  const fallback = document.createElement('div');
                  fallback.className = 'w-full h-full flex items-center justify-center';
                  fallback.innerHTML = `<span class="text-4xl">${template.icon}</span>`;
                  parent.appendChild(fallback);
                }
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-4xl">{template.icon}</span>
            </div>
          )}

          {/* Selected Overlay */}
          {isSelected && (
            <div className="absolute inset-0 bg-purple-600/20 flex items-center justify-center">
              <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center">
                <Check className="h-6 w-6 text-white" />
              </div>
            </div>
          )}

          {/* Unavailable Overlay */}
          {!isAvailable && (
            <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
              <Lock className="h-6 w-6 text-muted-foreground" />
            </div>
          )}

          {/* Input Badge */}
          <div className="absolute top-2 right-2">
            {template.id === 'success-story' ? (
              <Badge className="bg-amber-500 text-white text-xs">
                ✏️ Manual Only
              </Badge>
            ) : template.userInputCount === 0 ? (
              <Badge className="bg-green-500 text-white text-xs">
                <Sparkles className="h-3 w-3 mr-1" />
                Auto-fill
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-xs">
                {template.userInputCount} input{template.userInputCount > 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="p-3">
          <div className="flex items-center gap-2">
            <span>{template.icon}</span>
            <h4 className="font-medium text-sm">{template.name}</h4>
          </div>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {template.description}
          </p>
        </div>
      </CardContent>
    </Card>
  );

  // Wrap in tooltip if unavailable
  if (!isAvailable && unavailableReason) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent>
            <p>{unavailableReason}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return content;
}
