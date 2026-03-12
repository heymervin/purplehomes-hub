import { cn } from '@/lib/utils';
import type { CaptionTone } from '../types';
import { TONE_PRESETS } from '../types';

interface ToneSelectorProps {
  selectedTone: CaptionTone;
  onSelect: (tone: CaptionTone) => void;
}

export default function ToneSelector({ selectedTone, onSelect }: ToneSelectorProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {TONE_PRESETS.map((preset) => (
        <button
          key={preset.id}
          onClick={() => onSelect(preset.id)}
          title={preset.description}
          className={cn(
            "px-4 py-2 rounded-full text-sm font-medium transition-all",
            selectedTone === preset.id
              ? "bg-primary text-primary-foreground shadow-md"
              : "bg-muted hover:bg-muted/80 text-foreground"
          )}
        >
          {preset.label}
        </button>
      ))}
    </div>
  );
}
