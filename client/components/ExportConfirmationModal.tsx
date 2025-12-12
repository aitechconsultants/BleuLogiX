import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertCircle, Zap } from "lucide-react";

interface ExportConfirmationModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  creditsRequired: number;
  creditsAvailable: number;
  videoTitle: string;
}

export default function ExportConfirmationModal({
  isOpen,
  onConfirm,
  onCancel,
  creditsRequired,
  creditsAvailable,
  videoTitle,
}: ExportConfirmationModalProps) {
  const hasEnoughCredits = creditsAvailable >= creditsRequired;

  return (
    <Dialog open={isOpen} onOpenChange={onCancel}>
      <DialogContent>
        <DialogHeader>
          {hasEnoughCredits ? (
            <DialogTitle className="font-display text-2xl">
              Export Video
            </DialogTitle>
          ) : (
            <DialogTitle className="font-display text-2xl text-destructive">
              Insufficient Credits
            </DialogTitle>
          )}
          <DialogDescription>
            {hasEnoughCredits
              ? `Review the details below and confirm to export your video.`
              : `You don't have enough credits to export this video.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 my-6">
          {/* Video Info */}
          <div className="p-4 rounded-lg bg-card border border-border">
            <p className="text-sm text-muted-foreground">Video Title</p>
            <p className="font-semibold text-foreground text-lg">{videoTitle}</p>
          </div>

          {/* Credit Cost */}
          <div className="space-y-3">
            <h4 className="font-semibold text-foreground flex items-center gap-2">
              <Zap className="w-5 h-5 text-accent-blue" />
              Credit Usage
            </h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <span className="text-sm text-muted-foreground">
                  Credits Required
                </span>
                <span className="font-semibold text-foreground">
                  {creditsRequired}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <span className="text-sm text-muted-foreground">
                  Credits Available
                </span>
                <span
                  className={`font-semibold ${
                    hasEnoughCredits
                      ? "text-accent-blue"
                      : "text-destructive"
                  }`}
                >
                  {creditsAvailable}
                </span>
              </div>
              {hasEnoughCredits && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-accent-blue/10 border border-accent-blue/50">
                  <span className="text-sm text-accent-blue font-medium">
                    Remaining After Export
                  </span>
                  <span className="font-semibold text-accent-blue">
                    {creditsAvailable - creditsRequired}
                  </span>
                </div>
              )}
            </div>
          </div>

          {!hasEnoughCredits && (
            <div className="flex gap-2 p-4 rounded-lg bg-destructive/10 border border-destructive/50">
              <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <div className="text-sm text-destructive">
                You need {creditsRequired - creditsAvailable} more credits to
                export this video. Please purchase additional credits or upgrade
                your plan.
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2 px-4 rounded-lg border border-border hover:bg-muted transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!hasEnoughCredits}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
              hasEnoughCredits
                ? "bg-accent-blue text-black hover:bg-highlight-blue"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            }`}
          >
            {hasEnoughCredits ? "Export Video" : "Insufficient Credits"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
