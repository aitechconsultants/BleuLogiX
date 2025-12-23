import { useState } from "react";
import { Plus, X, Sparkles } from "lucide-react";

export interface Episode {
  id: string;
  seriesName: string;
  seasonNumber?: number;
  episodeNumber?: number;
  episodeName?: string;
  description?: string;
  source: "user-defined" | "predefined" | "ai-generated";
}

interface SeriesEpisodesSelectorProps {
  selectedEpisodes: Episode[];
  onEpisodesChange: (episodes: Episode[]) => void;
  defaultPrompt?: string;
}

const PREDEFINED_SERIES = [
  {
    name: "Breaking Bad",
    seasons: [
      {
        season: 1,
        episodes: [
          { number: 1, name: "Pilot" },
          { number: 2, name: "Cat's in the Bag..." },
          { number: 3, name: "And the Bag's in the River" },
          { number: 4, name: "Cancer Man" },
          { number: 5, name: "Gray Matter" },
          { number: 6, name: "Crazy Handful of Nothin'" },
          { number: 7, name: "A No-Rough-Stuff-Type Deal" },
        ],
      },
      {
        season: 2,
        episodes: [
          { number: 1, name: "Seven Thirty-Seven" },
          { number: 2, name: "Grilled" },
          { number: 3, name: "Bit by a Dead Bee" },
        ],
      },
    ],
  },
  {
    name: "The Office",
    seasons: [
      {
        season: 1,
        episodes: [
          { number: 1, name: "Pilot" },
          { number: 2, name: "Diversity Day" },
          { number: 3, name: "Health Care" },
          { number: 4, name: "The Alliance" },
          { number: 5, name: "The Dundies" },
          { number: 6, name: "Basketball" },
        ],
      },
    ],
  },
  {
    name: "Game of Thrones",
    seasons: [
      {
        season: 1,
        episodes: [
          { number: 1, name: "Winter is Coming" },
          { number: 2, name: "The Kingsroad" },
          { number: 3, name: "Lord Snow" },
        ],
      },
    ],
  },
];

export default function SeriesEpisodesSelector({
  selectedEpisodes,
  onEpisodesChange,
  defaultPrompt = "",
}: SeriesEpisodesSelectorProps) {
  const [tab, setTab] = useState<"predefined" | "custom" | "ai">("predefined");
  const [selectedSeries, setSelectedSeries] = useState<string | null>(null);
  const [selectedSeason, setSelectedSeason] = useState<number | null>(null);
  const [customSeriesName, setCustomSeriesName] = useState("");
  const [customSeasonNumber, setCustomSeasonNumber] = useState("");
  const [customEpisodeNumber, setCustomEpisodeNumber] = useState("");
  const [customEpisodeName, setCustomEpisodeName] = useState("");
  const [aiPrompt, setAiPrompt] = useState(defaultPrompt);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  const addPredefinedEpisode = (
    seriesName: string,
    seasonNumber: number,
    episodeNumber: number,
    episodeName: string,
  ) => {
    const newEpisode: Episode = {
      id: `${seriesName}-S${seasonNumber}E${episodeNumber}-${Date.now()}`,
      seriesName,
      seasonNumber,
      episodeNumber,
      episodeName,
      source: "predefined",
    };
    onEpisodesChange([...selectedEpisodes, newEpisode]);
  };

  const addCustomEpisode = () => {
    if (!customSeriesName.trim()) {
      alert("Please enter a series name");
      return;
    }

    const episodeNum = customEpisodeNumber
      ? parseInt(customEpisodeNumber)
      : undefined;
    const seasonNum = customSeasonNumber
      ? parseInt(customSeasonNumber)
      : undefined;

    const newEpisode: Episode = {
      id: `custom-${Date.now()}`,
      seriesName: customSeriesName,
      seasonNumber: seasonNum,
      episodeNumber: episodeNum,
      episodeName: customEpisodeName || undefined,
      source: "user-defined",
    };

    onEpisodesChange([...selectedEpisodes, newEpisode]);

    setCustomSeriesName("");
    setCustomSeasonNumber("");
    setCustomEpisodeNumber("");
    setCustomEpisodeName("");
  };

  const generateAiEpisodes = async () => {
    if (!aiPrompt.trim()) {
      alert("Please describe the episodes you want to generate");
      return;
    }

    try {
      setIsGeneratingAi(true);

      const response = await fetch("/api/episodes/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt: aiPrompt }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Failed to generate episodes: ${response.status}`,
        );
      }

      const data = await response.json();
      const newEpisodes: Episode[] = (data.episodes || []).map((ep: any) => ({
        id: `ai-${Date.now()}-${Math.random()}`,
        seriesName: ep.seriesName,
        seasonNumber: ep.seasonNumber,
        episodeNumber: ep.episodeNumber,
        episodeName: ep.episodeName,
        description: ep.description,
        source: "ai-generated" as const,
      }));

      onEpisodesChange([...selectedEpisodes, ...newEpisodes]);
      setAiPrompt("");
      alert(`Generated ${newEpisodes.length} AI episodes`);
    } catch (error) {
      console.error("Error generating episodes:", error);
      alert(
        error instanceof Error ? error.message : "Failed to generate episodes",
      );
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const removeEpisode = (id: string) => {
    onEpisodesChange(selectedEpisodes.filter((ep) => ep.id !== id));
  };

  const formatEpisodeLabel = (episode: Episode): string => {
    const parts = [episode.seriesName];
    if (episode.seasonNumber !== undefined) {
      parts.push(`S${episode.seasonNumber}`);
    }
    if (episode.episodeNumber !== undefined) {
      parts.push(`E${episode.episodeNumber}`);
    }
    if (episode.episodeName) {
      parts.push(`- ${episode.episodeName}`);
    }
    return parts.join(" ");
  };

  const getSourceBadgeColor = (source: Episode["source"]): string => {
    switch (source) {
      case "predefined":
        return "bg-blue-500/20 text-blue-600";
      case "user-defined":
        return "bg-green-500/20 text-green-600";
      case "ai-generated":
        return "bg-purple-500/20 text-purple-600";
    }
  };

  const getSourceBadgeLabel = (source: Episode["source"]): string => {
    switch (source) {
      case "predefined":
        return "Predefined";
      case "user-defined":
        return "Custom";
      case "ai-generated":
        return "AI";
    }
  };

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-2 border-b border-border">
        <button
          onClick={() => setTab("predefined")}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            tab === "predefined"
              ? "border-accent-blue text-accent-blue"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Browse Series
        </button>
        <button
          onClick={() => setTab("custom")}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            tab === "custom"
              ? "border-accent-blue text-accent-blue"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Add Custom
        </button>
        <button
          onClick={() => setTab("ai")}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            tab === "ai"
              ? "border-accent-blue text-accent-blue"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Generate with AI
        </button>
      </div>

      {/* Tab Content */}
      <div className="space-y-4">
        {/* Predefined Tab */}
        {tab === "predefined" && (
          <div className="space-y-4">
            {PREDEFINED_SERIES.map((series) => (
              <div
                key={series.name}
                className="border border-border rounded-lg p-4"
              >
                <h4 className="font-semibold text-foreground mb-3">
                  {series.name}
                </h4>
                <div className="space-y-2">
                  {series.seasons.map((season) => (
                    <div key={`${series.name}-S${season.season}`}>
                      <p className="text-sm font-medium text-muted-foreground mb-2">
                        Season {season.season}
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {season.episodes.map((episode) => (
                          <button
                            key={`${series.name}-S${season.season}E${episode.number}`}
                            onClick={() =>
                              addPredefinedEpisode(
                                series.name,
                                season.season,
                                episode.number,
                                episode.name,
                              )
                            }
                            className="p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors text-left text-xs font-medium"
                          >
                            <div className="text-foreground">
                              E{episode.number}: {episode.name}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Custom Tab */}
        {tab === "custom" && (
          <div className="space-y-4 bg-muted/30 p-4 rounded-lg">
            <div>
              <label className="text-sm font-medium text-foreground block mb-2">
                Series Name
              </label>
              <input
                type="text"
                value={customSeriesName}
                onChange={(e) => setCustomSeriesName(e.target.value)}
                placeholder="e.g., My Web Series"
                className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent-blue"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground block mb-2">
                  Season (Optional)
                </label>
                <input
                  type="number"
                  value={customSeasonNumber}
                  onChange={(e) => setCustomSeasonNumber(e.target.value)}
                  placeholder="1"
                  min="1"
                  className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent-blue"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground block mb-2">
                  Episode (Optional)
                </label>
                <input
                  type="number"
                  value={customEpisodeNumber}
                  onChange={(e) => setCustomEpisodeNumber(e.target.value)}
                  placeholder="1"
                  min="1"
                  className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent-blue"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground block mb-2">
                Episode Name (Optional)
              </label>
              <input
                type="text"
                value={customEpisodeName}
                onChange={(e) => setCustomEpisodeName(e.target.value)}
                placeholder="e.g., The Beginning"
                className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent-blue"
              />
            </div>

            <button
              onClick={addCustomEpisode}
              className="flex items-center gap-2 w-full px-4 py-2 rounded-lg bg-accent-blue text-black hover:bg-highlight-blue transition-colors font-medium"
            >
              <Plus className="w-4 h-4" />
              Add Custom Episode
            </button>
          </div>
        )}

        {/* AI Tab */}
        {tab === "ai" && (
          <div className="space-y-4 bg-purple-500/5 p-4 rounded-lg border border-purple-500/20">
            <div>
              <label className="text-sm font-medium text-foreground block mb-2">
                Describe the episodes you want to generate
              </label>
              <textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="e.g., A sci-fi series about time travelers. Generate 5 episodes with creative titles and descriptions."
                rows={4}
                className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
              />
            </div>

            <button
              onClick={generateAiEpisodes}
              disabled={isGeneratingAi || !aiPrompt.trim()}
              className="flex items-center justify-center gap-2 w-full px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              <Sparkles className="w-4 h-4" />
              {isGeneratingAi ? "Generating..." : "Generate Episodes with AI"}
            </button>
          </div>
        )}
      </div>

      {/* Selected Episodes */}
      {selectedEpisodes.length > 0 && (
        <div>
          <h4 className="font-semibold text-foreground mb-3">
            Selected Episodes ({selectedEpisodes.length})
          </h4>
          <div className="space-y-2">
            {selectedEpisodes.map((episode) => (
              <div
                key={episode.id}
                className="flex items-start justify-between gap-3 p-3 rounded-lg bg-muted/50 border border-border"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground text-sm mb-1">
                    {formatEpisodeLabel(episode)}
                  </p>
                  {episode.description && (
                    <p className="text-xs text-muted-foreground">
                      {episode.description}
                    </p>
                  )}
                  <div className="mt-2">
                    <span
                      className={`inline-block px-2 py-1 rounded text-xs font-medium ${getSourceBadgeColor(episode.source)}`}
                    >
                      {getSourceBadgeLabel(episode.source)}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => removeEpisode(episode.id)}
                  className="flex-shrink-0 p-2 rounded-lg hover:bg-red-500/10 transition-colors"
                >
                  <X className="w-4 h-4 text-red-500" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
