import { useState, useEffect, useRef } from "react";
import { Play, Pause, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { cleanScriptForVoiceover } from "../lib/scriptCleaner";

export interface MediaItem {
  id: string;
  name: string;
  url?: string;
  duration?: number;
  included?: boolean;
}

interface MediaTimelinePreviewProps {
  items: MediaItem[];
  script: string;
  captionsEnabled: boolean;
  captionStyle: string;
  captionColor: string;
  resolution: "vertical" | "square" | "horizontal";
  selectedVoiceId?: string;
  onCaptionsToggle: (enabled: boolean) => void;
  onCaptionStyleChange: (style: string) => void;
  onCaptionColorChange: (color: string) => void;
  onScriptChange: (script: string) => void;
  onVoiceoverGenerated?: (audioUrl: string, generatedAt: string) => void;
}

const captionStyles = [
  { id: "clean", name: "Clean", description: "Minimal text" },
  { id: "outline", name: "Bold Outline", description: "High contrast" },
  { id: "gradient", name: "Gradient", description: "Modern look" },
  { id: "emoji", name: "Emoji Enhanced", description: "Visual flair" },
];

const captionColors = [
  { id: "white", name: "White", hex: "#ffffff" },
  { id: "yellow", name: "Yellow", hex: "#fbbf24" },
  { id: "cyan", name: "Cyan", hex: "#06b6d4" },
  { id: "lime", name: "Lime", hex: "#84cc16" },
];

export default function MediaTimelinePreview({
  items,
  script,
  captionsEnabled,
  captionStyle,
  captionColor,
  resolution,
  selectedVoiceId,
  onCaptionsToggle,
  onCaptionStyleChange,
  onCaptionColorChange,
  onScriptChange,
  onVoiceoverGenerated,
}: MediaTimelinePreviewProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [previewTime, setPreviewTime] = useState(0);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const includedItems = items.filter((item) => item.included !== false);
  const totalDuration = includedItems.reduce(
    (sum, item) => sum + (item.duration || 5),
    0,
  );

  // Generate audio from selected voice and script
  useEffect(() => {
    const generateAudio = async () => {
      if (!script.trim() || !selectedVoiceId) {
        setAudioUrl(null);
        return;
      }

      setIsGeneratingAudio(true);
      try {
        const cleanedScript = cleanScriptForVoiceover(script);

        // If the script is empty after cleaning, don't generate audio
        if (!cleanedScript.trim()) {
          setAudioUrl(null);
          setIsGeneratingAudio(false);
          return;
        }

        const params = new URLSearchParams({
          text: cleanedScript,
        });
        const response = await fetch(
          `/api/voices/${selectedVoiceId}/preview?${params}`,
        );

        if (!response.ok) {
          console.error("Failed to generate audio:", response.status);
          setAudioUrl(null);
          return;
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        onVoiceoverGenerated?.(url, new Date().toISOString());
      } catch (error) {
        console.error("Error generating audio:", error);
        setAudioUrl(null);
      } finally {
        setIsGeneratingAudio(false);
      }
    };

    generateAudio();

    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [script, selectedVoiceId]);

  // Sync audio playback with video
  useEffect(() => {
    if (!audioRef.current) return;

    if (isPlaying && audioUrl && !isMuted) {
      audioRef.current.play().catch((error) => {
        console.error("Error playing audio:", error);
      });
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying, audioUrl, isMuted]);

  // Auto-advance through media during playback
  useEffect(() => {
    if (!isPlaying) return;

    const timer = setInterval(() => {
      setPreviewTime((prev) => {
        const next = prev + 0.1;
        if (next >= totalDuration) {
          setIsPlaying(false);
          if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
          }
          return 0;
        }

        // Calculate which media item should be displayed
        let accumulated = 0;
        for (let i = 0; i < includedItems.length; i++) {
          const itemDuration = includedItems[i].duration || 5;
          if (next < accumulated + itemDuration) {
            setCurrentMediaIndex(i);
            break;
          }
          accumulated += itemDuration;
        }

        return next;
      });
    }, 100);

    return () => clearInterval(timer);
  }, [isPlaying, totalDuration, includedItems]);

  const getAspectRatioClass = () => {
    switch (resolution) {
      case "vertical":
        return "aspect-[9/16]";
      case "square":
        return "aspect-square";
      case "horizontal":
        return "aspect-video";
      default:
        return "aspect-video";
    }
  };

  const getResolutionDimensions = () => {
    switch (resolution) {
      case "vertical":
        return "1080×1920";
      case "square":
        return "1080×1080";
      case "horizontal":
        return "1920×1080";
      default:
        return "1920×1080";
    }
  };

  // Get caption style preview classes
  const getCaptionClasses = () => {
    let baseClass = "text-white font-bold text-center px-4 py-2";

    switch (captionStyle) {
      case "outline":
        return `${baseClass} text-stroke-2 drop-shadow-lg`;
      case "gradient":
        return `${baseClass} bg-gradient-to-r from-accent-blue to-highlight-blue text-transparent bg-clip-text`;
      case "emoji":
        return `${baseClass} text-lg`;
      default:
        return baseClass;
    }
  };

  const getCaptionColor = () => {
    const colorMatch = captionColors.find((c) => c.id === captionColor);
    return colorMatch?.hex || "#ffffff";
  };

  return (
    <div className="space-y-6">
      {/* Hidden audio element for voiceover playback */}
      {audioUrl && <audio ref={audioRef} src={audioUrl} />}

      <div>
        <h3 className="font-display text-2xl font-bold text-foreground mb-6">
          Preview
        </h3>

        {/* Video Preview Container */}
        <div
          className={`relative w-full ${getAspectRatioClass()} rounded-lg overflow-hidden bg-black border-2 border-border group`}
        >
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-b from-black/20 to-black/40 relative">
            {includedItems.length === 0 ? (
              <div className="text-center">
                <p className="text-muted-foreground text-sm">
                  No media selected
                </p>
              </div>
            ) : (
              <>
                {/* Media sequence preview */}
                <div className="w-full h-full bg-black/60 flex items-center justify-center relative overflow-hidden">
                  {includedItems.map((item, idx) => (
                    <div
                      key={item.id}
                      className={`absolute inset-0 transition-opacity duration-300 ${
                        idx === currentMediaIndex ? "opacity-100" : "opacity-0"
                      }`}
                    >
                      {item.url && (
                        <img
                          src={item.url}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                  ))}
                </div>

                {/* Caption Preview Overlay */}
                {captionsEnabled && script && (
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                    <p
                      className={getCaptionClasses()}
                      style={{
                        color:
                          captionStyle === "gradient"
                            ? "transparent"
                            : getCaptionColor(),
                      }}
                    >
                      {(() => {
                        const cleanedScript = cleanScriptForVoiceover(script);
                        const words = cleanedScript.split(" ");
                        return (
                          <>
                            {words.slice(0, 10).join(" ")}
                            {words.length > 10 ? "..." : ""}
                          </>
                        );
                      })()}
                    </p>
                  </div>
                )}

                {/* Play Button Overlay */}
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20"
                >
                  <div className="w-16 h-16 rounded-full bg-accent-blue/20 flex items-center justify-center border-2 border-accent-blue">
                    {isPlaying ? (
                      <Pause className="w-8 h-8 text-accent-blue" />
                    ) : (
                      <Play className="w-8 h-8 text-accent-blue ml-1" />
                    )}
                  </div>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Playback Controls */}
        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground w-8">
              {Math.floor(previewTime)}s
            </span>
            <input
              type="range"
              min="0"
              max={totalDuration}
              value={previewTime}
              onChange={(e) => {
                const time = Number(e.target.value);
                setPreviewTime(time);
                setIsPlaying(false);

                // Calculate which media item to show
                let accumulated = 0;
                for (let i = 0; i < includedItems.length; i++) {
                  const itemDuration = includedItems[i].duration || 5;
                  if (time < accumulated + itemDuration) {
                    setCurrentMediaIndex(i);
                    break;
                  }
                  accumulated += itemDuration;
                }
              }}
              className="flex-1 h-2 bg-muted rounded-full cursor-pointer accent-accent-blue"
              disabled={totalDuration === 0}
            />
            <span className="text-xs text-muted-foreground w-8 text-right">
              {totalDuration}s
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              disabled={totalDuration === 0}
              className="p-2 rounded-lg bg-accent-blue/20 text-accent-blue hover:bg-accent-blue/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPlaying ? (
                <Pause className="w-5 h-5" />
              ) : (
                <Play className="w-5 h-5" />
              )}
            </button>

            <button
              onClick={() => {
                setPreviewTime(0);
                setIsPlaying(false);
                setCurrentMediaIndex(0);
                if (audioRef.current) {
                  audioRef.current.currentTime = 0;
                }
              }}
              disabled={totalDuration === 0}
              className="p-2 rounded-lg bg-muted/50 text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Reset preview"
            >
              <RotateCcw className="w-5 h-5" />
            </button>

            <button
              onClick={() => setIsMuted(!isMuted)}
              disabled={!audioUrl || isGeneratingAudio}
              className={`p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                isMuted
                  ? "bg-muted/50 text-muted-foreground hover:bg-muted"
                  : "bg-accent-blue/20 text-accent-blue hover:bg-accent-blue/30"
              }`}
              title={
                isGeneratingAudio
                  ? "Generating audio..."
                  : isMuted
                    ? "Unmute voiceover"
                    : "Mute voiceover"
              }
            >
              {isMuted ? (
                <VolumeX className="w-5 h-5" />
              ) : (
                <Volume2 className="w-5 h-5" />
              )}
            </button>

            <span className="text-xs text-muted-foreground ml-auto">
              {getResolutionDimensions()}
            </span>
          </div>

          {includedItems.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap">
              {includedItems.map((item, idx) => (
                <button
                  key={item.id}
                  onClick={() => {
                    let time = 0;
                    for (let i = 0; i < idx; i++) {
                      time += includedItems[i].duration || 5;
                    }
                    setPreviewTime(time);
                    setCurrentMediaIndex(idx);
                    setIsPlaying(false);
                  }}
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                    idx === currentMediaIndex
                      ? "bg-accent-blue text-black"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                  title={item.name}
                >
                  {idx + 1}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Captions Settings */}
      <div className="border-t border-border pt-6 space-y-6">
        <div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={captionsEnabled}
              onChange={(e) => onCaptionsToggle(e.target.checked)}
              className="w-4 h-4 rounded border-2 border-border bg-card cursor-pointer accent-accent-blue"
            />
            <span className="font-semibold text-foreground">
              Enable Captions
            </span>
          </label>
        </div>

        {captionsEnabled && (
          <>
            {/* Caption Style */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-3">
                Caption Style
              </label>
              <div className="grid grid-cols-2 gap-2">
                {captionStyles.map((style) => (
                  <button
                    key={style.id}
                    onClick={() => onCaptionStyleChange(style.id)}
                    className={`p-3 rounded-lg border-2 transition-all text-left ${
                      captionStyle === style.id
                        ? "border-accent-blue bg-accent-blue/10"
                        : "border-border hover:border-accent-blue/50"
                    }`}
                  >
                    <p className="text-sm font-medium text-foreground">
                      {style.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {style.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Caption Color */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-3">
                Caption Color
              </label>
              <div className="flex gap-2">
                {captionColors.map((color) => (
                  <button
                    key={color.id}
                    onClick={() => onCaptionColorChange(color.id)}
                    className={`w-12 h-12 rounded-lg border-2 transition-all ${
                      captionColor === color.id
                        ? "border-accent-blue"
                        : "border-border hover:border-accent-blue/50"
                    }`}
                    style={{ backgroundColor: color.hex }}
                    title={color.name}
                  />
                ))}
              </div>
            </div>

            {/* Script Editor */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Script Text
              </label>
              <textarea
                value={script}
                onChange={(e) => onScriptChange(e.target.value)}
                maxLength={500}
                className="w-full px-4 py-3 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent-blue resize-none"
                rows={4}
                placeholder="Enter your script text..."
              />
              <p className="text-xs text-muted-foreground mt-1">
                {script.length}/500 characters
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
