import { X } from "lucide-react";

interface DemoVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DemoVideoModal({
  isOpen,
  onClose,
}: DemoVideoModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg border border-border max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="font-semibold text-foreground">BleuLogiX Demo</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-auto">
          <div className="relative aspect-video bg-black/80 flex items-center justify-center">
            <video
              className="w-full h-full"
              controls
              autoPlay
              src="https://videos.pexels.com/video-files/3834504/3834504-sd_640_360_30fps.mp4"
            >
              Your browser does not support the video tag.
            </video>
          </div>

          <div className="p-6 space-y-4">
            <div>
              <h3 className="font-semibold text-foreground mb-2">
                How BleuLogiX Works
              </h3>
              <ol className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <span className="font-medium text-foreground">1.</span> Pick a
                  template that matches your content style
                </li>
                <li>
                  <span className="font-medium text-foreground">2.</span> Paste
                  your script and let AI generate the visuals
                </li>
                <li>
                  <span className="font-medium text-foreground">3.</span>{" "}
                  Download and share your professional video
                </li>
              </ol>
            </div>

            <div className="pt-4 border-t border-border">
              <p className="text-sm text-muted-foreground mb-3">
                Start creating amazing videos for free. No credit card required.
              </p>
              <button
                onClick={onClose}
                className="w-full px-4 py-2 bg-accent-blue text-black font-semibold rounded-lg hover:bg-highlight-blue transition-colors"
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
