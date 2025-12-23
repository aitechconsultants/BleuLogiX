import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Play, Check } from "lucide-react";

interface VoiceCardProps {
  id: string;
  name: string;
  gender: string;
  language: string;
  isSelected: boolean;
  tier: "free" | "pro" | "enterprise";
  onSelect: (id: string) => void;
  onPlay: (id: string) => void;
  tone?: string;
  style?: string;
  useCase?: string;
}

export default function VoiceCard({
  id,
  name,
  gender,
  language,
  isSelected,
  tier,
  onSelect,
  onPlay,
  tone,
  style,
  useCase,
}: VoiceCardProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <div
      className={`rounded-lg border-2 p-3 transition-all duration-300 ${
        isSelected
          ? "border-accent-blue bg-accent-blue/10"
          : "border-border hover:border-accent-blue/50 bg-card"
      }`}
    >
      {/* Voice Name and Gender */}
      <div className="flex items-start justify-between mb-2">
        <div>
          <h4 className="font-semibold text-foreground text-sm">{name}</h4>
          <p className="text-xs text-muted-foreground">{gender}</p>
        </div>
        {isSelected && (
          <Check className="w-4 h-4 text-accent-blue flex-shrink-0" />
        )}
      </div>

      {/* Voice Summary */}
      {(tone || style || useCase) && (
        <div className="space-y-1 mb-2">
          {tone && (
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Tone:</span> {tone}
            </p>
          )}
          {style && (
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Style:</span>{" "}
              {style}
            </p>
          )}
          {useCase && (
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Best for:</span>{" "}
              {useCase}
            </p>
          )}
        </div>
      )}

      {/* Badge and Actions */}
      <div className="flex items-center gap-2">
        {tier !== "free" && (
          <Badge
            variant="outline"
            className={`text-xs flex-shrink-0 ${
              tier === "pro"
                ? "bg-accent-blue/20 text-accent-blue border-accent-blue/50"
                : "bg-highlight-blue/20 text-highlight-blue border-highlight-blue/50"
            }`}
          >
            {tier.charAt(0).toUpperCase() + tier.slice(1)}
          </Badge>
        )}

        {/* Preview Button */}
        <button
          onClick={() => {
            setIsPlaying(!isPlaying);
            onPlay(id);
          }}
          className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded bg-muted/50 hover:bg-muted transition-colors text-xs"
          title="Play voice preview"
        >
          <Play className={`w-3 h-3 ${isPlaying ? "animate-pulse" : ""}`} />
          <span className="hidden sm:inline">Preview</span>
        </button>

        {/* Select Button */}
        <button
          onClick={() => onSelect(id)}
          className={`flex-1 py-1.5 px-2 rounded font-medium text-xs transition-colors ${
            isSelected
              ? "bg-accent-blue text-black"
              : "bg-accent-blue/20 text-accent-blue hover:bg-accent-blue/30"
          }`}
          title="Select this voice"
        >
          {isSelected ? "✓ Selected" : "Select"}
        </button>
      </div>
    </div>
  );
}
