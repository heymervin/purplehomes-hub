import { useState, useMemo, useEffect } from 'react';
import {
  ChevronLeft, ChevronRight, Star, Plus, Trash2, ExternalLink,
  GripVertical, Loader2, X, AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useHeicImages } from '@/hooks/useHeicImage';

interface PropertyImageGalleryProps {
  images: string[];
  heroImage: string;
  onHeroChange: (imageUrl: string) => void;
  onImagesChange: (images: string[]) => void;
  editable?: boolean;
}

export function PropertyImageGallery({
  images,
  heroImage,
  onHeroChange,
  onImagesChange,
  editable = true,
}: PropertyImageGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [showAddInput, setShowAddInput] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Detect problematic URLs (GHL document URLs that won't load as images)
  const isProblematicUrl = (url: string): boolean => {
    if (!url) return false;
    return url.includes('services.leadconnectorhq.com/documents/download') ||
           url.includes('/documents/download/');
  };

  // Combine hero + images, ensure hero is first
  const allOriginalImages = useMemo(
    () => [heroImage, ...images.filter(img => img !== heroImage)].filter(Boolean),
    [heroImage, images]
  );

  // Convert HEIC images to displayable format
  const { images: allImages, isConverting: isConvertingHeic } = useHeicImages(allOriginalImages);

  // Preload all images for instant navigation
  useEffect(() => {
    allImages.forEach((src) => {
      if (src && src !== '/placeholder.svg') {
        const img = new Image();
        img.src = src;
      }
    });
  }, [allImages]);

  const currentImage = allImages[selectedIndex] || '/placeholder.svg';
  const currentOriginalImage = allOriginalImages[selectedIndex] || '';

  // Check if current image is the hero (use original URL for comparison)
  const isCurrentHero = currentOriginalImage === heroImage;

  const goToPrevious = () => {
    setSelectedIndex(prev => (prev > 0 ? prev - 1 : allImages.length - 1));
  };

  const goToNext = () => {
    setSelectedIndex(prev => (prev < allImages.length - 1 ? prev + 1 : 0));
  };

  const setAsHero = (originalImageUrl: string) => {
    // Demote old hero into regular images, remove new hero from regular images
    const updatedImages = [
      ...images.filter(img => img !== originalImageUrl),
      ...(heroImage && heroImage !== '/placeholder.svg' ? [heroImage] : []),
    ];
    onImagesChange(updatedImages);
    onHeroChange(originalImageUrl);
    toast.success('Hero image updated');
  };

  const removeImage = (originalImageUrl: string) => {
    if (originalImageUrl === heroImage) {
      toast.error('Cannot remove hero image. Set another image as hero first.');
      return;
    }
    onImagesChange(images.filter(img => img !== originalImageUrl));
    if (selectedIndex >= allImages.length - 1) {
      setSelectedIndex(Math.max(0, selectedIndex - 1));
    }
    toast.success('Image removed');
  };

  const addImage = () => {
    if (!newImageUrl.trim()) return;
    
    try {
      new URL(newImageUrl);
      onImagesChange([...images, newImageUrl.trim()]);
      setNewImageUrl('');
      setShowAddInput(false);
      toast.success('Image added');
    } catch {
      toast.error('Please enter a valid URL');
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent, _index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      return;
    }

    // Use original images for reordering
    const newAllImages = [...allOriginalImages];
    const [draggedItem] = newAllImages.splice(draggedIndex, 1);
    newAllImages.splice(dropIndex, 0, draggedItem);

    // First image becomes hero
    onHeroChange(newAllImages[0]);
    onImagesChange(newAllImages.slice(1));
    
    // Adjust selected index if needed
    if (selectedIndex === draggedIndex) {
      setSelectedIndex(dropIndex);
    } else if (draggedIndex < selectedIndex && dropIndex >= selectedIndex) {
      setSelectedIndex(selectedIndex - 1);
    } else if (draggedIndex > selectedIndex && dropIndex <= selectedIndex) {
      setSelectedIndex(selectedIndex + 1);
    }

    setDraggedIndex(null);
    toast.success('Images reordered');
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  return (
    <div className="space-y-4">
      {/* Main Image Display */}
      <div className="relative aspect-video rounded-lg overflow-hidden bg-muted group">
        <img
          src={currentImage}
          alt={`Property image ${selectedIndex + 1}`}
          className="w-full h-full object-cover"
          loading="eager"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/placeholder.svg';
          }}
        />

        {/* Hero Badge - Only show in editable mode */}
        {editable && isCurrentHero && (
          <div className="absolute top-3 left-3">
            <Badge className="bg-yellow-500 text-yellow-950 gap-1">
              <Star className="h-3 w-3 fill-current" />
              Hero Image
            </Badge>
          </div>
        )}

        {/* HEIC Conversion Loading */}
        {isConvertingHeic && (
          <div className="absolute top-3 right-3">
            <Badge variant="secondary" className="gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              Converting...
            </Badge>
          </div>
        )}

        {/* Navigation Arrows */}
        {allImages.length > 1 && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/90 backdrop-blur-sm hover:bg-background shadow-lg z-10 transition-all"
              onClick={goToPrevious}
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/90 backdrop-blur-sm hover:bg-background shadow-lg z-10 transition-all"
              onClick={goToNext}
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          </>
        )}

        {/* Image Actions */}
        {editable && (
          <div className="absolute bottom-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            {!isCurrentHero && (
              <Button
                variant="secondary"
                size="sm"
                className="bg-background/80 backdrop-blur-sm"
                onClick={() => setAsHero(currentOriginalImage)}
              >
                <Star className="h-4 w-4 mr-1" />
                Set as Hero
              </Button>
            )}
            {!isCurrentHero && allImages.length > 1 && (
              <Button
                variant="destructive"
                size="sm"
                className="bg-destructive/80 backdrop-blur-sm"
                onClick={() => removeImage(currentOriginalImage)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="secondary"
              size="sm"
              className="bg-background/80 backdrop-blur-sm"
              onClick={() => window.open(currentOriginalImage, '_blank')}
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Image Counter */}
        <div className="absolute bottom-3 left-3 bg-background/80 backdrop-blur-sm rounded-md px-2 py-1 text-xs">
          {selectedIndex + 1} / {allImages.length}
        </div>
      </div>

      {/* Thumbnail Navigation with URLs - Only show in editable mode */}
      {editable && (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {allImages.map((img, index) => {
            const originalImg = allOriginalImages[index] || '';
            const isHero = originalImg === heroImage;
            const hasIssue = isProblematicUrl(originalImg);

            return (
              <div key={`${originalImg}-${index}`} className="flex flex-col gap-1.5 flex-shrink-0">
                {/* Thumbnail */}
                <button
                  draggable={editable}
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  onClick={() => setSelectedIndex(index)}
                  className={cn(
                    "relative w-20 h-20 rounded-md overflow-hidden border-2 transition-all duration-200 group/thumb",
                    selectedIndex === index
                      ? "border-primary ring-2 ring-primary/30"
                      : hasIssue
                        ? "border-red-500"
                        : "border-border hover:border-muted-foreground/50",
                    draggedIndex === index && "opacity-50 scale-95",
                    "cursor-grab active:cursor-grabbing"
                  )}
                >
                  <img
                    src={img}
                    alt={`Thumbnail ${index + 1}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/placeholder.svg';
                    }}
                  />
                  {isHero && (
                    <div className="absolute inset-0 bg-yellow-500/20 flex items-center justify-center">
                      <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                    </div>
                  )}
                  {hasIssue && (
                    <div className="absolute top-1 right-1">
                      <AlertTriangle className="h-4 w-4 text-red-500 drop-shadow-md" />
                    </div>
                  )}
                  {/* Drag handle indicator */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center">
                    <GripVertical className="h-4 w-4 text-white" />
                  </div>
                </button>

                {/* URL Input */}
                <Input
                  value={originalImg}
                  onChange={(e) => {
                    const newUrl = e.target.value;
                    if (isHero) {
                      onHeroChange(newUrl);
                    } else {
                      const actualIndex = images.indexOf(originalImg);
                      if (actualIndex !== -1) {
                        const newImages = [...images];
                        newImages[actualIndex] = newUrl;
                        onImagesChange(newImages);
                      }
                    }
                  }}
                  className={cn(
                    "w-20 text-[9px] font-mono h-7 px-1",
                    hasIssue && "border-red-500 bg-red-50 dark:bg-red-950/20"
                  )}
                  placeholder="URL..."
                  title={originalImg}
                />

                {/* Actions */}
                <div className="flex gap-0.5 justify-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => window.open(originalImg, '_blank')}
                    title="Open URL"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                  {!isHero && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-100"
                      onClick={() => removeImage(originalImg)}
                      title="Remove"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>

                {/* Label */}
                <span className="text-[9px] text-muted-foreground text-center">
                  {isHero ? '⭐ Hero' : `#${index + 1}`}
                </span>
              </div>
            );
          })}

          {/* Add Image Button */}
          <button
            onClick={() => setShowAddInput(true)}
            className="w-20 h-20 rounded-md border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 flex flex-col items-center justify-center transition-colors gap-1 flex-shrink-0"
          >
            <Plus className="h-5 w-5 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground">+ URL</span>
          </button>
        </div>
      )}

      {/* Drag hint */}
      {editable && allImages.length > 1 && (
        <p className="text-xs text-muted-foreground text-center">
          Drag thumbnails to reorder. First image becomes hero.
        </p>
      )}

      {/* Add Image Input */}
      {showAddInput && (
        <div className="flex gap-2 animate-fade-in">
          <Input
            placeholder="Paste image URL..."
            value={newImageUrl}
            onChange={(e) => setNewImageUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addImage()}
            className="flex-1"
          />
          <Button onClick={addImage} size="sm">
            Add
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setShowAddInput(false);
              setNewImageUrl('');
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

    </div>
  );
}