import { useState, useEffect } from "react";
import { useAuth } from "@clerk/clerk-react";
import GeneratorHeader from "@/components/generator/GeneratorHeader";
import GeneratorTemplatePicker from "@/components/generator/GeneratorTemplatePicker";
import GeneratorInputsForm from "@/components/generator/GeneratorInputsForm";
import VoiceoverSelector from "@/components/generator/VoiceoverSelector";
import CaptionsSelector from "@/components/generator/CaptionsSelector";
import GeneratorPreviewPanel from "@/components/generator/GeneratorPreviewPanel";
import GenerateBar from "@/components/generator/GenerateBar";
import GenerationHistoryList from "@/components/generator/GenerationHistoryList";
import UpgradeModal from "@/components/generator/UpgradeModal";
import { useApiClient, APIError } from "@/lib/api";

interface GeneratedVideo {
  id: string;
  user_id: string;
  template_id: string;
  voice_id: string;
  caption_style: string;
  status: "queued" | "rendering" | "complete" | "failed";
  preview_url: string | null;
  output_url: string | null;
  created_at: string;
  input_json?: any;
}

interface UserData {
  plan: "free" | "pro" | "enterprise";
  creditsRemaining: number;
  billingStatus: "free" | "pro" | "enterprise";
}

interface Voice {
  id: string;
  name: string;
  lang: string;
  gender?: string;
  isPremium?: boolean;
}

const VOICES: Voice[] = [
  { id: "voice-1", name: "Alex", lang: "English (US)", gender: "male" },
  { id: "voice-2", name: "Emma", lang: "English (US)", gender: "female" },
  { id: "voice-3", name: "Oliver", lang: "English (UK)", gender: "male" },
  { id: "voice-4", name: "Sophia", lang: "English (UK)", gender: "female" },
  { id: "voice-5", name: "Lucas", lang: "Spanish", gender: "male" },
  { id: "voice-6", name: "Isabella", lang: "Spanish", gender: "female" },
];

export default function Generator() {
  const api = useApiClient();
  const { getToken } = useAuth();

  const [selectedTemplate, setSelectedTemplate] = useState("product-promo");
  const [scriptText, setScriptText] = useState("");
  const [headlineText, setHeadlineText] = useState("");
  const [voiceId, setVoiceId] = useState(VOICES[0]?.id ?? "");
  const [selectedVoice, setSelectedVoice] = useState("voice-1");
  const [enableCaptions, setEnableCaptions] = useState(true);
  const [selectedCaptionStyle, setSelectedCaptionStyle] = useState("classic");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [creditsRemaining, setCreditsRemaining] = useState(0);
  const [generatedVideos, setGeneratedVideos] = useState<GeneratedVideo[]>([]);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState("");
  const [billingStatus, setBillingStatus] = useState<
    "free" | "checkout_pending" | "pro" | "enterprise"
  >("free");
  const [error, setError] = useState<string | null>(null);

  const premiumAccess =
    billingStatus === "pro" || billingStatus === "enterprise";

  // Load initial user data and history on mount
  useEffect(() => {
    const loadUserData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch user data
        try {
          const userData: UserData = await api("/api/generator/me");
          setCreditsRemaining(userData.creditsRemaining);
          setBillingStatus(userData.billingStatus);
        } catch (userDataErr) {
          // If we can't fetch user data, use defaults and continue
          console.warn("Could not fetch user data, using defaults:", userDataErr);
          setCreditsRemaining(100); // Default credits for demo
          setBillingStatus("free");
        }

        // Fetch generation history
        try {
          const history: GeneratedVideo[] = await api("/api/generator/history");
          setGeneratedVideos(history);
        } catch (historyErr) {
          // If we can't fetch history, continue with empty list
          console.warn("Could not fetch generation history:", historyErr);
          setGeneratedVideos([]);
        }
      } catch (err) {
        // Final fallback - should rarely happen now
        const message =
          err instanceof Error ? err.message : "Failed to load data";
        console.error("Load error:", err);
        // Don't set error state - let user continue with defaults
      } finally {
        setIsLoading(false);
      }
    };

    loadUserData();
  }, [api]);

  // Debug logging for voiceId
  useEffect(() => {
    console.log("voiceId:", voiceId);
  }, [voiceId]);

  const handleGenerate = async () => {
    try {
      setIsGenerating(true);
      setError(null);

      const newGeneration: GeneratedVideo = await api(
        "/api/generator/generate",
        {
          method: "POST",
          body: JSON.stringify({
            templateId: selectedTemplate,
            voiceId: selectedVoice,
            captionStyle: selectedCaptionStyle,
            inputJson: {
              script: scriptText,
              headline: headlineText,
            },
          }),
        },
      );

      setGeneratedVideos((prev) => [newGeneration, ...prev]);
      setCreditsRemaining((prev) => Math.max(0, prev - 10));
    } catch (err) {
      if (err instanceof APIError && err.status === 402) {
        // Insufficient credits
        handleGenerateBlocked(err.message);
        setIsGenerating(false);
        return;
      }

      const message =
        err instanceof Error ? err.message : "Failed to generate video";
      setError(message);
      console.error("Generate error:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateBlocked = (reason: string) => {
    setUpgradeReason(reason);
    setIsUpgradeModalOpen(true);
  };

  const handleDownloadBlocked = (reason: string) => {
    setUpgradeReason(reason);
    setIsUpgradeModalOpen(true);
  };

  const handleSelectPlan = async (plan: string) => {
    try {
      setBillingStatus("checkout_pending");
      setError(null);

      const data = await api("/api/billing/create-checkout-session", {
        method: "POST",
        body: JSON.stringify({ plan }),
      });

      // Redirect to Stripe checkout
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to upgrade";
      setError(message);
      setBillingStatus("free");
      console.error("Upgrade error:", err);
    }
  };

  const handleViewVideo = (id: string) => {
    console.log("View video:", id);
  };

  const handleDownloadVideo = async (
    id: string,
    quality: "watermarked" | "hd",
  ) => {
    try {
      const data = await api("/api/generator/download", {
        method: "POST",
        body: JSON.stringify({
          generationId: id,
          quality,
        }),
      });

      // In production, this would trigger a download
      console.log("Download URL:", data.url);
      window.open(data.url, "_blank");
    } catch (err) {
      if (err instanceof APIError && err.status === 403) {
        // Insufficient permissions/entitlements
        handleDownloadBlocked(err.message);
        return;
      }

      const message = err instanceof Error ? err.message : "Failed to download";
      setError(message);
      console.error("Download error:", err);
    }
  };

  const handleDeleteVideo = (id: string) => {
    setGeneratedVideos((prev) => prev.filter((v) => v.id !== id));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 rounded-full border-4 border-muted border-t-accent-blue animate-spin mx-auto"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {error && (
        <div className="max-w-6xl mx-auto px-6 md:px-8 mt-6">
          <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            {error}
          </div>
        </div>
      )}
      <GeneratorHeader />
      <GeneratorTemplatePicker
        selectedTemplate={selectedTemplate}
        onSelectTemplate={setSelectedTemplate}
      />
      <GeneratorInputsForm
        scriptText={scriptText}
        onScriptChange={setScriptText}
        headlineText={headlineText}
        onHeadlineChange={setHeadlineText}
      />
      <VoiceoverSelector
        voices={VOICES}
        value={voiceId}
        onChange={setVoiceId}
      />
      <CaptionsSelector
        selectedStyle={selectedCaptionStyle}
        onSelectStyle={setSelectedCaptionStyle}
        enableCaptions={enableCaptions}
        onToggleCaptions={setEnableCaptions}
      />
      <GeneratorPreviewPanel
        headlineText={headlineText}
        scriptText={scriptText}
        selectedTemplate={selectedTemplate}
        selectedVoice={selectedVoice}
        selectedCaptionStyle={selectedCaptionStyle}
      />
      <GenerateBar
        onGenerate={handleGenerate}
        onGenerateBlocked={handleGenerateBlocked}
        isGenerating={isGenerating}
        creditsRemaining={creditsRemaining}
      />
      <GenerationHistoryList
        videos={generatedVideos}
        onView={handleViewVideo}
        onDownload={handleDownloadVideo}
        onDownloadBlocked={handleDownloadBlocked}
        onDelete={handleDeleteVideo}
        billingStatus={billingStatus}
      />
      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        reason={upgradeReason}
        onClose={() => setIsUpgradeModalOpen(false)}
        onSelectPlan={handleSelectPlan}
        billingStatus={billingStatus}
      />
    </div>
  );
}
