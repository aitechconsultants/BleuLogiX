import { X, Check, Loader } from "lucide-react";

interface Plan {
  name: string;
  price: string;
  credits: number;
  features: string[];
}

interface UpgradeModalProps {
  isOpen: boolean;
  reason: string;
  onClose: () => void;
  onSelectPlan: (plan: string) => void;
  billingStatus: "free" | "checkout_pending" | "pro" | "enterprise";
}

const PLANS: Record<string, Plan> = {
  pro: {
    name: "Pro",
    price: "$29/month",
    credits: 500,
    features: [
      "500 credits/month",
      "60-second videos",
      "All templates & voices",
      "Priority support",
      "No watermark",
    ],
  },
  enterprise: {
    name: "Enterprise",
    price: "Custom pricing",
    credits: 9999,
    features: [
      "Unlimited credits",
      "Team library",
      "Custom branding",
      "Dedicated account manager",
      "API access",
    ],
  },
};

export default function UpgradeModal({
  isOpen,
  reason,
  onClose,
  onSelectPlan,
  billingStatus,
}: UpgradeModalProps) {
  if (!isOpen) return null;

  const isCheckingOut = billingStatus === "checkout_pending";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-card border-2 border-border rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border px-8 py-6 flex items-center justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold text-foreground">
              You're out of credits
            </h2>
            <p className="text-sm text-muted-foreground mt-1">{reason}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors flex-shrink-0"
          >
            <X className="w-6 h-6 text-muted-foreground" />
          </button>
        </div>

        {/* Plans */}
        <div className="p-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.entries(PLANS).map(([key, plan]) => (
              <div
                key={key}
                className="rounded-lg border-2 border-border bg-card/50 p-6 space-y-6 hover:border-accent-blue/50 transition-all"
              >
                <div>
                  <h3 className="font-display text-2xl font-bold text-foreground">
                    {plan.name}
                  </h3>
                  <p className="text-3xl font-bold text-accent-blue mt-2">
                    {plan.price}
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    {plan.credits} credits/month
                  </p>
                </div>

                <ul className="space-y-3">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-3 text-sm">
                      <Check className="w-4 h-4 text-accent-blue flex-shrink-0" />
                      <span className="text-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => {
                    onSelectPlan(key);
                    onClose();
                  }}
                  className="w-full py-3 px-4 rounded-lg font-semibold transition-all bg-accent-blue text-black hover:bg-highlight-blue glow-blue"
                >
                  Choose {plan.name}
                </button>
              </div>
            ))}
          </div>

          <div className="p-4 rounded-lg bg-accent-blue/10 border border-accent-blue/30 text-center">
            <p className="text-sm text-foreground">
              Need a custom solution?{" "}
              <button className="font-semibold text-accent-blue hover:underline">
                Contact sales
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
