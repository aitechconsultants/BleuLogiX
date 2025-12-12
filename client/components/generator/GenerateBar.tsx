import { Zap, Loader } from "lucide-react";

interface GenerateBarProps {
  onGenerate: () => void;
  onGenerateBlocked: (reason: string) => void;
  isGenerating: boolean;
  creditsRemaining: number;
}

export default function GenerateBar({
  onGenerate,
  onGenerateBlocked,
  isGenerating,
  creditsRemaining,
}: GenerateBarProps) {
  const creditCost = 10;
  const canGenerate = creditsRemaining >= creditCost && !isGenerating;

  const handleGenerateClick = () => {
    if (creditsRemaining < creditCost) {
      onGenerateBlocked(
        `Video generation costs ${creditCost} credits. You have ${creditsRemaining} credits remaining.`
      );
    } else {
      onGenerate();
    }
  };

  return (
    <div className="sticky bottom-0 border-t border-border bg-card/95 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto px-6 md:px-8 py-6 flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Credits required</p>
          <div className="flex items-center gap-2">
            <div className="w-48 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full ${
                  creditsRemaining >= creditCost
                    ? "bg-accent-blue"
                    : "bg-red-500/70"
                }`}
                style={{
                  width: `${Math.min((creditsRemaining / 100) * 100, 100)}%`,
                }}
              />
            </div>
            <span className="text-sm font-semibold text-foreground">
              {creditsRemaining}/{creditCost}
            </span>
          </div>
        </div>

        <button
          onClick={onGenerate}
          disabled={!canGenerate}
          className={`flex items-center gap-2 px-8 py-3 rounded-lg font-semibold transition-all ${
            canGenerate
              ? "bg-accent-blue text-black hover:bg-highlight-blue glow-blue cursor-pointer"
              : "bg-muted text-muted-foreground cursor-not-allowed"
          }`}
        >
          {isGenerating ? (
            <>
              <Loader className="w-5 h-5 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Zap className="w-5 h-5" />
              Generate Video
            </>
          )}
        </button>
      </div>
    </div>
  );
}
