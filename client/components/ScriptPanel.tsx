import { useState } from "react";
import { Wand2 } from "lucide-react";
import { useScriptGenApi } from "../lib/scriptGenApi";

interface ScriptPanelProps {
  value: string;
  onChange: (value: string) => void;
  topic: string;
  onTopicChange: (value: string) => void;
  niche: string;
  onNicheChange: (value: string) => void;
  tone: string;
  onToneChange: (value: string) => void;
  maxLength?: number;
  onImproveScript?: () => void;
}

export default function ScriptPanel({
  value,
  onChange,
  topic,
  onTopicChange,
  niche,
  onNicheChange,
  tone,
  onToneChange,
  maxLength = 2000,
  onImproveScript,
}: ScriptPanelProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const wordCount = value.split(/\s+/).filter((w) => w.length > 0).length;
  const scriptGenApi = useScriptGenApi();

  const handleGenerateScript = async () => {
    setError(null);
    setSuccess(false);

    if (!topic) {
      setError("Please enter a video topic to generate a script.");
      return;
    }

    setIsGenerating(true);

    try {
      const response = await scriptGenApi.generateScript({
        videoTopic: topic,
        niche: niche || "General",
        styleTone: tone || "Professional",
        maxChars: maxLength,
      });

      if (!response.ok) {
        setError(response.message || "Failed to generate script.");
        return;
      }

      if (!response.script) {
        setError("No script returned from generation service.");
        return;
      }

      const scriptText =
        typeof response.script === "string"
          ? response.script
          : response.script.script ||
            response.script.content ||
            JSON.stringify(response.script);

      if (!scriptText) {
        setError("Could not extract script from response.");
        return;
      }

      onChange(
        typeof scriptText === "string"
          ? scriptText.slice(0, maxLength)
          : String(scriptText).slice(0, maxLength),
      );
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to generate script";
      setError(errorMessage);
      console.error("Script generation exception:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Video Topic Input */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">
          Video Topic
        </label>
        <p className="text-xs text-muted-foreground">
          What is the core idea or message of the video?
        </p>
        <input
          type="text"
          value={topic}
          onChange={(e) => onTopicChange(e.target.value)}
          placeholder="e.g. Why most small businesses fail at TikTok ads"
          className="w-full px-4 py-2 rounded-lg bg-card border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:border-accent-blue"
        />
      </div>

      {/* Niche / Target Audience Input */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">
          Niche / Target Audience
        </label>
        <p className="text-xs text-muted-foreground">
          Who is this video for? Be specific.
        </p>
        <input
          type="text"
          value={niche}
          onChange={(e) => setNiche(e.target.value)}
          placeholder="e.g. Real estate agents, SaaS founders, fitness coaches, dropshippers"
          className="w-full px-4 py-2 rounded-lg bg-card border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:border-accent-blue"
        />
      </div>

      {/* Style & Tone Input */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">
          Style & Tone
        </label>
        <p className="text-xs text-muted-foreground">
          How should the video feel and sound?
        </p>
        <input
          type="text"
          value={tone}
          onChange={(e) => setTone(e.target.value)}
          placeholder="e.g. Educational and calm, High-energy and persuasive, Casual UGC-style, Luxury and premium"
          className="w-full px-4 py-2 rounded-lg bg-card border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:border-accent-blue"
        />
      </div>

      {/* Generate Button */}
      <div className="space-y-2">
        <button
          onClick={handleGenerateScript}
          disabled={isGenerating || !topic}
          className="w-full px-4 py-2 rounded-lg bg-accent-blue/20 text-accent-blue hover:bg-accent-blue/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2 whitespace-nowrap"
        >
          <Wand2 className={`w-4 h-4 ${isGenerating ? "animate-spin" : ""}`} />
          {isGenerating ? "Generating…" : "Generate"}
        </button>
        {error && (
          <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded px-3 py-2">
            {error}
          </p>
        )}
        {success && (
          <p className="text-xs text-green-400 bg-green-500/10 border border-green-500/30 rounded px-3 py-2">
            ✓ Script generated successfully
          </p>
        )}
      </div>

      {/* Script Textarea */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-foreground">
              Script (Optional)
            </label>
            <p className="text-xs text-muted-foreground mt-1">
              Leave this blank to auto-generate a script, or write your own to
              fully control the wording.
            </p>
          </div>
          <span className="text-xs text-muted-foreground">
            {wordCount} words / {maxLength} characters
          </span>
        </div>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value.slice(0, maxLength))}
          placeholder="Write your full script here if you already have one. Otherwise, we'll generate it based on the inputs above."
          className="w-full h-64 px-4 py-3 rounded-lg bg-card border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:border-accent-blue resize-none"
        />
      </div>

      {/* Improvement Button */}
      {value && (
        <button
          onClick={onImproveScript}
          disabled={isGenerating}
          className="w-full py-2 px-4 rounded-lg bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <Wand2 className={`w-4 h-4 ${isGenerating ? "animate-spin" : ""}`} />
          {isGenerating ? "Improving..." : "Improve Script"}
        </button>
      )}

      {/* Gating Notice */}
      <div className="p-3 rounded-lg bg-muted/20 border border-border text-xs text-muted-foreground">
        <p className="font-medium mb-1">Plan Limits:</p>
        <ul className="space-y-1 list-disc list-inside">
          <li>Free: Max 500 characters</li>
          <li>Pro: Max 2000 characters</li>
          <li>Enterprise: Unlimited</li>
        </ul>
      </div>
    </div>
  );
}
