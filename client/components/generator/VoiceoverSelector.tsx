import { useState } from "react";
import { Volume2 } from "lucide-react";

interface Voice {
  id: string;
  name: string;
  language: string;
  gender: "male" | "female" | "neutral";
}

const VOICES: Voice[] = [
  { id: "voice-1", name: "Alex", language: "English (US)", gender: "male" },
  { id: "voice-2", name: "Emma", language: "English (US)", gender: "female" },
  { id: "voice-3", name: "Oliver", language: "English (UK)", gender: "male" },
  { id: "voice-4", name: "Sophia", language: "English (UK)", gender: "female" },
  { id: "voice-5", name: "Lucas", language: "Spanish", gender: "male" },
  { id: "voice-6", name: "Isabella", language: "Spanish", gender: "female" },
];

interface VoiceoverSelectorProps {
  selectedVoice: string;
  onSelectVoice: (id: string) => void;
}

export default function VoiceoverSelector({
  selectedVoice,
  onSelectVoice,
}: VoiceoverSelectorProps) {
  return (
    <div className="max-w-6xl mx-auto px-6 md:px-8 py-12 border-t border-border space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-foreground mb-2">
          3. Choose Voiceover
        </h2>
        <p className="text-muted-foreground">
          Select a professional voice for your video
        </p>
      </div>

      <div className="space-y-3">
        {VOICES.map((voice) => (
          <button
            key={voice.id}
            onClick={() => onSelectVoice(voice.id)}
            className={`w-full p-4 rounded-lg border-2 transition-all text-left flex items-center gap-4 ${
              selectedVoice === voice.id
                ? "border-accent-blue bg-accent-blue/10"
                : "border-border bg-card hover:border-accent-blue/50"
            }`}
          >
            <Volume2 className="w-5 h-5 text-accent-blue flex-shrink-0" />
            <div className="flex-1">
              <p className="font-semibold text-foreground">{voice.name}</p>
              <p className="text-sm text-muted-foreground">{voice.language}</p>
            </div>
            <span className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground capitalize">
              {voice.gender}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
