import { useState, useEffect } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Zap } from "lucide-react";

interface CreditInfo {
  current: number;
  max: number;
  plan: "free" | "pro" | "enterprise";
}

export default function CreditsBadge() {
  const [credits, setCredits] = useState<CreditInfo>({
    current: 0,
    max: 999999,
    plan: "free",
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCredits = async () => {
      try {
        const response = await fetch("/api/generator/me");
        if (!response.ok) throw new Error("Failed to fetch credits");
        const data = await response.json();
        setCredits({
          current: data.creditsRemaining || 0,
          max: 999999,
          plan: data.plan || "free",
        });
      } catch (error) {
        console.error("Error fetching credits:", error);
        setCredits({
          current: 0,
          max: 999999,
          plan: "free",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchCredits();
  }, []);

  const creditCosts = {
    videoGeneration: 50,
    voiceGeneration: 5,
    scriptGeneration: 2,
    styleSelection: 0,
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-card border border-border hover:border-accent-blue/50 transition-colors cursor-pointer">
          <Zap className="w-4 h-4 text-accent-blue" />
          <span className="text-sm font-medium">
            {loading ? "..." : credits.current}
          </span>
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs">
        <div className="space-y-2">
          <p className="font-semibold">Credit Costs</p>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between gap-4">
              <span>Video Generation:</span>
              <span className="font-medium">{creditCosts.videoGeneration}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span>Voice Generation:</span>
              <span className="font-medium">{creditCosts.voiceGeneration}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span>Script Generation:</span>
              <span className="font-medium">
                {creditCosts.scriptGeneration}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span>Style Selection:</span>
              <span className="font-medium">Free</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground pt-2">
            Plan: <span className="capitalize font-medium">{credits.plan}</span>
          </p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
