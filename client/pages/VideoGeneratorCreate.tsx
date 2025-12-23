import { useState, useEffect } from "react";
import ScriptPanel from "@/components/ScriptPanel";
import StyleCard from "@/components/StyleCard";
import VoiceCard from "@/components/VoiceCard";
import CaptionStyleSelector from "@/components/CaptionStyleSelector";
import MediaUploader from "@/components/MediaUploader";
import AIMediaGenerator from "@/components/AIMediaGenerator";
import SeriesEpisodesSelector, {
  Episode,
} from "@/components/SeriesEpisodesSelector";
import PreviewPlayer from "@/components/PreviewPlayer";
import ExportConfirmationModal from "@/components/ExportConfirmationModal";
import ProjectsList from "@/components/ProjectsList";
import { ChevronRight, ChevronLeft, Save, Trash2 } from "lucide-react";

interface Voice {
  id: string;
  name: string;
  lang: string;
  gender: string;
  isPremium: boolean;
  tone: string;
  style: string;
  useCase: string;
}

interface FormState {
  resolution: "vertical" | "square" | "horizontal";
  duration: number;
  script: string;
  selectedStyle: string;
  selectedVoice: string;
  captionsEnabled: boolean;
  captionStyle: string;
  captionColor: string;
  mediaFiles: Array<{ id: string; name: string; url?: string }>;
  selectedEpisodes: Episode[];
}

interface Project {
  id: string;
  name: string;
  form_state: FormState;
  created_at: string;
  updated_at: string;
}

export default function VideoGeneratorCreate() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isExporting, setIsExporting] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [voicesLoading, setVoicesLoading] = useState(true);
  const [voicesError, setVoicesError] = useState<string | null>(null);
  const [projectName, setProjectName] = useState("");
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [projectsRefreshTrigger, setProjectsRefreshTrigger] = useState(0);
  const [formState, setFormState] = useState<FormState>({
    resolution: "vertical",
    duration: 15,
    script: "",
    selectedStyle: "",
    selectedVoice: "",
    captionsEnabled: true,
    captionStyle: "clean",
    captionColor: "white",
    mediaFiles: [],
    selectedEpisodes: [],
  });

  // Fetch voices from API
  useEffect(() => {
    const fetchVoices = async () => {
      try {
        setVoicesLoading(true);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch("/api/voices", {
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`Failed to fetch voices: ${response.status}`);
        }
        const data = await response.json();
        setVoices(data.voices || []);
        setVoicesError(null);
      } catch (error) {
        console.error("Error fetching voices:", error);
        if (error instanceof Error && error.name === "AbortError") {
          setVoicesError("Voice loading timed out. Please try again.");
        } else {
          setVoicesError(
            error instanceof Error ? error.message : "Failed to fetch voices",
          );
        }
      } finally {
        setVoicesLoading(false);
      }
    };

    fetchVoices();
  }, []);

  const saveProject = async () => {
    if (!projectName.trim()) {
      alert("Please enter a project name");
      return;
    }

    try {
      setIsSaving(true);
      const url = currentProjectId
        ? `/api/projects/${currentProjectId}`
        : "/api/projects";
      const method = currentProjectId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: projectName,
          formState,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Failed to save project: ${response.status}`,
        );
      }

      const savedProject = await response.json();
      setCurrentProjectId(savedProject.id);
      setProjectsRefreshTrigger((prev) => prev + 1);
      alert(
        currentProjectId
          ? "Project updated successfully!"
          : "Project saved successfully!",
      );
    } catch (error) {
      console.error("Error saving project:", error);
      alert(error instanceof Error ? error.message : "Failed to save project");
    } finally {
      setIsSaving(false);
    }
  };

  const loadProject = async (projectId: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}`);

      if (!response.ok) {
        throw new Error(`Failed to load project: ${response.status}`);
      }

      const project: Project = await response.json();
      setProjectName(project.name);
      setFormState(project.form_state);
      setCurrentProjectId(project.id);
      setCurrentStep(1);
    } catch (error) {
      console.error("Error loading project:", error);
      alert(error instanceof Error ? error.message : "Failed to load project");
    }
  };

  const styles = [
    {
      id: "ugc",
      title: "UGC Realistic",
      description: "Authentic user-generated content style",
    },
    {
      id: "faceless",
      title: "Faceless Dynamic",
      description: "Dynamic content without showing faces",
    },
    {
      id: "storytelling",
      title: "Storytelling",
      description: "Narrative-driven content",
    },
    {
      id: "motivational",
      title: "Motivational",
      description: "Inspirational and uplifting videos",
    },
    {
      id: "educational",
      title: "Educational",
      description: "Informative tutorial-style content",
    },
    {
      id: "meme",
      title: "Meme",
      description: "Fun and trendy meme-styled videos",
    },
    {
      id: "trend",
      title: "Fast-Paced Trend",
      description: "Quick cuts with trending audio",
    },
    {
      id: "broll",
      title: "B-Roll Cinematic",
      description: "Professional cinematic quality",
    },
  ];

  const steps = [
    { number: 1, title: "Format" },
    { number: 2, title: "Script" },
    { number: 3, title: "Style" },
    { number: 4, title: "Voice & Captions" },
    { number: 5, title: "Media" },
  ];

  const playVoicePreview = async (voiceId: string) => {
    try {
      console.log(`Playing voice preview for ${voiceId}`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(`/api/voices/${voiceId}/preview`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(
          "Failed to get voice preview:",
          response.statusText,
          errorData,
        );
        alert(
          `Failed to play voice: ${errorData.error || response.statusText}`,
        );
        return;
      }

      const audioBlob = await response.blob();
      console.log(`Voice preview blob size: ${audioBlob.size} bytes`);

      if (audioBlob.size === 0) {
        alert("Voice preview is empty");
        return;
      }

      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audio
        .play()
        .then(() => {
          console.log("Voice preview playing");
        })
        .catch((error) => {
          console.error("Failed to play audio:", error);
          alert(`Failed to play audio: ${error.message}`);
        });
    } catch (error) {
      console.error("Error playing voice preview:", error);
      if (error instanceof Error && error.name === "AbortError") {
        alert("Voice preview request timed out");
      } else {
        alert(
          `Error playing voice: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
    }
  };

  const handleNext = () => {
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
    } else {
      setShowExportModal(true);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleExport = () => {
    setIsExporting(true);
    setTimeout(() => {
      setIsExporting(false);
      alert("Video exported successfully!");
      setShowExportModal(false);
    }, 2000);
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-8">
            <div>
              <h3 className="font-display text-2xl font-bold text-foreground mb-6">
                Project Name
              </h3>

              {/* Project Name Input */}
              <div className="space-y-2 mb-8">
                <label className="text-sm font-medium text-foreground block">
                  Give your project a name
                </label>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="e.g., Product Launch Video"
                    className="flex-1 px-4 py-3 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent-blue"
                  />
                  <button
                    onClick={saveProject}
                    disabled={isSaving || !projectName.trim()}
                    className="flex items-center gap-2 px-6 py-3 rounded-lg bg-accent-blue text-black hover:bg-highlight-blue disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium glow-blue"
                  >
                    <Save className="w-5 h-5" />
                    {isSaving
                      ? "Saving..."
                      : currentProjectId
                        ? "Update"
                        : "Save"}
                  </button>
                </div>
                {currentProjectId && (
                  <p className="text-xs text-muted-foreground">
                    Currently editing: {projectName}
                  </p>
                )}
              </div>
            </div>

            <div className="border-t border-border pt-8">
              <h3 className="font-display text-2xl font-bold text-foreground mb-6">
                Video Format
              </h3>

              {/* Resolution Selector */}
              <div className="space-y-4">
                <label className="text-sm font-medium text-foreground block">
                  Video Platform
                </label>
                <div className="grid grid-cols-1 gap-4">
                  {[
                    {
                      id: "vertical",
                      label: "1080 x 1920",
                      desc: "TikTok, Instagram Reels, YouTube Shorts",
                    },
                    {
                      id: "square",
                      label: "1080 x 1080",
                      desc: "Instagram",
                    },
                    {
                      id: "horizontal",
                      label: "1920 x 1080",
                      desc: "YouTube",
                    },
                  ].map((res) => (
                    <button
                      key={res.id}
                      onClick={() =>
                        setFormState({
                          ...formState,
                          resolution: res.id as
                            | "vertical"
                            | "square"
                            | "horizontal",
                        })
                      }
                      className={`p-6 rounded-lg border-2 transition-all text-center ${
                        formState.resolution === res.id
                          ? "border-accent-blue bg-accent-blue/10"
                          : "border-border hover:border-accent-blue/50 bg-card"
                      }`}
                    >
                      <div className="text-lg font-semibold text-foreground">
                        {res.label}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {res.desc}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Duration Slider */}
              <div className="space-y-4 mt-8">
                <label className="text-sm font-medium text-foreground block">
                  Video Length: {formState.duration} seconds
                </label>
                <input
                  type="range"
                  min="6"
                  max="60"
                  value={formState.duration}
                  onChange={(e) =>
                    setFormState({
                      ...formState,
                      duration: Number(e.target.value),
                    })
                  }
                  className="w-full h-2 bg-muted rounded-full cursor-pointer accent-accent-blue"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>6s</span>
                  <span>60s</span>
                </div>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-12">
            <div>
              <h3 className="font-display text-2xl font-bold text-foreground mb-2">
                Define Your Video Direction
              </h3>
              <p className="text-muted-foreground">
                Tell us what your video is about, who it's for, and how it
                should sound.
              </p>
            </div>

            <ScriptPanel
              value={formState.script}
              onChange={(script) => setFormState({ ...formState, script })}
              maxLength={2000}
              onImproveScript={() =>
                alert("Improve script feature - to be implemented")
              }
            />

            <div className="border-t border-border pt-12">
              <h3 className="font-display text-2xl font-bold text-foreground mb-6">
                Series & Episodes
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Optionally select or create episodes to customize your script and images.
              </p>
              <SeriesEpisodesSelector
                selectedEpisodes={formState.selectedEpisodes}
                onEpisodesChange={(episodes) =>
                  setFormState({ ...formState, selectedEpisodes: episodes })
                }
              />
            </div>
          </div>
        );

      case 3:
        return (
          <div>
            <h3 className="font-display text-2xl font-bold text-foreground mb-6">
              Choose Your Style
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {styles.map((style) => (
                <StyleCard
                  key={style.id}
                  id={style.id}
                  title={style.title}
                  description={style.description}
                  thumbnail={`https://images.unsplash.com/photo-${Math.floor(Math.random() * 1000000000000000)}-?w=300&h=300&fit=crop`}
                  isSelected={formState.selectedStyle === style.id}
                  onSelect={(id) =>
                    setFormState({
                      ...formState,
                      selectedStyle: id,
                    })
                  }
                />
              ))}
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-12">
            {/* Voice Selection */}
            <div>
              <h3 className="font-display text-2xl font-bold text-foreground mb-6">
                Select Voice
              </h3>
              {voicesLoading && (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Loading voices...</p>
                </div>
              )}
              {voicesError && (
                <div className="text-center py-8">
                  <p className="text-red-500">Error: {voicesError}</p>
                </div>
              )}
              {!voicesLoading && !voicesError && (
                <div className="space-y-2 w-full">
                  {voices.map((voice) => (
                    <VoiceCard
                      key={voice.id}
                      id={voice.id}
                      name={voice.name}
                      gender={voice.gender}
                      language={voice.lang}
                      tier={voice.isPremium ? "pro" : "free"}
                      tone={voice.tone}
                      style={voice.style}
                      useCase={voice.useCase}
                      isSelected={formState.selectedVoice === voice.id}
                      onSelect={(id) =>
                        setFormState({
                          ...formState,
                          selectedVoice: id,
                        })
                      }
                      onPlay={(id) => playVoicePreview(id)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Caption Settings */}
            <div>
              <h3 className="font-display text-2xl font-bold text-foreground mb-6">
                Captions
              </h3>
              <CaptionStyleSelector
                isEnabled={formState.captionsEnabled}
                selectedStyle={formState.captionStyle}
                selectedColor={formState.captionColor}
                onToggle={(enabled) =>
                  setFormState({
                    ...formState,
                    captionsEnabled: enabled,
                  })
                }
                onStyleChange={(style) =>
                  setFormState({
                    ...formState,
                    captionStyle: style,
                  })
                }
                onColorChange={(color) =>
                  setFormState({
                    ...formState,
                    captionColor: color,
                  })
                }
              />
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-12">
            {/* AI Image Generation */}
            <div>
              <h3 className="font-display text-2xl font-bold text-foreground mb-6">
                Generate Images with AI
              </h3>
              <AIMediaGenerator
                script={formState.script}
                episodes={formState.selectedEpisodes}
                onMediaSelected={(media) => {
                  const newMediaFiles = [
                    ...formState.mediaFiles,
                    {
                      id: media.id,
                      name: media.name,
                      url: media.url,
                    },
                  ];
                  setFormState({
                    ...formState,
                    mediaFiles: newMediaFiles,
                  });
                }}
              />
            </div>

            {/* Manual Upload */}
            <div className="border-t border-border pt-12">
              <h3 className="font-display text-2xl font-bold text-foreground mb-6">
                Or Upload Your Own Media
              </h3>
              <MediaUploader
                onFilesSelected={(files) =>
                  setFormState({
                    ...formState,
                    mediaFiles: [
                      ...formState.mediaFiles,
                      ...files.map((f) => ({ ...f, url: undefined })),
                    ],
                  })
                }
              />
            </div>

            {/* Selected Media */}
            {formState.mediaFiles.length > 0 && (
              <div className="border-t border-border pt-12">
                <h3 className="font-display text-2xl font-bold text-foreground mb-6">
                  Selected Media ({formState.mediaFiles.length})
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {formState.mediaFiles.map((media, idx) => (
                    <div
                      key={media.id}
                      className="relative group rounded-lg overflow-hidden bg-muted border border-border p-3"
                    >
                      {media.url && (
                        <img
                          src={media.url}
                          alt={media.name}
                          className="w-full aspect-square object-cover rounded mb-2"
                        />
                      )}
                      <p className="text-sm font-medium text-foreground truncate">
                        {media.name}
                      </p>
                      <button
                        onClick={() => {
                          const filtered = formState.mediaFiles.filter(
                            (_, i) => i !== idx,
                          );
                          setFormState({
                            ...formState,
                            mediaFiles: filtered,
                          });
                        }}
                        className="absolute top-2 right-2 p-2 rounded-lg bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Remove media"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background py-8 px-4 md:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Projects List */}
        <ProjectsList
          onProjectSelect={loadProject}
          refreshTrigger={projectsRefreshTrigger}
        />

        {/* Stepper */}
        <div className="space-y-6">
          <h1 className="font-display text-4xl font-bold text-foreground">
            Create Your Video
          </h1>

          <div className="flex items-center gap-2 md:gap-4 overflow-x-auto pb-2">
            {steps.map((step, idx) => (
              <div
                key={step.number}
                className="flex items-center gap-2 md:gap-4"
              >
                <button
                  onClick={() => setCurrentStep(step.number)}
                  className={`flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-full font-semibold transition-all whitespace-nowrap text-sm md:text-base ${
                    currentStep === step.number
                      ? "bg-accent-blue text-black glow-blue"
                      : currentStep > step.number
                        ? "bg-accent-blue/20 text-accent-blue"
                        : "bg-card border border-border text-muted-foreground"
                  }`}
                >
                  {currentStep > step.number ? "✓" : step.number}
                </button>
                <span className="text-xs md:text-sm font-medium text-muted-foreground hidden sm:inline">
                  {step.title}
                </span>
                {idx < steps.length - 1 && (
                  <div className="h-0.5 w-4 md:w-8 bg-border" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-card border border-border rounded-lg p-8">
          {renderStep()}
        </div>

        {/* Navigation Buttons */}
        <div className="flex gap-4 justify-between">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 1}
            className="flex items-center gap-2 px-6 py-3 rounded-lg bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            <ChevronLeft className="w-5 h-5" />
            Previous
          </button>

          <button
            onClick={handleNext}
            className="flex items-center gap-2 px-8 py-3 rounded-lg bg-accent-blue text-black hover:bg-highlight-blue transition-colors font-medium glow-blue"
          >
            {currentStep === 5 ? "Review & Export" : "Next"}
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Preview Section */}
        {currentStep === 5 && (
          <div className="mt-12 pt-12 border-t border-border space-y-6">
            <h2 className="font-display text-2xl font-bold text-foreground">
              Preview
            </h2>
            <PreviewPlayer
              title={formState.script.slice(0, 50) || "Your Video"}
              duration={formState.duration}
            />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="p-3 rounded-lg bg-muted/30">
                <p className="text-muted-foreground text-xs">Format</p>
                <p className="font-semibold text-foreground">
                  {formState.resolution === "vertical"
                    ? "1080 x 1920"
                    : formState.resolution === "square"
                      ? "1080 x 1080"
                      : "1920 x 1080"}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-muted/30">
                <p className="text-muted-foreground text-xs">Duration</p>
                <p className="font-semibold text-foreground">
                  {formState.duration}s
                </p>
              </div>
              <div className="p-3 rounded-lg bg-muted/30">
                <p className="text-muted-foreground text-xs">Voice</p>
                <p className="font-semibold text-foreground">
                  {formState.selectedVoice || "None"}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-muted/30">
                <p className="text-muted-foreground text-xs">Captions</p>
                <p className="font-semibold text-foreground">
                  {formState.captionsEnabled ? "Enabled" : "Disabled"}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Export Confirmation Modal */}
      <ExportConfirmationModal
        isOpen={showExportModal}
        onConfirm={handleExport}
        onCancel={() => setShowExportModal(false)}
        creditsRequired={50}
        creditsAvailable={42}
        videoTitle={formState.script.slice(0, 50) || "Untitled Video"}
      />
    </div>
  );
}
