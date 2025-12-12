import { useState } from "react";
import { Type } from "lucide-react";

interface CaptionStyle {
  id: string;
  name: string;
  description: string;
  preview: string;
}

const CAPTION_STYLES: CaptionStyle[] = [
  {
    id: "classic",
    name: "Classic",
    description: "Clean white text on semi-transparent background",
    preview: "Classic Style",
  },
  {
    id: "bold",
    name: "Bold",
    description: "Large, bold text with shadow effect",
    preview: "Bold Style",
  },
  {
    id: "colored",
    name: "Colored",
    description: "Color-coded by speaker",
    preview: "Colored Style",
  },
  {
    id: "minimal",
    name: "Minimal",
    description: "Subtle, minimalist text overlay",
    preview: "Minimal Style",
  },
];

interface CaptionsSelectorProps {
  selectedStyle: string;
  onSelectStyle: (id: string) => void;
  enableCaptions: boolean;
  onToggleCaptions: (enabled: boolean) => void;
}

export default function CaptionsSelector({
  selectedStyle,
  onSelectStyle,
  enableCaptions,
  onToggleCaptions,
}: CaptionsSelectorProps) {
  return (
    <div className="max-w-6xl mx-auto px-6 md:px-8 py-12 border-t border-border space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-foreground mb-2">
          4. Captions & Styling
        </h2>
        <p className="text-muted-foreground">
          Customize how captions appear in your video
        </p>
      </div>

      <div className="flex items-center gap-4 mb-6">
        <input
          type="checkbox"
          id="captions-toggle"
          checked={enableCaptions}
          onChange={(e) => onToggleCaptions(e.target.checked)}
          className="w-5 h-5 rounded cursor-pointer"
        />
        <label htmlFor="captions-toggle" className="text-foreground font-semibold cursor-pointer">
          Enable Captions
        </label>
      </div>

      {enableCaptions && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {CAPTION_STYLES.map((style) => (
            <button
              key={style.id}
              onClick={() => onSelectStyle(style.id)}
              className={`p-6 rounded-lg border-2 transition-all text-left ${
                selectedStyle === style.id
                  ? "border-accent-blue bg-accent-blue/10"
                  : "border-border bg-card hover:border-accent-blue/50"
              }`}
            >
              <div className="flex items-start gap-4">
                <Type className="w-6 h-6 text-accent-blue mt-1 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">{style.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {style.description}
                  </p>
                  <div className="mt-3 px-3 py-2 bg-muted rounded text-sm text-foreground font-medium">
                    {style.preview}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
