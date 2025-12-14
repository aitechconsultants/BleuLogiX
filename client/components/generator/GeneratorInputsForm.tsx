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

  const handleGenerateScript = async () => {
    setError(null);

    const scriptGenUrl = import.meta.env.VITE_SCRIPT_GEN_URL;
    if (!scriptGenUrl) {
      setError("Script generation is not connected yet.");
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
          topic: videoTopic,
          niche,
          style: styleTone,
          maxChars: 500,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `HTTP ${response.status}: ${response.statusText}`
        );
      }

      const data = await response.json();
      const generatedScript = data.script || data.text || "";

      if (!generatedScript) {
        throw new Error("No script returned from generation service.");
      }

      onScriptChange(generatedScript.slice(0, 500));
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to generate script";
      setError(errorMessage);
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
            Script / Content
          </label>
          <textarea
            value={scriptText}
            onChange={(e) => onScriptChange(e.target.value)}
            placeholder="Write your script here. The AI will create a video based on this content..."
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
      </div>
    </div>
  );
}
