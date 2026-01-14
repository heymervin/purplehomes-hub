import React from 'react';
import { Check, ImageIcon, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Property } from '@/types';

interface SupportingImagePickerProps {
  property: Property;
  selectedImages: string[];
  onSelectionChange: (images: string[]) => void;
  maxImages?: number;
  className?: string;
}

/**
 * SupportingImagePicker - Allows users to select which property images
 * to use as supporting images in templates (like Open House)
 */
export function SupportingImagePicker({
  property,
  selectedImages,
  onSelectionChange,
  maxImages = 3,
  className,
}: SupportingImagePickerProps) {
  // Get all available images from property
  const availableImages: string[] = [];

  // Add hero image first if available
  if (property.heroImage) {
    availableImages.push(property.heroImage);
  }

  // Add other images
  if (property.images && property.images.length > 0) {
    property.images.forEach(img => {
      if (!availableImages.includes(img)) {
        availableImages.push(img);
      }
    });
  }

  // Toggle image selection
  const handleToggleImage = (imageUrl: string) => {
    const isSelected = selectedImages.includes(imageUrl);

    if (isSelected) {
      // Remove from selection
      onSelectionChange(selectedImages.filter(img => img !== imageUrl));
    } else {
      // Add to selection (if under max)
      if (selectedImages.length < maxImages) {
        onSelectionChange([...selectedImages, imageUrl]);
      }
    }
  };

  // Get selection order (1, 2, 3...)
  const getSelectionOrder = (imageUrl: string): number | null => {
    const index = selectedImages.indexOf(imageUrl);
    return index >= 0 ? index + 1 : null;
  };

  // Clear all selections
  const handleClearAll = () => {
    onSelectionChange([]);
  };

  // Auto-select first N images
  const handleAutoSelect = () => {
    const autoSelected = availableImages.slice(0, maxImages);
    onSelectionChange(autoSelected);
  };

  if (availableImages.length === 0) {
    return (
      <div className={cn("p-4 rounded-lg border-2 border-dashed border-muted-foreground/30 text-center", className)}>
        <ImageIcon className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">
          No images available for this property
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ImageIcon className="h-4 w-4 text-purple-500" />
          <span className="text-sm font-medium">Supporting Images</span>
          <Badge variant="secondary" className="text-xs">
            {selectedImages.length}/{maxImages} selected
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          {selectedImages.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearAll}
              className="h-7 text-xs text-muted-foreground"
            >
              <X className="h-3 w-3 mr-1" />
              Clear
            </Button>
          )}
          {selectedImages.length < maxImages && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleAutoSelect}
              className="h-7 text-xs"
            >
              Auto-select
            </Button>
          )}
        </div>
      </div>

      {/* Help text */}
      <p className="text-xs text-muted-foreground">
        Click images to select them. Order matters - first selected will be Image 1, etc.
      </p>

      {/* Image Grid */}
      <div className="grid grid-cols-3 gap-2">
        {availableImages.map((imageUrl, index) => {
          const selectionOrder = getSelectionOrder(imageUrl);
          const isSelected = selectionOrder !== null;
          const isDisabled = !isSelected && selectedImages.length >= maxImages;

          return (
            <button
              key={`${imageUrl}-${index}`}
              type="button"
              onClick={() => handleToggleImage(imageUrl)}
              disabled={isDisabled}
              className={cn(
                "relative aspect-square rounded-lg overflow-hidden border-2 transition-all",
                "focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2",
                isSelected
                  ? "border-purple-500 ring-2 ring-purple-500/20"
                  : "border-transparent hover:border-muted-foreground/50",
                isDisabled && "opacity-50 cursor-not-allowed"
              )}
            >
              <img
                src={imageUrl}
                alt={`Property image ${index + 1}`}
                className="w-full h-full object-cover"
              />

              {/* Selection overlay */}
              {isSelected && (
                <div className="absolute inset-0 bg-purple-500/20 flex items-center justify-center">
                  <div className="bg-purple-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm shadow-lg">
                    {selectionOrder}
                  </div>
                </div>
              )}

              {/* Checkmark badge */}
              {isSelected && (
                <div className="absolute top-1 right-1 bg-purple-600 text-white rounded-full p-0.5">
                  <Check className="h-3 w-3" />
                </div>
              )}

              {/* Disabled overlay */}
              {isDisabled && (
                <div className="absolute inset-0 bg-background/60" />
              )}
            </button>
          );
        })}
      </div>

      {/* Selected order preview */}
      {selectedImages.length > 0 && (
        <div className="flex items-center gap-2 p-2 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
          <span className="text-xs text-purple-700 dark:text-purple-300 font-medium">
            Selection order:
          </span>
          <div className="flex gap-1">
            {selectedImages.map((img, idx) => (
              <div
                key={img}
                className="w-8 h-8 rounded overflow-hidden border border-purple-300"
              >
                <img src={img} alt={`Selected ${idx + 1}`} className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
