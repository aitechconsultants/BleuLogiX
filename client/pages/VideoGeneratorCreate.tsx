import { useState } from "react";
import ScriptPanel from "@/components/ScriptPanel";
import StyleCard from "@/components/StyleCard";
import VoiceCard from "@/components/VoiceCard";
import CaptionStyleSelector from "@/components/CaptionStyleSelector";
import MediaUploader from "@/components/MediaUploader";
import StockMediaBrowser from "@/components/StockMediaBrowser";
import PreviewPlayer from "@/components/PreviewPlayer";
import ExportConfirmationModal from "@/components/ExportConfirmationModal";
import { ChevronRight, ChevronLeft } from "lucide-react";

interface FormState {
  resolution: "vertical" | "square" | "horizontal";
  duration: number;
  script: string;
  selectedStyle: string;
  selectedVoice: string;
  captionsEnabled: boolean;
  captionStyle: string;
  captionColor: string;
  mediaFiles: Array<{ id: string; name: string }>;
}

export default function VideoGeneratorCreate() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isExporting, setIsExporting] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
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
  });

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

  const voices = [
    {
      id: "voice1",
      name: "Alex",
      gender: "Male",
      language: "English",
      tier: "free" as const,
    },
    {
      id: "voice2",
      name: "Jordan",
      gender: "Female",
      language: "English",
      tier: "free" as const,
    },
    {
      id: "voice3",
      name: "Casey",
      gender: "Non-binary",
      language: "English",
      tier: "free" as const,
    },
    {
      id: "voice4",
      name: "Morgan",
      gender: "Female",
      language: "English",
      tier: "free" as const,
    },
    {
      id: "voice5",
      name: "Phoenix",
      gender: "Male",
      language: "English",
      tier: "pro" as const,
    },
    {
      id: "voice6",
      name: "Riley",
      gender: "Female",
      language: "English",
      tier: "pro" as const,
    },
    {
      id: "voice7",
      name: "Blake",
      gender: "Male",
      language: "English",
      tier: "pro" as const,
    },
    {
      id: "voice8",
      name: "Quinn",
      gender: "Female",
      language: "English",
      tier: "pro" as const,
    },
    {
      id: "voice9",
      name: "Taylor",
      gender: "Male",
      language: "English",
      tier: "enterprise" as const,
    },
    {
      id: "voice10",
      name: "Cameron",
      gender: "Female",
      language: "English",
      tier: "enterprise" as const,
    },
    {
      id: "voice11",
      name: "Jordan",
      gender: "Male",
      language: "English",
      tier: "enterprise" as const,
    },
    {
      id: "voice12",
      name: "Morgan",
      gender: "Female",
      language: "English",
      tier: "enterprise" as const,
    },
  ];

  const steps = [
    { number: 1, title: "Format" },
    { number: 2, title: "Script" },
    { number: 3, title: "Style" },
    { number: 4, title: "Voice & Captions" },
    { number: 5, title: "Media" },
  ];

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
          <div>
            <div className="mb-8">
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {voices.map((voice) => (
                  <VoiceCard
                    key={voice.id}
                    id={voice.id}
                    name={voice.name}
                    gender={voice.gender}
                    language={voice.language}
                    tier={voice.tier}
                    isSelected={formState.selectedVoice === voice.id}
                    onSelect={(id) =>
                      setFormState({
                        ...formState,
                        selectedVoice: id,
                      })
                    }
                    onPlay={(id) => console.log("Play voice:", id)}
                  />
                ))}
              </div>
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
            <div>
              <h3 className="font-display text-2xl font-bold text-foreground mb-6">
                Upload Media
              </h3>
              <MediaUploader
                onFilesSelected={(files) =>
                  setFormState({
                    ...formState,
                    mediaFiles: files,
                  })
                }
              />
            </div>

            <div className="border-t border-border pt-12">
              <h3 className="font-display text-2xl font-bold text-foreground mb-6">
                Or Browse Stock Media
              </h3>
              <StockMediaBrowser
                onMediaSelected={(media) =>
                  console.log("Selected media:", media)
                }
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-background py-12 px-4 md:px-8">
        <div className="max-w-4xl mx-auto space-y-12">
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
                    {formState.resolution === "portrait"
                      ? "1080 x 1920"
                      : "1080 x 1080"}
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
    </Layout>
  );
}
