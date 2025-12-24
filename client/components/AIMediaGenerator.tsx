import { useState, useEffect } from "react";
import { RefreshCw, Loader, AlertCircle, X, ChevronRight } from "lucide-react";
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
  const [selectedEpisodeId, setSelectedEpisodeId] = useState<string | null>(
    null,
  );
  const [episodesSelectedForGeneration, setEpisodesSelectedForGeneration] =
    useState<Set<string>>(new Set());
  const [episodePrompts, setEpisodePrompts] = useState<
    Record<string, ImagePrompt[]>
  >({});
  const [loadingPrompts, setLoadingPrompts] = useState<Set<string>>(new Set());

  const imageStyles = [
    "realistic",
    "fine art",
    "cinematic",
    "fantasy",
    "drama",
    "dark",
  ];

  // Extract prompts for a specific episode
  const extractPromptsForEpisode = async (episode: Episode) => {
    try {
      console.log("[AIMediaGenerator] Extracting prompts for episode:", episode.id);
      const response = await fetch("/api/images/extract-prompts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          script: "",
          episodes: [episode],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(
          "[AIMediaGenerator] Failed to extract prompts:",
          response.status,
          errorData
        );
        return [];
      }

      const data = await response.json();
      console.log("[AIMediaGenerator] Extracted prompts:", data.prompts?.length);
      return data.prompts || [];
    } catch (err) {
      console.error("[AIMediaGenerator] Error extracting prompts:", err);
      return [];
    }
  };

  // Load prompts when an episode is selected
  useEffect(() => {
    if (!selectedEpisodeId) return;

    const episode = episodes.find((ep) => ep.id === selectedEpisodeId);
    if (!episode) return;

    // Check if we already have prompts for this episode
    if (episodePrompts[selectedEpisodeId]) {
      console.log("[AIMediaGenerator] Using cached prompts for episode:", selectedEpisodeId);
      setLoadingPrompts((prev) => {
        const updated = new Set(prev);
        updated.delete(selectedEpisodeId);
        return updated;
      });
      return;
    }

    // Mark this episode as loading
    setLoadingPrompts((prev) => new Set(prev).add(selectedEpisodeId));

    console.log("[AIMediaGenerator] Loading prompts for episode:", selectedEpisodeId);
    extractPromptsForEpisode(episode).then((prompts) => {
      setEpisodePrompts((prev) => ({
        ...prev,
        [selectedEpisodeId]: prompts,
      }));
      setLoadingPrompts((prev) => {
        const updated = new Set(prev);
        updated.delete(selectedEpisodeId);
        return updated;
      });
    });
  }, [selectedEpisodeId]);

  const toggleEpisodeSelection = (episodeId: string) => {
    const newSelected = new Set(episodesSelectedForGeneration);
    if (newSelected.has(episodeId)) {
      newSelected.delete(episodeId);
    } else {
      newSelected.add(episodeId);
    }
    setEpisodesSelectedForGeneration(newSelected);
  };

  const selectAllEpisodes = () => {
    if (episodesSelectedForGeneration.size === episodes.length) {
      setEpisodesSelectedForGeneration(new Set());
    } else {
      setEpisodesSelectedForGeneration(new Set(episodes.map((ep) => ep.id)));
    }
  };

  const generateImages = async () => {
    const selectedCount = episodesSelectedForGeneration.size;
    if (selectedCount === 0 && !script.trim()) {
      setError("Please select episodes or enter a script first");
      return;
    }

    try {
      setIsGenerating(true);
      setError(null);

      // Filter episodes to only those selected for generation
      const episodesToGenerate =
        selectedCount > 0
          ? episodes.filter((ep) => episodesSelectedForGeneration.has(ep.id))
          : episodes;

      const response = await fetch("/api/images/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          script,
          episodes: episodesToGenerate,
          imageStyle,
        }),
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

        {/* Episodes and Prompts - Two Panel Layout */}
        {episodes.length > 0 && (
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="flex min-h-96">
              {/* Left Panel: Episode List */}
              <div className="w-1/3 border-r border-border bg-muted/20 flex flex-col">
                <div className="p-4 border-b border-border space-y-2 flex-shrink-0">
                  <p className="text-sm font-semibold text-foreground">
                    Episodes ({episodes.length})
                  </p>
                  <button
                    onClick={selectAllEpisodes}
                    className="text-xs text-accent-blue hover:text-highlight-blue transition-colors"
                  >
                    {episodesSelectedForGeneration.size === episodes.length &&
                    episodes.length > 0
                      ? "Deselect All"
                      : "Select All"}
                  </button>
                </div>
                <div className="overflow-y-auto flex-1">
                  {episodes.map((ep) => (
                    <div
                      key={ep.id}
                      onClick={() => setSelectedEpisodeId(ep.id)}
                      className={`p-3 border-b border-border cursor-pointer transition-colors ${
                        selectedEpisodeId === ep.id
                          ? "bg-accent-blue/20 border-l-2 border-l-accent-blue"
                          : "hover:bg-muted"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={episodesSelectedForGeneration.has(ep.id)}
                          onChange={(e) => {
                            e.stopPropagation();
                            toggleEpisodeSelection(ep.id);
                          }}
                          className="mt-1 w-4 h-4 rounded border-border bg-card accent-accent-blue cursor-pointer"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1 flex-wrap">
                            <span className="font-medium text-sm text-foreground">
                              {ep.seriesName}
                            </span>
                            {ep.seasonNumber !== undefined && (
                              <span className="text-xs bg-accent-blue/20 text-accent-blue px-1.5 py-0.5 rounded">
                                S{ep.seasonNumber}
                              </span>
                            )}
                            {ep.episodeNumber !== undefined && (
                              <span className="text-xs bg-accent-blue/20 text-accent-blue px-1.5 py-0.5 rounded">
                                E{ep.episodeNumber}
                              </span>
                            )}
                          </div>
                          {ep.episodeName && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                              {ep.episodeName}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Panel: Episode Details and Prompts */}
              <div className="w-2/3 p-4 overflow-y-auto flex flex-col">
                {selectedEpisodeId ? (
                  (() => {
                    const selectedEpisode = episodes.find(
                      (ep) => ep.id === selectedEpisodeId,
                    );
                    const prompts = episodePrompts[selectedEpisodeId] || [];

                    return (
                      <div className="space-y-4">
                        {selectedEpisode && (
                          <>
                            <div>
                              <h4 className="font-semibold text-foreground mb-2">
                                {selectedEpisode.seriesName}
                                {selectedEpisode.seasonNumber && (
                                  <span className="text-sm font-normal text-muted-foreground ml-2">
                                    S{selectedEpisode.seasonNumber}E
                                    {selectedEpisode.episodeNumber}
                                  </span>
                                )}
                              </h4>
                              {selectedEpisode.episodeName && (
                                <p className="text-sm text-foreground mb-2">
                                  {selectedEpisode.episodeName}
                                </p>
                              )}
                              {selectedEpisode.description && (
                                <p className="text-sm text-muted-foreground mb-4">
                                  {selectedEpisode.description}
                                </p>
                              )}
                            </div>

                            <div>
                              <h5 className="font-medium text-foreground mb-2">
                                Image Prompts ({prompts.length})
                              </h5>
                              {prompts.length > 0 ? (
                                <div className="space-y-2">
                                  {prompts.map((prompt, idx) => (
                                    <div
                                      key={idx}
                                      className="p-2 rounded-lg bg-muted/50 border border-border/50"
                                    >
                                      <p className="text-xs font-medium text-foreground mb-1">
                                        Image {prompt.index + 1}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        {prompt.context}
                                      </p>
                                      <p className="text-xs text-muted-foreground italic mt-1">
                                        "{prompt.description.substring(0, 100)}
                                        ..."
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-sm text-muted-foreground">
                                  Loading image prompts...
                                </p>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })()
                ) : (
                  <div className="flex items-center justify-center h-full text-center">
                    <p className="text-muted-foreground">
                      Select an episode to view image prompts
                    </p>
                  </div>
                )}
              </div>
            </div>
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
          disabled={
            isGenerating ||
            (!script.trim() && episodesSelectedForGeneration.size === 0)
          }
          title={
            isGenerating
              ? "Generating images..."
              : !script.trim() && episodesSelectedForGeneration.size === 0
                ? "Please enter a script or select episodes first"
                : `Generate AI images for ${
                    episodesSelectedForGeneration.size > 0
                      ? `${episodesSelectedForGeneration.size} episode${episodesSelectedForGeneration.size !== 1 ? "s" : ""}`
                      : "script"
                  }`
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
              {episodesSelectedForGeneration.size > 0
                ? `Generate Images for ${episodesSelectedForGeneration.size} Episode${episodesSelectedForGeneration.size !== 1 ? "s" : ""}`
                : "Generate Images from Script"}
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
