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
      className={`rounded-lg border-2 p-4 transition-all duration-300 flex items-center gap-4 w-full ${
        isSelected
          ? "border-accent-blue bg-accent-blue/10"
          : "border-border hover:border-accent-blue/50 bg-card"
      }`}
    >
      {/* Voice Info Section */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-2">
          <h4 className="font-semibold text-foreground">{name}</h4>
          <span className="text-xs text-muted-foreground">
            {gender} • {language}
          </span>
          {tier !== "free" && (
            <Badge
              variant="outline"
              className={`text-xs ${
                tier === "pro"
                  ? "bg-accent-blue/20 text-accent-blue border-accent-blue/50"
                  : "bg-highlight-blue/20 text-highlight-blue border-highlight-blue/50"
              }`}
            >
              {tier.charAt(0).toUpperCase() + tier.slice(1)}
            </Badge>
          )}
          {isSelected && (
            <Check className="w-4 h-4 text-accent-blue ml-auto flex-shrink-0" />
          )}
        </div>

        {/* Voice Summary */}
        {(tone || style || useCase) && (
          <div className="space-y-1">
            {tone && (
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Tone:</span>{" "}
                {tone}
              </p>
            )}
            {style && (
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Style:</span>{" "}
                {style}
              </p>
            )}
            {useCase && (
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Best for:</span>{" "}
                {useCase}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 flex-shrink-0">
        <button
          onClick={() => {
            setIsPlaying(!isPlaying);
            onPlay(id);
          }}
          className="flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-sm font-medium"
          title="Play voice preview"
        >
          <Play className={`w-4 h-4 ${isPlaying ? "animate-pulse" : ""}`} />
          Preview
        </button>

        <button
          onClick={() => onSelect(id)}
          className={`py-2 px-6 rounded-lg font-medium text-sm transition-colors ${
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
