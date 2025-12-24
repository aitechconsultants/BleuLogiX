import { useState } from "react";
import { RefreshCw, Loader, AlertCircle, X } from "lucide-react";
import type { Episode } from "./SeriesEpisodesSelector";

interface ImagePrompt {
  description: string;
  context: string;
  index: number;
}

interface AIMediaGeneratorProps {
  script: string;
  episodes?: Episode[];
  imageStyle?: string;
  onImageStyleChange?: (style: string) => void;
  onEpisodesChange?: (episodes: Episode[]) => void;
  onMediaSelected: (media: {
    id: string;
    name: string;
    url: string;
    source: "ai-generated";
    imageStyle: string;
    generatedAt: string;
  }) => void;
}

export default function AIMediaGenerator({
  script,
  episodes = [],
  imageStyle = "realistic",
  onImageStyleChange,
  onEpisodesChange,
  onMediaSelected,
}: AIMediaGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [prompts, setPrompts] = useState<ImagePrompt[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [creditCost, setCreditCost] = useState(0);
  const [creditsRemaining, setCreditsRemaining] = useState<number | null>(null);
  const [selectedImages, setSelectedImages] = useState<Set<number>>(new Set());

  const imageStyles = [
    "realistic",
    "fine art",
    "cinematic",
    "fantasy",
    "drama",
    "dark",
  ];

  const generateImages = async () => {
    if (!script.trim() && episodes.length === 0) {
      setError("Please enter a script or select episodes first");
      return;
    }

    try {
      setIsGenerating(true);
      setError(null);

      const response = await fetch("/api/images/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ script, episodes, imageStyle }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        if (response.status === 402) {
          setError(
            `Insufficient credits. Need ${errorData.creditsNeeded} but you have ${errorData.creditsAvailable}`,
          );
        } else {
          setError(
            errorData.error || `Failed to generate images: ${response.status}`,
          );
        }
        return;
      }

      const data = await response.json();
      setPrompts(data.prompts || []);
      setImageUrls(data.imageUrls || []);
      setCreditCost(data.creditCost || 0);
      setCreditsRemaining(data.creditsRemaining);
      setSelectedImages(new Set());
    } catch (err) {
      console.error("Error generating images:", err);
      setError(
        err instanceof Error ? err.message : "Failed to generate images",
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleImageSelection = (index: number) => {
    const newSelected = new Set(selectedImages);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedImages(newSelected);
  };

  const selectAllImages = () => {
    if (selectedImages.size === imageUrls.length && imageUrls.length > 0) {
      setSelectedImages(new Set());
    } else {
      setSelectedImages(new Set(imageUrls.map((_, i) => i)));
    }
  };

  const addSelectedToMedia = () => {
    const selectedCount = selectedImages.size;
    selectedImages.forEach((index) => {
      const url = imageUrls[index];
      const prompt = prompts[index];
      onMediaSelected({
        id: `ai-image-${Date.now()}-${Math.random()}-${index}`,
        name: prompt?.description || `Generated Image ${index + 1}`,
        url,
        source: "ai-generated",
        imageStyle: imageStyle,
        generatedAt: new Date().toISOString(),
      });
    });

    setSelectedImages(new Set());
    alert(
      `Added ${selectedCount} image${selectedCount !== 1 ? "s" : ""} to media`,
    );
  };

  return (
    <div className="space-y-6">
      {/* Generation Controls */}
      <div className="bg-muted/30 rounded-lg p-6 space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            AI Image Generation
          </h3>
          <p className="text-sm text-muted-foreground">
            Generate images automatically matched to your script or episodes
            using DALL-E 3. Each image generation costs 4 credits.
          </p>
        </div>

        {/* Selected Episodes Display */}
        {episodes.length > 0 && (
          <div className="border border-border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">
                Selected Episodes ({episodes.length})
              </p>
              <p className="text-xs text-muted-foreground">
                {episodes.length} episode{episodes.length !== 1 ? "s" : ""} selected
              </p>
            </div>
            <div className="space-y-2">
              {episodes.map((ep, idx) => (
                <div
                  key={ep.id}
                  className="bg-muted/50 rounded-lg p-3 border border-border/50 flex items-start justify-between gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-foreground text-sm">
                        {ep.seriesName}
                      </span>
                      {ep.seasonNumber !== undefined && (
                        <span className="text-xs bg-accent-blue/20 text-accent-blue px-2 py-1 rounded">
                          S{ep.seasonNumber}
                        </span>
                      )}
                      {ep.episodeNumber !== undefined && (
                        <span className="text-xs bg-accent-blue/20 text-accent-blue px-2 py-1 rounded">
                          E{ep.episodeNumber}
                        </span>
                      )}
                    </div>
                    {ep.episodeName && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {ep.episodeName}
                      </p>
                    )}
                    {ep.description && (
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                        {ep.description}
                      </p>
                    )}
                  </div>
                  {onEpisodesChange && (
                    <button
                      onClick={() => {
                        const filtered = episodes.filter((_, i) => i !== idx);
                        onEpisodesChange(filtered);
                      }}
                      className="flex-shrink-0 p-2 rounded-lg hover:bg-red-500/20 text-muted-foreground hover:text-red-500 transition-colors"
                      title="Remove this episode"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground italic">
              Images will be generated for each episode based on its content and description.
            </p>
          </div>
        )}

        {/* Image Style Selector */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            Image Style
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {imageStyles.map((style) => (
              <button
                key={style}
                onClick={() => onImageStyleChange?.(style)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  imageStyle === style
                    ? "bg-accent-blue text-black"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {style.charAt(0).toUpperCase() + style.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={generateImages}
          disabled={isGenerating || (!script.trim() && episodes.length === 0)}
          title={
            isGenerating
              ? "Generating images..."
              : !script.trim() && episodes.length === 0
                ? "Please enter a script or select episodes first"
                : "Generate AI images from your script or episodes"
          }
          className="flex items-center justify-center gap-2 w-full px-6 py-3 rounded-lg bg-accent-blue text-black hover:bg-highlight-blue disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium glow-blue"
        >
          {isGenerating ? (
            <>
              <Loader className="w-5 h-5 animate-spin" />
              Generating Images...
            </>
          ) : (
            <>
              <RefreshCw className="w-5 h-5" />
              Generate Images from Script
            </>
          )}
        </button>

        {creditsRemaining !== null && (
          <p className="text-sm text-muted-foreground">
            Credits remaining:{" "}
            <span className="font-semibold">{creditsRemaining}</span>
          </p>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="flex gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/30">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-600">{error}</p>
          </div>
        </div>
      )}

      {/* Image Prompts Display */}
      {prompts.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-semibold text-foreground">Image Descriptions</h4>
          <div className="space-y-2">
            {prompts.map((prompt, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg bg-muted/50 border border-border text-sm"
              >
                <p className="font-medium text-foreground mb-1">
                  Image {prompt.index + 1}: {prompt.context}
                </p>
                <p className="text-xs text-muted-foreground italic">
                  "{prompt.description}"
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Generated Images Gallery */}
      {imageUrls.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-foreground">
              Generated Images ({imageUrls.length})
            </h4>
            <button
              onClick={selectAllImages}
              className="text-sm text-accent-blue hover:text-highlight-blue transition-colors"
            >
              {selectedImages.size === imageUrls.length && imageUrls.length > 0
                ? "Deselect All"
                : "Select All"}
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {imageUrls.map((url, idx) => (
              <button
                key={idx}
                onClick={() => toggleImageSelection(idx)}
                className={`relative group overflow-hidden rounded-lg transition-all ${
                  selectedImages.has(idx)
                    ? "ring-2 ring-accent-blue scale-95"
                    : "hover:scale-105"
                }`}
              >
                <img
                  src={url}
                  alt={`Generated image ${idx + 1}`}
                  className="w-full aspect-square object-cover"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                  {selectedImages.has(idx) && (
                    <div className="w-6 h-6 rounded-full bg-accent-blue text-black flex items-center justify-center font-bold">
                      ✓
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>

          {selectedImages.size > 0 && (
            <button
              onClick={addSelectedToMedia}
              className="w-full px-6 py-3 rounded-lg bg-accent-blue text-black hover:bg-highlight-blue transition-colors font-medium glow-blue"
            >
              Add {selectedImages.size} Selected Image
              {selectedImages.size !== 1 ? "s" : ""} to Media
            </button>
          )}
        </div>
      )}

      {/* Empty State */}
      {!isGenerating &&
        imageUrls.length === 0 &&
        (script.trim() || episodes.length > 0) &&
        !error && (
          <div className="text-center py-8 text-muted-foreground">
            <p>Click "Generate Images from Script" to create AI images</p>
          </div>
        )}
    </div>
  );
}
