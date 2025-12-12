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
  headline: string;
  template: string;
  createdAt: Date;
  status: "completed" | "failed";
}

export default function Generator() {
  const [selectedTemplate, setSelectedTemplate] = useState("product-promo");
  const [scriptText, setScriptText] = useState("");
  const [headlineText, setHeadlineText] = useState("");
  const [selectedVoice, setSelectedVoice] = useState("voice-1");
  const [enableCaptions, setEnableCaptions] = useState(true);
  const [selectedCaptionStyle, setSelectedCaptionStyle] = useState("classic");
  const [isGenerating, setIsGenerating] = useState(false);
  const [creditsRemaining, setCreditsRemaining] = useState(42);
  const [generatedVideos, setGeneratedVideos] = useState<GeneratedVideo[]>([]);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState("");
  const [billingStatus, setBillingStatus] = useState<
    "free" | "checkout_pending" | "pro" | "enterprise"
  >("free");

  const premiumAccess = billingStatus === "pro" || billingStatus === "enterprise";

  const handleGenerate = () => {
    setIsGenerating(true);
    setCreditsRemaining((prev) => Math.max(0, prev - 10));

    setTimeout(() => {
      const newVideo: GeneratedVideo = {
        id: `video-${Date.now()}`,
        headline: headlineText || "Untitled",
        template: selectedTemplate,
        createdAt: new Date(),
        status: "completed",
      };

      setGeneratedVideos((prev) => [newVideo, ...prev]);
      setIsGenerating(false);
    }, 3000);
  };

  const handleGenerateBlocked = (reason: string) => {
    setUpgradeReason(reason);
    setIsUpgradeModalOpen(true);
  };

  const handleDownloadBlocked = (reason: string) => {
    setUpgradeReason(reason);
    setIsUpgradeModalOpen(true);
  };

  const handleSelectPlan = (plan: string) => {
    // Simulate checkout flow
    setBillingStatus("checkout_pending");

    // Simulate 3-second checkout redirect and completion
    setTimeout(() => {
      if (plan === "pro") {
        setBillingStatus("pro");
        setCreditsRemaining(500);
      } else if (plan === "enterprise") {
        setBillingStatus("enterprise");
        setCreditsRemaining(9999);
      }
      setIsUpgradeModalOpen(false);
    }, 3000);
  };

  const handleViewVideo = (id: string) => {
    console.log("View video:", id);
  };

  const handleDownloadVideo = (id: string) => {
    console.log("Download video:", id);
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
