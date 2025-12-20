import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

interface PlanOverrideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (plan: string, expiresAt?: string, reason?: string) => Promise<void>;
  isLoading?: boolean;
  userEmail?: string;
}

export default function PlanOverrideModal({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
  userEmail = "",
}: PlanOverrideModalProps) {
  const [plan, setPlan] = useState("pro");
  const [expiresAt, setExpiresAt] = useState("");
  const [reason, setReason] = useState("");

  const handleSubmit = async () => {
    await onSubmit(plan, expiresAt, reason);
    setPlan("pro");
    setExpiresAt("");
    setReason("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Set Plan Override</DialogTitle>
          <DialogDescription>
            Set a temporary plan override for {userEmail}. Active overrides take
            precedence over Stripe subscription status.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground block mb-2">
              Plan *
            </label>
            <Select value={plan} onValueChange={setPlan}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
                <SelectItem value="enterprise">Enterprise</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground block mb-2">
              Expiration Date (optional)
            </label>
            <input
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full px-3 py-2 rounded border border-border bg-card text-foreground placeholder-muted-foreground"
            />
            {expiresAt && (
              <p className="text-xs text-muted-foreground mt-1">
                Will expire on {new Date(expiresAt).toLocaleString()}
              </p>
            )}
          </div>

          <div>
            <label className="text-sm font-medium text-foreground block mb-2">
              Reason (optional)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., 'Trial extension for customer support'"
              className="w-full px-3 py-2 rounded border border-border bg-card text-foreground placeholder-muted-foreground text-sm"
              rows={3}
            />
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className="border-border"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isLoading}
              className="bg-accent-blue text-black hover:bg-highlight-blue"
            >
              {isLoading ? "Setting..." : "Set Override"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
