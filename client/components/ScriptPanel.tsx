import { useState } from "react";
import { Wand2 } from "lucide-react";

interface ScriptPanelProps {
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
  isGenerating?: boolean;
  onGenerateScript?: () => void;
  onImproveScript?: () => void;
}

export default function ScriptPanel({
  value,
  onChange,
  maxLength = 2000,
  isGenerating = false,
  onGenerateScript,
  onImproveScript,
}: ScriptPanelProps) {
  const [topic, setTopic] = useState("");
  const [niche, setNiche] = useState("");
  const [tone, setTone] = useState("");
  const wordCount = value.split(/\s+/).filter((w) => w.length > 0).length;

  return (
    <div className="space-y-4">
      {/* Topic Input for Generation */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">
          Video Topic (for script generation)
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Enter topic or idea..."
            className="flex-1 px-4 py-2 rounded-lg bg-card border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:border-accent-blue"
          />
          <button
            onClick={onGenerateScript}
            disabled={isGenerating || !topic}
            className="px-4 py-2 rounded-lg bg-accent-blue/20 text-accent-blue hover:bg-accent-blue/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center gap-2 whitespace-nowrap"
          >
            <Wand2 className={`w-4 h-4 ${isGenerating ? "animate-spin" : ""}`} />
            Generate
          </button>
        </div>
      </div>

      {/* Script Textarea */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-foreground">Script</label>
          <span className="text-xs text-muted-foreground">
            {wordCount} words / {maxLength} characters
          </span>
        </div>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value.slice(0, maxLength))}
          placeholder="Write your video script here... Make it engaging and concise."
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
