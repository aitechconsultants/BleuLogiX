import { useState } from "react";
import { useNavigate } from "react-router-dom";
import TemplateCard from "@/components/TemplateCard";
import { Play, Download, Zap, ArrowRight } from "lucide-react";
import { ROUTES } from "@/config/routes";

interface RecentVideo {
  id: string;
  title: string;
  thumbnail: string;
  duration: number;
  status: "completed" | "rendering" | "failed";
  createdAt: string;
}

export default function VideoGenerator() {
  const navigate = useNavigate();
  const [creditsRemaining] = useState(42);

  const templates = [
    {
      id: "ugc",
      title: "UGC Testimonial",
      thumbnail:
        "https://images.unsplash.com/photo-1516321318423-f06f70d504f0?w=400&h=300&fit=crop",
    },
    {
      id: "faceless",
      title: "Faceless Storytelling",
      thumbnail:
        "https://images.unsplash.com/photo-1634712282716-8fcb23ffe313?w=400&h=300&fit=crop",
    },
    {
      id: "motivational",
      title: "Motivational",
      thumbnail:
        "https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=300&fit=crop",
    },
    {
      id: "educational",
      title: "Educational",
      thumbnail:
        "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=400&h=300&fit=crop",
    },
    {
      id: "trend",
      title: "Trend / Fast-Paced",
      thumbnail:
        "https://images.unsplash.com/photo-1633356122544-f134324ef6db?w=400&h=300&fit=crop",
    },
    {
      id: "broll",
      title: "B-Roll Cinematic",
      thumbnail:
        "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=400&h=300&fit=crop",
    },
    {
      id: "review",
      title: "Product Review",
      thumbnail:
        "https://images.unsplash.com/photo-1505228395891-9a51e7e86e81?w=400&h=300&fit=crop",
    },
    {
      id: "meme",
      title: "Meme Overlay",
      thumbnail:
        "https://images.unsplash.com/photo-1611339555312-e607c25352fa?w=400&h=300&fit=crop",
    },
  ];

  const recentVideos: RecentVideo[] = [
    {
      id: "1",
      title: "Product Launch Announcement",
      thumbnail:
        "https://images.unsplash.com/photo-1505228395891-9a51e7e86e81?w=200&h=200&fit=crop",
      duration: 30,
      status: "completed",
      createdAt: "2 hours ago",
    },
    {
      id: "2",
      title: "Tutorial: Getting Started",
      thumbnail:
        "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=200&h=200&fit=crop",
      duration: 45,
      status: "completed",
      createdAt: "5 hours ago",
    },
    {
      id: "3",
      title: "Brand Story Video",
      thumbnail:
        "https://images.unsplash.com/photo-1634712282716-8fcb23ffe313?w=200&h=200&fit=crop",
      duration: 60,
      status: "rendering",
      createdAt: "1 hour ago",
    },
    {
      id: "4",
      title: "Customer Testimonial",
      thumbnail:
        "https://images.unsplash.com/photo-1516321318423-f06f70d504f0?w=200&h=200&fit=crop",
      duration: 25,
      status: "completed",
      createdAt: "1 day ago",
    },
  ];

  const handleUseTemplate = (templateId: string) => {
    navigate(ROUTES.videoCreate, { state: { templateId } });
  };

  const getStatusBadge = (status: RecentVideo["status"]) => {
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
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 md:pt-20 pb-16 px-4 md:px-8 max-w-7xl mx-auto">
        <div className="space-y-6 max-w-2xl">
          <h1 className="font-display text-5xl md:text-6xl font-bold leading-tight">
            <span className="text-gradient-blue">Video Generator</span>
          </h1>
          <p className="text-xl text-muted-foreground leading-relaxed">
            Turn ideas into high-performance short-form videos instantly.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 pt-6">
            <button
              onClick={() => navigate("/video-generator/create")}
              className="flex items-center justify-center gap-2 px-8 py-3 rounded-lg bg-accent-blue text-black font-semibold hover:bg-highlight-blue transition-colors glow-blue"
            >
              <Zap className="w-5 h-5" />
              Create New Video
            </button>
            <a
              href="#templates"
              className="flex items-center justify-center gap-2 px-8 py-3 rounded-lg bg-card border border-accent-blue/40 text-accent-blue font-semibold hover:bg-accent-blue/10 transition-colors"
            >
              Explore Templates
              <ArrowRight className="w-5 h-5" />
            </a>
          </div>

          {/* Credits Display */}
          <div className="inline-flex items-center gap-3 px-4 py-3 rounded-lg bg-card border border-border mt-4">
            <Zap className="w-5 h-5 text-accent-blue" />
            <span className="text-foreground font-semibold">
              Credits Remaining:{" "}
              <span className="text-accent-blue">{creditsRemaining}</span>
            </span>
          </div>
        </div>
      </section>

      {/* Featured Templates Section */}
      <section
        id="templates"
        className="py-16 px-4 md:px-8 max-w-7xl mx-auto space-y-12"
      >
        <div>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-2">
            Featured Templates
          </h2>
          <p className="text-muted-foreground">
            Choose from our professionally designed templates to get started
            instantly
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {templates.map((template) => (
            <TemplateCard
              key={template.id}
              id={template.id}
              title={template.title}
              thumbnail={template.thumbnail}
              onUseTemplate={handleUseTemplate}
            />
          ))}
        </div>
      </section>

      {/* Recent Videos Section */}
      {recentVideos.length > 0 && (
        <section className="py-16 px-4 md:px-8 max-w-7xl mx-auto space-y-12 border-t border-border">
          <div>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-2">
              Recent Videos
            </h2>
            <p className="text-muted-foreground">
              Your recently generated videos and projects
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {recentVideos.map((video) => (
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
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                    <button className="p-2 rounded-full bg-accent-blue text-black hover:bg-highlight-blue transition-colors">
                      <Play className="w-6 h-6 fill-current" />
                    </button>
                    <button className="p-2 rounded-full bg-accent-blue text-black hover:bg-highlight-blue transition-colors">
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
                  <div>
                    <h3 className="font-semibold text-foreground line-clamp-2">
                      {video.title}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {video.createdAt}
                    </p>
                  </div>

                  {/* Status */}
                  <div>{getStatusBadge(video.status)}</div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <button className="flex-1 py-2 px-3 rounded-lg bg-muted/50 text-muted-foreground hover:text-foreground transition-colors text-xs font-medium">
                      Preview
                    </button>
                    <button className="flex-1 py-2 px-3 rounded-lg bg-accent-blue/20 text-accent-blue hover:bg-accent-blue/30 transition-colors text-xs font-medium">
                      Editor
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Empty State for Recent Videos */}
      {recentVideos.length === 0 && (
        <section className="py-16 px-4 md:px-8 max-w-7xl mx-auto text-center border-t border-border">
          <div className="space-y-4">
            <p className="text-muted-foreground text-lg">
              No videos yet. Create your first video to get started!
            </p>
            <button
              onClick={() => navigate("/video-generator/create")}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-accent-blue/20 text-accent-blue hover:bg-accent-blue/30 transition-colors font-medium"
            >
              <Zap className="w-5 h-5" />
              Create First Video
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
