import { Loader2, RefreshCw, ImageIcon, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TemplatePreviewProps {
  imageUrl: string | null;
  isLoading: boolean;
  onRegenerate: () => void;
}

export default function TemplatePreview({
  imageUrl,
  isLoading,
  onRegenerate,
}: TemplatePreviewProps) {
  const handleDownload = () => {
    if (!imageUrl) return;

    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `branded-image-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="border rounded-lg overflow-hidden bg-muted/30">
      <div className="aspect-square relative">
        {isLoading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
            <p className="text-sm text-muted-foreground">Generating image...</p>
          </div>
        ) : imageUrl ? (
          <img
            src={imageUrl}
            alt="Generated preview"
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
            <ImageIcon className="h-12 w-12 mb-2 opacity-30" />
            <p className="text-sm">Select a template to preview</p>
          </div>
        )}
      </div>

      {imageUrl && !isLoading && (
        <div className="p-2 border-t flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onRegenerate}
            className="flex-1 gap-2"
          >
            <RefreshCw className="h-3 w-3" />
            Regenerate
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            className="gap-2"
          >
            <Download className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
}
