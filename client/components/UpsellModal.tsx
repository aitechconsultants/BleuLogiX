import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Check } from "lucide-react";

interface UpsellModalProps {
  isOpen: boolean;
  onClose: () => void;
  feature: string;
  currentPlan: string;
}

export default function UpsellModal({
  isOpen,
  onClose,
  feature,
  currentPlan,
}: UpsellModalProps) {
  const plans = [
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
      cta: "Current Plan",
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
        "Priority support",
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
        "SSO & Advanced controls",
      ],
      cta: "Contact Sales",
      highlighted: false,
    },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            Unlock {feature}
          </DialogTitle>
          <DialogDescription>
            Upgrade your plan to access premium features and create unlimited
            content
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-lg border-2 p-6 transition-all ${
                plan.highlighted
                  ? "border-accent-blue bg-accent-blue/10 md:scale-105"
                  : "border-border bg-card"
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-accent-blue text-black text-xs font-semibold px-3 py-1 rounded-full">
                    MOST POPULAR
                  </span>
                </div>
              )}

              <div className="mb-6">
                <h3 className="font-display font-semibold text-xl text-foreground">
                  {plan.name}
                </h3>
                <p className="text-2xl font-bold text-accent-blue mt-2">
                  {plan.price}
                  {plan.period && (
                    <span className="text-sm font-normal text-muted-foreground">
                      {plan.period}
                    </span>
                  )}
                </p>
              </div>

              <ul className="space-y-3 mb-6">
                {plan.features.map((feature, idx) => (
                  <li
                    key={idx}
                    className="flex items-center gap-2 text-sm text-muted-foreground"
                  >
                    <Check className="w-4 h-4 text-accent-blue flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
                  plan.name === currentPlan
                    ? "bg-muted text-muted-foreground cursor-not-allowed"
                    : plan.highlighted
                      ? "bg-accent-blue text-black hover:bg-highlight-blue"
                      : "bg-accent-blue/20 text-accent-blue hover:bg-accent-blue/30"
                }`}
              >
                {plan.cta}
              </button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
