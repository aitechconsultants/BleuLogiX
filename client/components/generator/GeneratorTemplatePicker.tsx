import { useState } from "react";
import { Film } from "lucide-react";

interface Template {
  id: string;
  name: string;
  description: string;
  icon: "film" | "sparkles" | "zap";
}

const TEMPLATES: Template[] = [
  {
    id: "product-promo",
    name: "Product Promo",
    description: "Showcase your product features in 30 seconds",
    icon: "sparkles",
  },
  {
    id: "social-media",
    name: "Social Media Ad",
    description: "Perfect for Instagram Reels and TikTok",
    icon: "film",
  },
  {
    id: "testimonial",
    name: "Customer Testimonial",
    description: "Share customer success stories",
    icon: "zap",
  },
  {
    id: "educational",
    name: "Educational",
    description: "Explain concepts and tutorials",
    icon: "film",
  },
];

interface GeneratorTemplatePickerProps {
  selectedTemplate: string;
  onSelectTemplate: (id: string) => void;
}

export default function GeneratorTemplatePicker({
  selectedTemplate,
  onSelectTemplate,
}: GeneratorTemplatePickerProps) {
  return (
    <div className="max-w-6xl mx-auto px-6 md:px-8 py-12 space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-foreground mb-2">
          1. Choose a Template
        </h2>
        <p className="text-muted-foreground">
          Select a template that matches your content type
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {TEMPLATES.map((template) => (
          <button
            key={template.id}
            onClick={() => onSelectTemplate(template.id)}
            className={`p-6 rounded-lg border-2 transition-all text-left ${
              selectedTemplate === template.id
                ? "border-accent-blue bg-accent-blue/10"
                : "border-border bg-card hover:border-accent-blue/50"
            }`}
          >
            <div className="flex items-start gap-4">
              <Film className="w-6 h-6 text-accent-blue mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-foreground">{template.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {template.description}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
