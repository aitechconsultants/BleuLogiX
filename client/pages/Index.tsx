import { Link } from "react-router-dom";
import { ArrowRight, Zap, Sparkles, Film, Users, Play, Star } from "lucide-react";
import Layout from "@/components/Layout";

export default function Index() {
  const features = [
    {
      icon: Film,
      title: "Multi-Format Videos",
      description: "Create videos in portrait, square, or landscape formats optimized for any platform",
    },
    {
      icon: Sparkles,
      title: "AI-Powered Generation",
      description: "Turn your ideas into professional videos with our advanced AI templates and styles",
    },
    {
      icon: Zap,
      title: "Premium Voices & Effects",
      description: "Choose from 12+ professional voices and caption styles to make your content stand out",
    },
  ];

  const steps = [
    { number: 1, title: "Choose a Template", description: "Start with one of our 8 professionally designed templates" },
    { number: 2, title: "Write Your Script", description: "Create or generate a compelling script for your video" },
    { number: 3, title: "Select Your Style", description: "Pick from 8+ visual styles to match your brand" },
    { number: 4, title: "Add Voice & Captions", description: "Choose from premium voices and caption styles" },
    { number: 5, title: "Export & Share", description: "Download your video and share it anywhere" },
  ];

  return (
    <Layout>
      <div className="min-h-screen bg-background">
        {/* Hero Section */}
        <section className="relative overflow-hidden pt-32 md:pt-40 pb-20 px-4 md:px-8">
          <div className="max-w-6xl mx-auto">
            {/* Background gradient accent - right side geometric */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-accent-blue/5 rounded-full blur-3xl -z-10" />
            <div className="absolute top-20 right-10 w-80 h-80 bg-gradient-to-br from-accent-blue/10 to-highlight-blue/5 rounded-3xl blur-2xl -z-10 transform rotate-45" />

            <div className="space-y-8 max-w-3xl">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-accent-blue/30 bg-accent-blue/5 w-fit">
                <Sparkles className="w-4 h-4 text-accent-blue" />
                <span className="text-sm font-medium text-accent-blue">Powered by Advanced AI</span>
              </div>

              {/* Headline with subtle glow background */}
              <div className="relative">
                <div className="absolute -inset-8 bg-gradient-to-r from-accent-blue/10 via-highlight-blue/5 to-transparent rounded-2xl blur-2xl opacity-50 -z-10" />
                <h1 className="font-display text-6xl md:text-7xl font-bold leading-[1.1]">
                  <span className="text-gradient-blue">Create Amazing Videos</span>
                  <br />
                  <span className="text-foreground">in Minutes, Not Hours</span>
                </h1>
              </div>

              <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-3xl">
                BleuLogiX transforms your ideas into professional, engaging short-form videos with AI-powered templates, premium voices, and intelligent editing.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 pt-8">
                <Link
                  to="/video-generator"
                  className="flex items-center justify-center gap-2 px-8 py-4 rounded-lg bg-accent-blue text-black font-semibold hover:bg-highlight-blue transition-colors glow-blue text-lg"
                >
                  <Zap className="w-6 h-6" />
                  Start Creating Free
                </Link>
                <button className="flex items-center justify-center gap-2 px-8 py-4 rounded-lg border-2 border-accent-blue/50 text-accent-blue font-semibold hover:bg-accent-blue/10 transition-colors">
                  <Play className="w-5 h-5" />
                  Watch Demo
                </button>
              </div>

              {/* Microcopy */}
              <p className="text-sm text-muted-foreground">
                ✓ No credit card required.
              </p>

              {/* Trust Badges with Icons */}
              <div className="flex flex-col md:flex-row gap-8 pt-12 md:pt-8">
                <div className="flex items-start gap-3">
                  <Users className="w-5 h-5 text-accent-blue mt-0.5 flex-shrink-0" />
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-widest">Trusted By</p>
                    <p className="font-semibold text-foreground">10,000+ Creators</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Film className="w-5 h-5 text-accent-blue mt-0.5 flex-shrink-0" />
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-widest">Videos Generated</p>
                    <p className="font-semibold text-foreground">1M+ Monthly</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Star className="w-5 h-5 text-accent-blue mt-0.5 flex-shrink-0" />
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-widest">Average Rating</p>
                    <p className="font-semibold text-accent-blue">4.9/5.0</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section - Templates */}
        <section id="templates" id="features" className="py-24 px-4 md:px-8 border-t border-border">
          <div className="max-w-6xl mx-auto space-y-16">
            <div className="text-center space-y-4">
              <h2 className="font-display text-4xl md:text-5xl font-bold text-foreground">
                Everything You Need to Create
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Professional video creation tools designed for creators who want quality without complexity
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {features.map((feature, idx) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={idx}
                    className="p-8 rounded-lg border border-border bg-card/50 hover:border-accent-blue/50 transition-all space-y-4"
                  >
                    <div className="w-12 h-12 rounded-lg bg-accent-blue/20 flex items-center justify-center">
                      <Icon className="w-6 h-6 text-accent-blue" />
                    </div>
                    <h3 className="font-display text-xl font-semibold text-foreground">
                      {feature.title}
                    </h3>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section id="learn" className="py-24 px-4 md:px-8 border-t border-border">
          <div className="max-w-6xl mx-auto space-y-16">
            <div className="text-center space-y-4">
              <h2 className="font-display text-4xl md:text-5xl font-bold text-foreground">
                Simple 5-Step Process
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                From idea to polished video in just five easy steps
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 md:gap-0">
              {steps.map((step, idx) => (
                <div
                  key={step.number}
                  className="relative flex flex-col items-center text-center space-y-4"
                >
                  {/* Step Circle */}
                  <div className="w-16 h-16 rounded-full bg-accent-blue/20 flex items-center justify-center border-2 border-accent-blue/50 relative z-10">
                    <span className="font-display text-2xl font-bold text-accent-blue">
                      {step.number}
                    </span>
                  </div>

                  {/* Connector Line */}
                  {idx < steps.length - 1 && (
                    <div className="hidden md:block absolute top-8 left-[60%] w-[80%] h-1 bg-gradient-to-r from-accent-blue/50 to-transparent" />
                  )}

                  {/* Step Content */}
                  <div className="space-y-2 pt-4">
                    <h3 className="font-semibold text-foreground">{step.title}</h3>
                    <p className="text-sm text-muted-foreground">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-center pt-8">
              <Link
                to="/video-generator/create"
                className="flex items-center gap-2 px-8 py-4 rounded-lg bg-accent-blue text-black font-semibold hover:bg-highlight-blue transition-colors glow-blue"
              >
                <Zap className="w-5 h-5" />
                Start Creating Your Video
              </Link>
            </div>
          </div>
        </section>

        {/* Pricing Preview Section */}
        <section id="pricing" className="py-24 px-4 md:px-8 border-t border-border">
          <div className="max-w-6xl mx-auto space-y-12">
            <div className="text-center space-y-4">
              <h2 className="font-display text-4xl md:text-5xl font-bold text-foreground">
                Plans for Every Creator
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Start free and upgrade when you need more power
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  name: "Free",
                  price: "Free",
                  features: [
                    "10 credits/month",
                    "15 second max video",
                    "4 basic voices",
                    "Limited templates",
                    "Watermarked exports",
                  ],
                  cta: "Get Started",
                  highlighted: false,
                },
                {
                  name: "Pro",
                  price: "$29",
                  period: "/month",
                  features: [
                    "200 credits/month",
                    "60 second videos",
                    "All voices",
                    "All templates",
                    "No watermark",
                  ],
                  cta: "Upgrade to Pro",
                  highlighted: true,
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
                  ],
                  cta: "Contact Sales",
                  highlighted: false,
                },
              ].map((plan) => (
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
                    className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors ${
                      plan.highlighted
                        ? "bg-accent-blue text-black hover:bg-highlight-blue glow-blue"
                        : "bg-card border border-border text-foreground hover:bg-muted"
                    }`}
                  >
                    {plan.cta}
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
                Start creating professional videos for free. No credit card required.
              </p>
              <Link
                to="/video-generator"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-lg bg-accent-blue text-black font-semibold hover:bg-highlight-blue transition-colors glow-blue text-lg"
              >
                <Zap className="w-6 h-6" />
                Create Your First Video
              </Link>
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
}
