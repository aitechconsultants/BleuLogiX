import { useState } from "react";
import { Play, Pause, Volume2, VolumeX } from "lucide-react";

interface PreviewPlayerProps {
  title: string;
  duration: number;
}

export default function PreviewPlayer({ title, duration }: PreviewPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);

  return (
    <div className="w-full space-y-4">
      {/* Video Container */}
      <div className="relative aspect-video rounded-lg overflow-hidden bg-black border border-border glow-blue">
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-b from-black/20 to-black/40">
          <div className="flex flex-col items-center gap-4">
            <div className="relative w-20 h-20">
              <div className="absolute inset-0 rounded-full border-2 border-accent-blue/30 animate-pulse" />
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="absolute inset-0 flex items-center justify-center rounded-full bg-accent-blue/20 hover:bg-accent-blue/30 transition-colors"
              >
                {isPlaying ? (
                  <Pause className="w-8 h-8 text-accent-blue" />
                ) : (
                  <Play className="w-8 h-8 text-accent-blue ml-1" />
                )}
              </button>
            </div>
            <p className="text-sm text-accent-blue font-medium">
              {isPlaying ? "Playing..." : "Preview"}
            </p>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="space-y-3">
        {/* Progress Bar */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground w-8">
            {Math.floor((progress / 100) * duration)}s
          </span>
          <input
            type="range"
            min="0"
            max="100"
            value={progress}
            onChange={(e) => setProgress(Number(e.target.value))}
            className="flex-1 h-2 bg-muted rounded-full cursor-pointer accent-accent-blue"
          />
          <span className="text-xs text-muted-foreground w-8 text-right">
            {duration}s
          </span>
        </div>

        {/* Control Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-2 rounded-lg bg-accent-blue/20 text-accent-blue hover:bg-accent-blue/30 transition-colors"
          >
            {isPlaying ? (
              <Pause className="w-5 h-5" />
            ) : (
              <Play className="w-5 h-5" />
            )}
          </button>
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="p-2 rounded-lg bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
          >
            {isMuted ? (
              <VolumeX className="w-5 h-5" />
            ) : (
              <Volume2 className="w-5 h-5" />
            )}
          </button>
          <span className="flex-1 text-sm text-muted-foreground text-right">
            {title}
          </span>
        </div>
      </div>
    </div>
  );
}
