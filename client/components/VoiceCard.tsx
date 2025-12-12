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
}: VoiceCardProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  const tierColors = {
    free: "bg-muted",
    pro: "bg-accent-blue/20 text-accent-blue border-accent-blue/50",
    enterprise: "bg-highlight-blue/20 text-highlight-blue border-highlight-blue/50",
  };

  return (
    <div
      className={`rounded-lg border-2 p-4 transition-all duration-300 ${
        isSelected
          ? "border-accent-blue bg-accent-blue/10"
          : "border-border hover:border-accent-blue/50 bg-card"
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h4 className="font-semibold text-foreground">{name}</h4>
          <p className="text-xs text-muted-foreground">
            {gender} • {language}
          </p>
        </div>
        {isSelected && <Check className="w-5 h-5 text-accent-blue" />}
      </div>

      {/* Badge */}
      {tier !== "free" && (
        <Badge variant="outline" className={`mb-3 text-xs ${tierColors[tier]}`}>
          {tier.charAt(0).toUpperCase() + tier.slice(1)}
        </Badge>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => {
            setIsPlaying(!isPlaying);
            onPlay(id);
          }}
          className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-sm"
        >
          <Play className={`w-4 h-4 ${isPlaying ? "animate-pulse" : ""}`} />
          Preview
        </button>
        <button
          onClick={() => onSelect(id)}
          className={`flex-1 py-2 px-3 rounded-lg font-medium text-sm transition-colors ${
            isSelected
              ? "bg-accent-blue text-black"
              : "bg-accent-blue/20 text-accent-blue hover:bg-accent-blue/30"
          }`}
        >
          Select
        </button>
      </div>
    </div>
  );
}
