import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { IMEJIS_TEMPLATES } from '@/services/imejis/templates';
import { Check } from 'lucide-react';

interface TemplateSelectorProps {
  selectedTemplateId: string | null;
  onSelect: (templateId: string) => void;
}

export default function TemplateSelector({
  selectedTemplateId,
  onSelect,
}: TemplateSelectorProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {IMEJIS_TEMPLATES.map((template) => (
        <Card
          key={template.id}
          onClick={() => onSelect(template.id)}
          className={cn(
            "cursor-pointer transition-all hover:border-primary/40 overflow-hidden",
            selectedTemplateId === template.id && "border-primary ring-2 ring-primary/20"
          )}
        >
          <CardContent className="p-0">
            {/* Template Preview Image */}
            <div className="aspect-square bg-muted relative">
              {template.previewImage ? (
                <img
                  src={template.previewImage}
                  alt={template.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // If preview image fails to load, show fallback
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : null}

              {/* Fallback display */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground bg-primary/10">
                <span className="text-3xl font-bold text-primary">
                  {template.name.charAt(0)}
                </span>
                <span className="text-xs mt-1 text-primary/70">
                  {template.category}
                </span>
              </div>

              {/* Selection indicator */}
              {selectedTemplateId === template.id && (
                <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-lg">
                    <Check className="w-5 h-5 text-white" />
                  </div>
                </div>
              )}
            </div>

            {/* Template Name */}
            <div className="p-3 text-center border-t">
              <p className={cn(
                "text-sm font-medium truncate",
                selectedTemplateId === template.id && "text-primary"
              )}>
                {template.name}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {template.description}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
