import { useState } from "react";
import { Wand2 } from "lucide-react";

interface GeneratorInputsFormProps {
  scriptText: string;
  onScriptChange: (text: string) => void;
  headlineText: string;
  onHeadlineChange: (text: string) => void;
}

export default function GeneratorInputsForm({
  scriptText,
  onScriptChange,
  headlineText,
  onHeadlineChange,
}: GeneratorInputsFormProps) {
  const [videoTopic, setVideoTopic] = useState("");
  const [niche, setNiche] = useState("");
  const [styleTone, setStyleTone] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleGenerateScript = async () => {
    setError(null);
    setSuccess(false);

    const scriptGenUrl = import.meta.env.VITE_SCRIPT_GEN_URL;
    if (!scriptGenUrl) {
      setError("Script generation is not connected. Set VITE_SCRIPT_GEN_URL.");
      return;
    }

    if (!videoTopic) {
      setError("Please enter a video topic to generate a script.");
      return;
    }

    setIsGenerating(true);

    try {
      const response = await fetch(scriptGenUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          videoTopic,
          niche,
          styleTone,
          maxChars: 500,
        }),
      });

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorData = await response.json();
          if (errorData.error) {
            errorMessage = errorData.error;
          }
        } catch {
          console.error("Failed to parse error response", response);
        }
        console.error("Script generation error:", errorMessage);
        setError(errorMessage);
        return;
      }

      const data = await response.json();
      let script = data.script || data.text || "";

      if (!script) {
        setError("No script returned from generation service.");
        return;
      }

      onScriptChange(script.slice(0, 500));
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
    <div className="max-w-6xl mx-auto px-6 md:px-8 py-12 border-t border-border space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-foreground mb-2">
          2. Add Your Content
        </h2>
        <p className="text-muted-foreground">
          Provide your script and headline
        </p>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-semibold text-foreground mb-2">
            Video Topic
          </label>
          <p className="text-xs text-muted-foreground mb-2">
            What is the core idea or message of the video?
          </p>
          <input
            type="text"
            value={videoTopic}
            onChange={(e) => setVideoTopic(e.target.value)}
            placeholder="e.g., Why most small businesses fail at TikTok ads"
            className="w-full px-4 py-3 rounded-lg bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-foreground mb-2">
            Niche / Target Audience
          </label>
          <p className="text-xs text-muted-foreground mb-2">
            Who is this video for? Be specific.
          </p>
          <input
            type="text"
            value={niche}
            onChange={(e) => setNiche(e.target.value)}
            placeholder="e.g., Real estate agents, SaaS founders, fitness coaches, dropshippers"
            className="w-full px-4 py-3 rounded-lg bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-foreground mb-2">
            Style & Tone
          </label>
          <p className="text-xs text-muted-foreground mb-2">
            How should the video feel and sound?
          </p>
          <input
            type="text"
            value={styleTone}
            onChange={(e) => setStyleTone(e.target.value)}
            placeholder="e.g., Educational and calm, High-energy and persuasive, Casual UGC-style"
            className="w-full px-4 py-3 rounded-lg bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-foreground mb-2">
            Headline
          </label>
          <input
            type="text"
            value={headlineText}
            onChange={(e) => onHeadlineChange(e.target.value)}
            placeholder="e.g., Introducing BleuLogix Pro"
            className="w-full px-4 py-3 rounded-lg bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-foreground mb-2">
            Script / Content (Optional)
          </label>
          <p className="text-xs text-muted-foreground mb-2">
            Leave this blank to auto-generate a script, or write your own to fully control the wording.
          </p>
          <textarea
            value={scriptText}
            onChange={(e) => onScriptChange(e.target.value)}
            placeholder="Write your script here, or use the Generate button to create one automatically..."
            rows={6}
            className="w-full px-4 py-3 rounded-lg bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue resize-none"
          />
          <div className="flex justify-between items-center mt-2">
            <p className="text-xs text-muted-foreground">
              {scriptText.length} characters
            </p>
            <p className="text-xs text-muted-foreground">
              Max 500 characters for best results
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <button
            onClick={handleGenerateScript}
            disabled={isGenerating || !videoTopic}
            className="w-full px-4 py-2 rounded-lg bg-accent-blue/20 text-accent-blue hover:bg-accent-blue/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
          >
            <Wand2 className={`w-4 h-4 ${isGenerating ? "animate-spin" : ""}`} />
            {isGenerating ? "Generating…" : "Generate Script"}
          </button>
          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded px-3 py-2">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
