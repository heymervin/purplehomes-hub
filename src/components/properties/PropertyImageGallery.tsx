import { useState, useMemo } from 'react';
import {
  ChevronLeft, ChevronRight, Star, Plus, Trash2, ExternalLink,
  GripVertical, Upload, Loader2, X
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
  const [isUploading, setIsUploading] = useState(false);

  // Combine hero + images, ensure hero is first
  const allOriginalImages = useMemo(
    () => [heroImage, ...images.filter(img => img !== heroImage)].filter(Boolean),
    [heroImage, images]
  );

  // Convert HEIC images to displayable format
  const { images: allImages, isConverting: isConvertingHeic } = useHeicImages(allOriginalImages);

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

  // File upload handler (for GHL Media integration)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    setIsUploading(true);
    
    try {
      // Convert to base64 for preview (in production, would upload to GHL Media)
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        onImagesChange([...images, base64]);
        toast.success('Image uploaded');
        setIsUploading(false);
      };
      reader.onerror = () => {
        toast.error('Failed to read file');
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast.error('Failed to upload image');
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Main Image Display */}
      <div className="relative aspect-video rounded-lg overflow-hidden bg-muted group">
        <img
          src={currentImage}
          alt={`Property image ${selectedIndex + 1}`}
          className="w-full h-full object-cover transition-transform duration-300"
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

      {/* Thumbnail Navigation with Drag & Drop - Only show in editable mode */}
      {editable && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {allImages.map((img, index) => {
            const originalImg = allOriginalImages[index] || '';
            const isHero = originalImg === heroImage;

            return (
              <button
                key={`${originalImg}-${index}`}
                draggable={editable}
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                onClick={() => setSelectedIndex(index)}
                className={cn(
                  "relative flex-shrink-0 w-16 h-16 rounded-md overflow-hidden border-2 transition-all duration-200 group/thumb",
                  selectedIndex === index
                    ? "border-primary ring-2 ring-primary/30"
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
                {/* Drag handle indicator */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center">
                  <GripVertical className="h-4 w-4 text-white" />
                </div>
              </button>
            );
          })}

          {/* Add Image Buttons */}
          {/* URL Input Button */}
          <button
            onClick={() => setShowAddInput(true)}
            className="flex-shrink-0 w-16 h-16 rounded-md border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 flex flex-col items-center justify-center transition-colors gap-1"
          >
            <Plus className="h-4 w-4 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground">URL</span>
          </button>

          {/* File Upload Button */}
          <label className="flex-shrink-0 w-16 h-16 rounded-md border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 flex flex-col items-center justify-center transition-colors cursor-pointer gap-1">
            {isUploading ? (
              <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
            ) : (
              <>
                <Upload className="h-4 w-4 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground">File</span>
              </>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
              disabled={isUploading}
            />
          </label>
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