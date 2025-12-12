import { Download, Eye, Trash2, Clock } from "lucide-react";

interface GeneratedVideo {
  id: string;
  headline: string;
  template: string;
  createdAt: Date;
  status: "completed" | "failed";
}

interface GenerationHistoryListProps {
  videos: GeneratedVideo[];
  onView: (id: string) => void;
  onDownload: (id: string, quality: "watermarked" | "hd") => void;
  onDownloadBlocked: (reason: string) => void;
  onDelete: (id: string) => void;
  billingStatus: "free" | "checkout_pending" | "pro" | "enterprise";
}

export default function GenerationHistoryList({
  videos,
  onView,
  onDownload,
  onDownloadBlocked,
  onDelete,
  billingStatus,
}: GenerationHistoryListProps) {
  const isPremium = billingStatus === "pro" || billingStatus === "enterprise";

  const handleDownloadWatermarked = (id: string) => {
    onDownload(id, "watermarked");
  };

  const handleDownloadHD = (id: string) => {
    if (!isPremium) {
      onDownloadBlocked(
        "HD downloads without watermark are only available with a Pro or Enterprise plan."
      );
    } else {
      onDownload(id, "hd");
    }
  };
  if (videos.length === 0) {
    return (
      <div className="max-w-6xl mx-auto px-6 md:px-8 py-12 border-t border-border space-y-6">
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground mb-2">
            Generation History
          </h2>
          <p className="text-muted-foreground">
            Your generated videos will appear here
          </p>
        </div>

        <div className="p-12 text-center rounded-lg border-2 border-dashed border-border">
          <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <p className="text-muted-foreground">
            No videos generated yet. Create your first video above!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 md:px-8 py-12 border-t border-border space-y-6 pb-24">
      <div>
        <h2 className="font-display text-2xl font-bold text-foreground mb-2">
          Generation History
        </h2>
        <p className="text-muted-foreground">
          Your recently generated videos
        </p>
      </div>

      <div className="space-y-3">
        {videos.map((video) => (
          <div
            key={video.id}
            className="p-4 rounded-lg border border-border bg-card hover:border-accent-blue/50 transition-all"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground truncate">
                  {video.headline || "Untitled Video"}
                </h3>
                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                  <span className="capitalize">{video.template.replace(/-/g, " ")}</span>
                  <span>
                    {video.createdAt.toLocaleDateString()} at{" "}
                    {video.createdAt.toLocaleTimeString()}
                  </span>
                  <span
                    className={`px-2 py-1 rounded text-xs font-semibold ${
                      video.status === "completed"
                        ? "bg-green-500/20 text-green-400"
                        : "bg-red-500/20 text-red-400"
                    }`}
                  >
                    {video.status === "completed" ? "✓ Done" : "✗ Failed"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => onView(video.id)}
                  className="p-2 hover:bg-muted rounded transition-colors"
                  title="View"
                >
                  <Eye className="w-5 h-5 text-muted-foreground hover:text-accent-blue" />
                </button>

                {/* Download dropdown menu */}
                <div className="relative group">
                  <button
                    className="p-2 hover:bg-muted rounded transition-colors"
                    title="Download options"
                  >
                    <Download className="w-5 h-5 text-muted-foreground hover:text-accent-blue" />
                  </button>

                  <div className="absolute right-0 mt-0 w-56 bg-card border-2 border-border rounded-lg shadow-lg hidden group-hover:block z-10">
                    <button
                      onClick={() => handleDownloadWatermarked(video.id)}
                      className="w-full text-left px-4 py-3 hover:bg-muted transition-colors border-b border-border first:rounded-t-md"
                    >
                      <p className="font-semibold text-foreground text-sm">
                        Download Preview
                      </p>
                      <p className="text-xs text-muted-foreground">
                        720p + watermark
                      </p>
                    </button>

                    <button
                      onClick={() => handleDownloadHD(video.id)}
                      disabled={!isPremium}
                      className={`w-full text-left px-4 py-3 transition-colors last:rounded-b-md ${
                        isPremium
                          ? "hover:bg-muted cursor-pointer"
                          : "cursor-not-allowed opacity-50"
                      }`}
                    >
                      <p className="font-semibold text-foreground text-sm">
                        Download HD
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {isPremium
                          ? "1080p + no watermark"
                          : "Pro/Enterprise only"}
                      </p>
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => onDelete(video.id)}
                  className="p-2 hover:bg-muted rounded transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-5 h-5 text-muted-foreground hover:text-red-400" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
