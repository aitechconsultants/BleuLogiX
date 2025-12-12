import { useState } from "react";
import Layout from "@/components/Layout";
import { Download, Play, Trash2, Filter } from "lucide-react";

interface HistoryVideo {
  id: string;
  title: string;
  thumbnail: string;
  duration: number;
  status: "completed" | "rendering" | "failed";
  style: string;
  createdAt: string;
}

export default function VideoGeneratorHistory() {
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"recent" | "oldest" | "duration">(
    "recent"
  );

  const videos: HistoryVideo[] = [
    {
      id: "1",
      title: "Product Launch Announcement",
      thumbnail:
        "https://images.unsplash.com/photo-1505228395891-9a51e7e86e81?w=300&h=300&fit=crop",
      duration: 30,
      status: "completed",
      style: "UGC Testimonial",
      createdAt: "2024-01-15",
    },
    {
      id: "2",
      title: "Tutorial: Getting Started",
      thumbnail:
        "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=300&h=300&fit=crop",
      duration: 45,
      status: "completed",
      style: "Educational",
      createdAt: "2024-01-14",
    },
    {
      id: "3",
      title: "Brand Story Video",
      thumbnail:
        "https://images.unsplash.com/photo-1634712282716-8fcb23ffe313?w=300&h=300&fit=crop",
      duration: 60,
      status: "rendering",
      style: "Storytelling",
      createdAt: "2024-01-14",
    },
    {
      id: "4",
      title: "Customer Testimonial",
      thumbnail:
        "https://images.unsplash.com/photo-1516321318423-f06f70d504f0?w=300&h=300&fit=crop",
      duration: 25,
      status: "completed",
      style: "UGC Testimonial",
      createdAt: "2024-01-13",
    },
    {
      id: "5",
      title: "Motivational Montage",
      thumbnail:
        "https://images.unsplash.com/photo-1552664730-d307ca884978?w=300&h=300&fit=crop",
      duration: 40,
      status: "completed",
      style: "Motivational",
      createdAt: "2024-01-13",
    },
    {
      id: "6",
      title: "Quick Trending Video",
      thumbnail:
        "https://images.unsplash.com/photo-1633356122544-f134324ef6db?w=300&h=300&fit=crop",
      duration: 15,
      status: "failed",
      style: "Trend / Fast-Paced",
      createdAt: "2024-01-12",
    },
    {
      id: "7",
      title: "Cinematic Showcase",
      thumbnail:
        "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=300&h=300&fit=crop",
      duration: 55,
      status: "completed",
      style: "B-Roll Cinematic",
      createdAt: "2024-01-12",
    },
    {
      id: "8",
      title: "Product Demo",
      thumbnail:
        "https://images.unsplash.com/photo-1505228395891-9a51e7e86e81?w=300&h=300&fit=crop",
      duration: 35,
      status: "completed",
      style: "Product Review",
      createdAt: "2024-01-11",
    },
  ];

  const styles = [
    "UGC Testimonial",
    "Faceless Storytelling",
    "Motivational",
    "Educational",
    "Trend / Fast-Paced",
    "B-Roll Cinematic",
    "Product Review",
    "Meme Overlay",
  ];

  const statuses = ["completed", "rendering", "failed"];

  const filteredVideos = videos
    .filter((v) => !selectedStyle || v.style === selectedStyle)
    .filter((v) => !selectedStatus || v.status === selectedStatus)
    .sort((a, b) => {
      if (sortBy === "recent") {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      } else if (sortBy === "oldest") {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else {
        return b.duration - a.duration;
      }
    });

  const getStatusBadge = (status: HistoryVideo["status"]) => {
    const statusConfig = {
      completed: {
        bg: "bg-accent-blue/20",
        text: "text-accent-blue",
        label: "✓ Completed",
      },
      rendering: {
        bg: "bg-yellow-500/20",
        text: "text-yellow-400",
        label: "⏳ Rendering",
      },
      failed: {
        bg: "bg-destructive/20",
        text: "text-destructive",
        label: "✗ Failed",
      },
    };
    const config = statusConfig[status];
    return (
      <span
        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}
      >
        {config.label}
      </span>
    );
  };

  return (
    <Layout>
      <div className="min-h-screen bg-background py-12 px-4 md:px-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header */}
          <div>
            <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground">
              Video History
            </h1>
            <p className="text-muted-foreground mt-2">
              View and manage all your generated videos
            </p>
          </div>

          {/* Filters */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-accent-blue" />
              <span className="font-semibold text-foreground">Filters</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Style Filter */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground block">
                  Filter by Style
                </label>
                <select
                  value={selectedStyle || ""}
                  onChange={(e) =>
                    setSelectedStyle(e.target.value || null)
                  }
                  className="w-full px-4 py-2 rounded-lg bg-card border border-border text-foreground focus:outline-none focus:border-accent-blue"
                >
                  <option value="">All Styles</option>
                  {styles.map((style) => (
                    <option key={style} value={style}>
                      {style}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground block">
                  Filter by Status
                </label>
                <select
                  value={selectedStatus || ""}
                  onChange={(e) =>
                    setSelectedStatus(e.target.value || null)
                  }
                  className="w-full px-4 py-2 rounded-lg bg-card border border-border text-foreground focus:outline-none focus:border-accent-blue"
                >
                  <option value="">All Statuses</option>
                  {statuses.map((status) => (
                    <option key={status} value={status}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sort */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground block">
                  Sort by
                </label>
                <select
                  value={sortBy}
                  onChange={(e) =>
                    setSortBy(e.target.value as "recent" | "oldest" | "duration")
                  }
                  className="w-full px-4 py-2 rounded-lg bg-card border border-border text-foreground focus:outline-none focus:border-accent-blue"
                >
                  <option value="recent">Most Recent</option>
                  <option value="oldest">Oldest First</option>
                  <option value="duration">Longest Duration</option>
                </select>
              </div>
            </div>
          </div>

          {/* Video Grid */}
          {filteredVideos.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredVideos.map((video) => (
                <div
                  key={video.id}
                  className="group rounded-lg border border-border bg-card overflow-hidden hover:border-accent-blue/50 transition-all"
                >
                  {/* Thumbnail */}
                  <div className="relative aspect-video overflow-hidden bg-black/50">
                    <img
                      src={video.thumbnail}
                      alt={video.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                      <button className="p-3 rounded-full bg-accent-blue text-black hover:bg-highlight-blue transition-colors">
                        <Play className="w-6 h-6 fill-current" />
                      </button>
                      <button className="p-3 rounded-full bg-accent-blue text-black hover:bg-highlight-blue transition-colors">
                        <Download className="w-6 h-6" />
                      </button>
                    </div>

                    {/* Duration Badge */}
                    <div className="absolute bottom-2 right-2 px-2 py-1 rounded bg-black/60 text-white text-xs font-medium">
                      {video.duration}s
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4 space-y-3">
                    {/* Title */}
                    <div>
                      <h3 className="font-semibold text-foreground line-clamp-2">
                        {video.title}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(video.createdAt).toLocaleDateString()}
                      </p>
                    </div>

                    {/* Style Badge */}
                    <div>
                      <span className="inline-flex px-2 py-1 rounded text-xs font-medium bg-accent-blue/10 text-accent-blue border border-accent-blue/30">
                        {video.style}
                      </span>
                    </div>

                    {/* Status */}
                    <div>{getStatusBadge(video.status)}</div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      <button className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors text-xs font-medium">
                        <Play className="w-4 h-4" />
                        Preview
                      </button>
                      <button className="p-2 rounded-lg bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                        <Download className="w-4 h-4" />
                      </button>
                      <button className="p-2 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 space-y-4">
              <p className="text-muted-foreground text-lg">
                No videos match your filters
              </p>
              <button
                onClick={() => {
                  setSelectedStyle(null);
                  setSelectedStatus(null);
                }}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-accent-blue/20 text-accent-blue hover:bg-accent-blue/30 transition-colors font-medium"
              >
                Clear Filters
              </button>
            </div>
          )}

          {/* Results Count */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-card border border-border">
            <span className="text-sm text-muted-foreground">
              Showing {filteredVideos.length} video
              {filteredVideos.length !== 1 ? "s" : ""}
            </span>
            {filteredVideos.length > 0 && (
              <span className="text-xs text-muted-foreground">
                Total duration: {filteredVideos.reduce((sum, v) => sum + v.duration, 0)}s
              </span>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
