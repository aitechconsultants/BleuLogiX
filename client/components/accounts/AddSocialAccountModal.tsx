import { useState } from "react";
import { X, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface AddSocialAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (platform: string, username: string) => Promise<void>;
  isLoading?: boolean;
  accountLimit?: number;
  currentAccountCount?: number;
}

const platforms = [
  { id: "tiktok", name: "TikTok", icon: "🎵", hint: "@username or username" },
  { id: "instagram", name: "Instagram", icon: "📸", hint: "@username or username" },
  { id: "youtube", name: "YouTube", icon: "▶️", hint: "@handle or channel name" },
  { id: "twitter", name: "X (Twitter)", icon: "𝕏", hint: "@handle or handle" },
  { id: "linkedin", name: "LinkedIn", icon: "💼", hint: "profile-name" },
];

export default function AddSocialAccountModal({
  isOpen,
  onClose,
  onAdd,
  isLoading = false,
  accountLimit,
  currentAccountCount,
}: AddSocialAccountModalProps) {
  const [selectedPlatform, setSelectedPlatform] = useState<string>("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);

  const canAddMore =
    accountLimit === undefined ||
    currentAccountCount === undefined ||
    currentAccountCount < accountLimit;

  const handleAdd = async () => {
    setError(null);

    if (!selectedPlatform || !username.trim()) {
      setError("Please select a platform and enter a username");
      return;
    }

    try {
      await onAdd(selectedPlatform, username.trim());
      setSelectedPlatform("");
      setUsername("");
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to add account"
      );
    }
  };

  const selectedPlatformObj = platforms.find((p) => p.id === selectedPlatform);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Social Account</DialogTitle>
          <DialogDescription>
            {canAddMore
              ? "Connect your social media account to see your metrics"
              : `You've reached your account limit (${accountLimit})`}
          </DialogDescription>
        </DialogHeader>

        {!canAddMore && (
          <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 flex gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-yellow-700">
              Upgrade your plan to add more accounts
            </div>
          </div>
        )}

        <div className="space-y-4">
          {/* Platform Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Select Platform
            </label>
            <div className="grid grid-cols-2 gap-2">
              {platforms.map((platform) => (
                <button
                  key={platform.id}
                  onClick={() => setSelectedPlatform(platform.id)}
                  disabled={!canAddMore}
                  className={`p-3 rounded-lg border-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    selectedPlatform === platform.id
                      ? "border-accent-blue bg-accent-blue/10"
                      : "border-border hover:border-accent-blue/50 bg-card"
                  }`}
                >
                  <div className="text-2xl mb-1">{platform.icon}</div>
                  <p className="text-sm font-medium">{platform.name}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Username Input */}
          {selectedPlatform && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setError(null);
                }}
                disabled={isLoading || !canAddMore}
                placeholder={`e.g. ${selectedPlatformObj?.hint || "username"}`}
                className="w-full px-3 py-2 rounded-lg bg-card border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:border-accent-blue disabled:opacity-50"
              />
              <p className="text-xs text-muted-foreground">
                {selectedPlatformObj?.hint}
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-2">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 rounded-lg border border-border text-foreground hover:bg-muted disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={isLoading || !selectedPlatform || !username.trim() || !canAddMore}
              className="px-4 py-2 rounded-lg bg-accent-blue text-black hover:bg-highlight-blue disabled:opacity-50 font-medium transition-colors flex items-center gap-2"
            >
              {isLoading ? "Adding..." : "Add Account"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
