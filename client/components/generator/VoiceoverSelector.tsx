import { Volume2 } from "lucide-react";

interface Voice {
  id: string;
  name: string;
  lang: string;
  gender?: string;
  isPremium?: boolean;
}

interface VoiceoverSelectorProps {
  voices: Voice[];
  value: string;
  onChange: (voiceId: string) => void;
}

export default function VoiceoverSelector({
  voices,
  value,
  onChange,
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
        {voices.map((voice) => (
          <button
            key={voice.id}
            onClick={() => onChange(voice.id)}
            className={`w-full p-4 rounded-lg border-2 transition-all text-left flex items-center gap-4 ${
              value === voice.id
                ? "border-accent-blue bg-accent-blue/10"
                : "border-border bg-card hover:border-accent-blue/50"
            }`}
          >
            <Volume2 className="w-5 h-5 text-accent-blue flex-shrink-0" />
            <div className="flex-1">
              <p className="font-semibold text-foreground">{voice.name}</p>
              <p className="text-sm text-muted-foreground">{voice.lang}</p>
            </div>
            {voice.gender && (
              <span className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground capitalize">
                {voice.gender}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
