import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import GeneratorHeader from "@/components/generator/GeneratorHeader";
import GeneratorTemplatePicker from "@/components/generator/GeneratorTemplatePicker";
import GeneratorInputsForm from "@/components/generator/GeneratorInputsForm";
import VoiceoverSelector from "@/components/generator/VoiceoverSelector";
import CaptionsSelector from "@/components/generator/CaptionsSelector";
import GeneratorPreviewPanel from "@/components/generator/GeneratorPreviewPanel";
import GenerateBar from "@/components/generator/GenerateBar";
import GenerationHistoryList from "@/components/generator/GenerationHistoryList";
import UpgradeModal from "@/components/generator/UpgradeModal";

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

export default function Generator() {
  const [selectedTemplate, setSelectedTemplate] = useState("product-promo");
  const [scriptText, setScriptText] = useState("");
  const [headlineText, setHeadlineText] = useState("");
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

  const premiumAccess = billingStatus === "pro" || billingStatus === "enterprise";

  // Load initial user data and history on mount
  useEffect(() => {
    const loadUserData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch user data
        const meResponse = await fetch("/api/generator/me");
        if (!meResponse.ok) {
          throw new Error("Failed to fetch user data");
        }
        const userData: UserData = await meResponse.json();

        setCreditsRemaining(userData.creditsRemaining);
        setBillingStatus(userData.billingStatus);

        // Fetch generation history
        const historyResponse = await fetch("/api/generator/history");
        if (!historyResponse.ok) {
          throw new Error("Failed to fetch generation history");
        }
        const history: GeneratedVideo[] = await historyResponse.json();
        setGeneratedVideos(history);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load data";
        setError(message);
        console.error("Load error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadUserData();
  }, []);

  const handleGenerate = async () => {
    try {
      setIsGenerating(true);
      setError(null);

      const response = await fetch("/api/generator/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: selectedTemplate,
          voiceId: selectedVoice,
          captionStyle: selectedCaptionStyle,
          inputJson: {
            script: scriptText,
            headline: headlineText,
          },
        }),
      });

      if (response.status === 402) {
        // Insufficient credits
        const data = await response.json();
        handleGenerateBlocked(data.error);
        setIsGenerating(false);
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to generate video");
      }

      const newGeneration: GeneratedVideo = await response.json();
      setGeneratedVideos((prev) => [newGeneration, ...prev]);
      setCreditsRemaining((prev) => Math.max(0, prev - 10));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to generate video";
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

      const response = await fetch("/api/billing/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });

      if (!response.ok) {
        throw new Error("Failed to create checkout session");
      }

      const data = await response.json();

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
    quality: "watermarked" | "hd"
  ) => {
    try {
      const response = await fetch("/api/generator/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          generationId: id,
          quality,
        }),
      });

      if (response.status === 403) {
        const data = await response.json();
        handleDownloadBlocked(data.error);
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to generate download URL");
      }

      const data = await response.json();
      // In production, this would trigger a download
      console.log("Download URL:", data.url);
      window.open(data.url, "_blank");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to download";
      setError(message);
      console.error("Download error:", err);
    }
  };

  const handleDeleteVideo = (id: string) => {
    setGeneratedVideos((prev) => prev.filter((v) => v.id !== id));
  };

  return (
    <Layout>
      <div className="min-h-screen bg-background">
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
          selectedVoice={selectedVoice}
          onSelectVoice={setSelectedVoice}
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
    </Layout>
  );
}
