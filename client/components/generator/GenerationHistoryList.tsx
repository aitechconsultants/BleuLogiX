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
  onDownload: (id: string) => void;
  onDownloadBlocked: (reason: string) => void;
  onDelete: (id: string) => void;
  isPremium?: boolean;
}

export default function GenerationHistoryList({
  videos,
  onView,
  onDownload,
  onDownloadBlocked,
  onDelete,
  isPremium = false,
}: GenerationHistoryListProps) {
  const handleDownloadClick = (id: string) => {
    if (!isPremium) {
      onDownloadBlocked(
        "Video downloads are only available with a Pro or Enterprise plan."
      );
    } else {
      onDownload(id);
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
                <button
                  onClick={() => onDownload(video.id)}
                  className="p-2 hover:bg-muted rounded transition-colors"
                  title="Download"
                >
                  <Download className="w-5 h-5 text-muted-foreground hover:text-accent-blue" />
                </button>
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
