import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import {
  ArrowRight,
  Zap,
  Sparkles,
  Film,
  Users,
  Play,
  Star,
  Wand2,
  MessageCircle,
} from "lucide-react";
import { ROUTES } from "@/config/routes";

export default function Index() {
  const { isSignedIn } = useAuth();
  const navigate = useNavigate();
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const handleTryFree = () => {
    if (!isSignedIn) {
      navigate(ROUTES.login);
      return;
    }
    navigate(ROUTES.video);
  };

  const handleUpgrade = async (plan: "pro" | "enterprise") => {
    if (plan === "enterprise") {
      alert("Please contact sales@bleulogix.com for Enterprise pricing.");
      return;
    }

    try {
      setCheckoutLoading(true);
      const response = await fetch("/api/billing/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || "Failed to create checkout session");
        return;
      }

      const { url } = await response.json();
      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      alert("An error occurred. Please try again.");
      console.error(error);
    } finally {
      setCheckoutLoading(false);
    }
  };

  const templates = [
    {
      id: "ugc",
      title: "UGC Testimonial",
      description: "Authentic user reviews and feedback",
    },
    {
      id: "educational",
      title: "Educational",
      description: "Tutorial and how-to content",
    },
    {
      id: "motivational",
      title: "Motivational",
      description: "Inspirational and uplifting videos",
    },
    {
      id: "trend",
      title: "Trend / Fast-Paced",
      description: "Quick cuts with trending audio",
    },
    {
      id: "product-review",
      title: "Product Review",
      description: "Showcase your products",
    },
    {
      id: "storytelling",
      title: "Storytelling",
      description: "Narrative-driven content",
    },
    {
      id: "faceless",
      title: "Faceless Dynamic",
      description: "Content without showing faces",
    },
    {
      id: "broll-cinematic",
      title: "B-Roll Cinematic",
      description: "Professional cinematic quality",
    },
  ];

  const voices = [
    {
      name: "Alex",
      gender: "Male",
      language: "English (US)",
      tier: "free",
    },
    {
      name: "Emma",
      gender: "Female",
      language: "English (US)",
      tier: "free",
    },
    {
      name: "Oliver",
      gender: "Male",
      language: "English (UK)",
      tier: "pro",
    },
    {
      name: "Sophia",
      gender: "Female",
      language: "English (UK)",
      tier: "pro",
    },
    {
      name: "Lucas",
      gender: "Male",
      language: "Spanish",
      tier: "pro",
    },
  ];

  const captionStyles = [
    { name: "Classic", description: "Clean, minimal text" },
    { name: "Bold Outline", description: "High contrast readability" },
    { name: "Gradient", description: "Modern animated look" },
    { name: "Emoji Enhanced", description: "Add visual flair" },
  ];

  const exportFormats = [
    {
      name: "Vertical (1080x1920)",
      platforms: "TikTok, Instagram Reels, YouTube Shorts",
      icon: "📱",
    },
    {
      name: "Square (1080x1080)",
      platforms: "Instagram Feed, Pinterest",
      icon: "⬜",
    },
    {
      name: "Horizontal (1920x1080)",
      platforms: "YouTube, Desktop",
      icon: "📺",
    },
  ];

  const recentGenerations = [
    {
      title: "Product Launch",
      platform: "TikTok",
      views: "24K",
      thumbnail:
        "https://images.unsplash.com/photo-1505228395891-9a51e7e86e81?w=300&h=300&fit=crop",
    },
    {
      title: "Tutorial Guide",
      platform: "YouTube Shorts",
      views: "12K",
      thumbnail:
        "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=300&h=300&fit=crop",
    },
    {
      title: "Customer Story",
      platform: "Instagram Reel",
      views: "18K",
      thumbnail:
        "https://images.unsplash.com/photo-1516321318423-f06f70d504f0?w=300&h=300&fit=crop",
    },
  ];

  const testimonials = [
    {
      name: "Sarah M.",
      role: "Content Creator",
      quote: "BleuLogiX saved me hours of editing. Now I can post daily.",
    },
    {
      name: "James K.",
      role: "Marketing Manager",
      quote: "The quality rivals videos we used to pay agencies for.",
    },
    {
      name: "Nina P.",
      role: "E-commerce Owner",
      quote: "My product videos converted 3x better after switching to BleuLogiX.",
    },
  ];

  const pricingPlans = [
    {
      name: "Free",
      price: "$0",
      features: [
        "10 credits/month",
        "15 second max video",
        "4 basic voices",
        "Limited templates",
        "Watermarked exports",
      ],
      cta: "Get Started",
      highlighted: false,
      plan: null as any,
    },
    {
      name: "Pro",
      price: "$29",
      period: "/month",
      features: [
        "200 credits/month",
        "60 second videos",
        "All 12+ voices",
        "All templates",
        "No watermark",
        "Priority queue",
      ],
      cta: "Upgrade to Pro",
      highlighted: true,
      plan: "pro",
    },
    {
      name: "Enterprise",
      price: "Custom",
      features: [
        "Unlimited credits",
        "Team library",
        "Custom branding",
        "Dedicated AI",
        "Priority support",
        "Custom integrations",
      ],
      cta: "Contact Sales",
      highlighted: false,
      plan: "enterprise",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-24 md:pt-32 pb-20 px-4 md:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="absolute top-0 right-0 w-96 h-96 bg-accent-blue/5 rounded-full blur-3xl -z-10" />
          <div className="absolute top-20 right-10 w-80 h-80 bg-gradient-to-br from-accent-blue/10 to-highlight-blue/5 rounded-3xl blur-2xl -z-10 transform rotate-45" />

          <div className="space-y-6 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-accent-blue/30 bg-accent-blue/5 w-fit">
              <Sparkles className="w-4 h-4 text-accent-blue" />
              <span className="text-sm font-medium text-accent-blue">
                Powered by Advanced AI
              </span>
            </div>

            <div className="relative">
              <div className="absolute -inset-8 bg-gradient-to-r from-accent-blue/10 via-highlight-blue/5 to-transparent rounded-2xl blur-2xl opacity-10 -z-10" />
              <h1 className="font-display text-6xl md:text-7xl font-bold leading-[1.1]">
                <span className="text-gradient-blue">
                  Create Amazing Videos
                </span>
                <br />
                <span className="text-foreground">in Minutes, Not Hours</span>
              </h1>
            </div>

            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-3xl">
              Pick a template → Paste your script → Generate a professional video.
              No editing skills required.
            </p>

            <div className="flex flex-col sm:flex-row gap-6 pt-7">
              <button
                onClick={handleTryFree}
                className="flex items-center justify-center gap-2 px-8 py-4 rounded-lg bg-accent-blue text-black font-semibold hover:bg-highlight-blue transition-colors glow-blue text-base"
              >
                <Zap className="w-6 h-6" />
                Try Free
              </button>
              <button className="flex items-center justify-center gap-2 px-8 py-4 rounded-lg border-2 border-accent-blue/50 text-accent-blue font-semibold hover:bg-accent-blue/10 transition-colors text-base">
                <Play className="w-5 h-5" />
                Watch Demo
              </button>
            </div>

            <p className="text-sm text-muted-foreground">
              ✓ No credit card required.
            </p>

            <div className="flex flex-col md:flex-row gap-8 pt-8 md:pt-6">
              <div className="flex items-start gap-3">
                <Users className="w-5 h-5 text-accent-blue mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-widest">
                    Trusted By
                  </p>
                  <p className="font-semibold text-foreground">
                    10,000+ Creators
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Film className="w-5 h-5 text-accent-blue mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-widest">
                    Videos Generated
                  </p>
                  <p className="font-semibold text-foreground">1M+ Monthly</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Star className="w-5 h-5 text-accent-blue mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-widest">
                    Average Rating
                  </p>
                  <p className="font-semibold text-accent-blue">4.9/5.0</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Templates Section */}
      <section className="py-24 px-4 md:px-8 border-t border-border">
        <div className="max-w-6xl mx-auto space-y-16">
          <div className="text-center space-y-4">
            <h2 className="font-display text-4xl md:text-5xl font-bold text-foreground">
              8+ Professional Templates
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Choose from expertly designed templates for every content type
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {templates.map((template) => (
              <div
                key={template.id}
                className="p-6 rounded-lg border border-border bg-card/50 hover:border-accent-blue/50 transition-all space-y-3 group cursor-pointer"
              >
                <div className="w-12 h-12 rounded-lg bg-accent-blue/20 group-hover:bg-accent-blue/30 transition-colors" />
                <div>
                  <h3 className="font-display text-sm font-semibold text-foreground">
                    {template.title}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-2">
                    {template.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-center pt-8">
            <Link
              to={ROUTES.video}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-lg bg-accent-blue text-black font-semibold hover:bg-highlight-blue transition-colors glow-blue"
            >
              <Wand2 className="w-5 h-5" />
              Browse All Templates
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 px-4 md:px-8 border-t border-border">
        <div className="max-w-6xl mx-auto space-y-16">
          <div className="text-center space-y-4">
            <h2 className="font-display text-4xl md:text-5xl font-bold text-foreground">
              Three Simple Steps
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              From idea to polished video in minutes
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="relative flex flex-col items-center text-center space-y-4">
              <div className="w-20 h-20 rounded-full bg-accent-blue/20 flex items-center justify-center border-2 border-accent-blue/50">
                <span className="font-display text-3xl font-bold text-accent-blue">
                  1
                </span>
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold text-foreground text-lg">
                  Pick a Template
                </h3>
                <p className="text-sm text-muted-foreground">
                  Choose from 8+ professionally designed templates optimized for
                  your content
                </p>
              </div>
            </div>

            <div className="relative flex flex-col items-center text-center space-y-4">
              <div className="w-20 h-20 rounded-full bg-accent-blue/20 flex items-center justify-center border-2 border-accent-blue/50">
                <span className="font-display text-3xl font-bold text-accent-blue">
                  2
                </span>
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold text-foreground text-lg">
                  Paste Your Script
                </h3>
                <p className="text-sm text-muted-foreground">
                  Write or paste your script, then let AI generate the voice and
                  visuals
                </p>
              </div>
            </div>

            <div className="relative flex flex-col items-center text-center space-y-4">
              <div className="w-20 h-20 rounded-full bg-accent-blue/20 flex items-center justify-center border-2 border-accent-blue/50">
                <span className="font-display text-3xl font-bold text-accent-blue">
                  3
                </span>
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold text-foreground text-lg">
                  Generate Video
                </h3>
                <p className="text-sm text-muted-foreground">
                  Download in seconds. No watermarks on Pro. Share instantly.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Voices Section */}
      <section className="py-24 px-4 md:px-8 border-t border-border">
        <div className="max-w-6xl mx-auto space-y-16">
          <div className="text-center space-y-4">
            <h2 className="font-display text-4xl md:text-5xl font-bold text-foreground">
              12+ Premium AI Voices
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Natural-sounding voices in multiple languages
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {voices.map((voice, idx) => (
              <div
                key={idx}
                className="p-4 rounded-lg border border-border bg-card/50 hover:border-accent-blue/50 transition-all"
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-10 h-10 rounded-full bg-accent-blue/20 flex items-center justify-center">
                    <MessageCircle className="w-5 h-5 text-accent-blue" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-foreground">
                      {voice.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {voice.gender}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  {voice.language}
                </p>
                {voice.tier !== "free" && (
                  <span className="inline-flex px-2 py-1 rounded text-xs font-medium bg-accent-blue/10 text-accent-blue border border-accent-blue/30">
                    {voice.tier === "pro" ? "Pro" : "Enterprise"}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Caption Styles */}
      <section className="py-24 px-4 md:px-8 border-t border-border">
        <div className="max-w-6xl mx-auto space-y-16">
          <div className="text-center space-y-4">
            <h2 className="font-display text-4xl md:text-5xl font-bold text-foreground">
              Caption Styles
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Choose from multiple caption designs to match your brand
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {captionStyles.map((style, idx) => (
              <div
                key={idx}
                className="p-6 rounded-lg border border-border bg-card/50 hover:border-accent-blue/50 transition-all space-y-3"
              >
                <div className="w-16 h-16 rounded-lg bg-accent-blue/20 flex items-center justify-center">
                  <span className="text-2xl font-bold text-accent-blue">
                    Aa
                  </span>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">
                    {style.name}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {style.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Export Formats */}
      <section className="py-24 px-4 md:px-8 border-t border-border">
        <div className="max-w-6xl mx-auto space-y-16">
          <div className="text-center space-y-4">
            <h2 className="font-display text-4xl md:text-5xl font-bold text-foreground">
              Export to Any Platform
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Create once, share everywhere
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {exportFormats.map((format, idx) => (
              <div
                key={idx}
                className="p-8 rounded-lg border border-border bg-card/50 hover:border-accent-blue/50 transition-all space-y-4"
              >
                <div className="text-5xl">{format.icon}</div>
                <div>
                  <h3 className="font-semibold text-foreground">
                    {format.name}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    {format.platforms}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Recent Generations */}
      <section className="py-24 px-4 md:px-8 border-t border-border">
        <div className="max-w-6xl mx-auto space-y-16">
          <div className="text-center space-y-4">
            <h2 className="font-display text-4xl md:text-5xl font-bold text-foreground">
              Videos Being Created Right Now
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Join 10,000+ creators generating 1M+ videos monthly
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {recentGenerations.map((gen, idx) => (
              <div
                key={idx}
                className="rounded-lg border border-border bg-card overflow-hidden hover:border-accent-blue/50 transition-all"
              >
                <div className="relative aspect-video overflow-hidden bg-black/50">
                  <img
                    src={gen.thumbnail}
                    alt={gen.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex flex-col justify-end p-4">
                    <h3 className="font-semibold text-white">{gen.title}</h3>
                    <p className="text-xs text-gray-200 mt-1">
                      {gen.platform} · {gen.views} views
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 px-4 md:px-8 border-t border-border">
        <div className="max-w-6xl mx-auto space-y-16">
          <div className="text-center space-y-4">
            <h2 className="font-display text-4xl md:text-5xl font-bold text-foreground">
              Loved by Creators
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              See what creators are saying about BleuLogiX
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, idx) => (
              <div
                key={idx}
                className="p-6 rounded-lg border border-border bg-card/50 space-y-4"
              >
                <div className="flex gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className="w-4 h-4 fill-accent-blue text-accent-blue"
                    />
                  ))}
                </div>
                <p className="text-muted-foreground italic">
                  "{testimonial.quote}"
                </p>
                <div className="border-t border-border pt-4">
                  <p className="font-semibold text-foreground">
                    {testimonial.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {testimonial.role}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-24 px-4 md:px-8 border-t border-border">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center space-y-4">
            <h2 className="font-display text-4xl md:text-5xl font-bold text-foreground">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Start free, upgrade when you need more power
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {pricingPlans.map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-lg border-2 p-8 space-y-6 transition-all ${
                  plan.highlighted
                    ? "border-accent-blue bg-accent-blue/10"
                    : "border-border bg-card"
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="bg-accent-blue text-black text-xs font-semibold px-4 py-1 rounded-full">
                      MOST POPULAR
                    </span>
                  </div>
                )}

                <div>
                  <h3 className="font-display text-2xl font-bold text-foreground">
                    {plan.name}
                  </h3>
                  <p className="text-3xl font-bold text-accent-blue mt-2">
                    {plan.price}
                    {plan.period && (
                      <span className="text-sm font-normal text-muted-foreground">
                        {plan.period}
                      </span>
                    )}
                  </p>
                </div>

                <ul className="space-y-3">
                  {plan.features.map((feature, idx) => (
                    <li
                      key={idx}
                      className="flex items-center gap-3 text-muted-foreground"
                    >
                      <div className="w-2 h-2 rounded-full bg-accent-blue" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => {
                    if (plan.name === "Free") {
                      handleTryFree();
                    } else if (plan.plan) {
                      handleUpgrade(plan.plan);
                    }
                  }}
                  disabled={checkoutLoading && plan.plan !== null}
                  className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors ${
                    plan.highlighted
                      ? "bg-accent-blue text-black hover:bg-highlight-blue glow-blue disabled:opacity-50 disabled:cursor-not-allowed"
                      : "bg-card border border-border text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                  }`}
                >
                  {checkoutLoading && plan.plan !== null
                    ? "Loading..."
                    : plan.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 md:px-8 border-t border-border">
        <div className="max-w-4xl mx-auto">
          <div className="rounded-lg border border-accent-blue/30 bg-accent-blue/5 p-12 text-center space-y-6">
            <h2 className="font-display text-4xl font-bold text-foreground">
              Ready to Create?
            </h2>
            <p className="text-lg text-muted-foreground">
              Start creating professional videos for free. No credit card
              required.
            </p>
            <button
              onClick={handleTryFree}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-lg bg-accent-blue text-black font-semibold hover:bg-highlight-blue transition-colors glow-blue text-lg"
            >
              <Zap className="w-6 h-6" />
              Try Free Now
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
