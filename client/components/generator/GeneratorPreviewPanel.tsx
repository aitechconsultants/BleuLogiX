import { Play } from "lucide-react";

interface GeneratorPreviewPanelProps {
  headlineText: string;
  scriptText: string;
  selectedTemplate: string;
  selectedVoice: string;
  selectedCaptionStyle: string;
}

export default function GeneratorPreviewPanel({
  headlineText,
  scriptText,
  selectedTemplate,
  selectedVoice,
  selectedCaptionStyle,
}: GeneratorPreviewPanelProps) {
  return (
    <div className="max-w-6xl mx-auto px-6 md:px-8 py-12 border-t border-border space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-foreground mb-2">
          5. Preview
        </h2>
        <p className="text-muted-foreground">
          Here's how your video will look
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Preview Video Area */}
        <div className="rounded-lg border-2 border-border bg-card overflow-hidden">
          <div className="aspect-video bg-gradient-to-br from-accent-blue/20 to-highlight-blue/20 flex items-center justify-center relative">
            <div className="text-center space-y-4">
              <Play className="w-16 h-16 text-accent-blue mx-auto opacity-50" />
              <p className="text-muted-foreground">Video preview</p>
            </div>
          </div>
          <div className="p-4 bg-card/50 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Your video will appear here during generation
            </p>
          </div>
        </div>

        {/* Preview Settings Summary */}
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-card border border-border space-y-3">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">
                Headline
              </p>
              <p className="text-foreground font-semibold">
                {headlineText || "Add a headline..."}
              </p>
            </div>

            <div className="pt-3 border-t border-border">
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">
                Script Preview
              </p>
              <p className="text-foreground text-sm">
                {scriptText ? scriptText.substring(0, 80) : "Add your script..."}
                {scriptText.length > 80 ? "..." : ""}
              </p>
            </div>

            <div className="pt-3 border-t border-border space-y-2">
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">
                  Template
                </p>
                <p className="text-foreground text-sm capitalize">
                  {selectedTemplate.replace(/-/g, " ")}
                </p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">
                  Voice
                </p>
                <p className="text-foreground text-sm">
                  {selectedVoice.replace("voice-", "Voice ")}
                </p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">
                  Captions
                </p>
                <p className="text-foreground text-sm capitalize">
                  {selectedCaptionStyle}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
