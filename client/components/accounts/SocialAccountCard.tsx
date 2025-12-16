import { format } from "date-fns";
import { Trash2, RefreshCw, AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import AccountMetricsPreview from "./AccountMetricsPreview";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface SocialAccountCardProps {
  id: string;
  platform: string;
  username: string;
  followerCount: number;
  postCount: number;
  engagementRate?: number;
  lastSyncedAt?: string;
  status: "active" | "error" | "paused";
  isRefreshing?: boolean;
  onRefresh?: () => Promise<void>;
  onRemove?: () => Promise<void>;
}

const platformIcons: Record<string, string> = {
  tiktok: "🎵",
  instagram: "📸",
  youtube: "▶️",
  twitter: "𝕏",
  linkedin: "💼",
};

const platformNames: Record<string, string> = {
  tiktok: "TikTok",
  instagram: "Instagram",
  youtube: "YouTube",
  twitter: "X (Twitter)",
  linkedin: "LinkedIn",
};

export default function SocialAccountCard({
  id,
  platform,
  username,
  followerCount,
  postCount,
  engagementRate,
  lastSyncedAt,
  status,
  isRefreshing = false,
  onRefresh,
  onRemove,
}: SocialAccountCardProps) {
  const handleRefresh = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (onRefresh) {
      try {
        await onRefresh();
      } catch (error) {
        console.error("Refresh failed:", error);
      }
    }
  };

  const lastSyncTime = lastSyncedAt
    ? format(new Date(lastSyncedAt), "MMM dd, yyyy HH:mm")
    : "Never";

  const statusColor =
    status === "active"
      ? "text-green-500"
      : status === "error"
        ? "text-red-500"
        : "text-yellow-500";

  const statusIcon =
    status === "active" ? (
      <CheckCircle className={`w-4 h-4 ${statusColor}`} />
    ) : status === "error" ? (
      <AlertCircle className={`w-4 h-4 ${statusColor}`} />
    ) : null;

  return (
    <div className="p-5 rounded-lg border border-border bg-card hover:border-accent-blue/50 transition-all">
      {/* Header with platform and status */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="text-2xl">{platformIcons[platform] || "📱"}</div>
          <div>
            <p className="text-sm text-muted-foreground">
              {platformNames[platform] || platform}
            </p>
            <p className="text-lg font-semibold text-foreground">@{username}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {statusIcon}
          <span className="text-xs text-muted-foreground capitalize">
            {status}
          </span>
        </div>
      </div>

      {/* Metrics */}
      <AccountMetricsPreview
        followerCount={followerCount}
        postCount={postCount}
        engagementRate={engagementRate}
      />

      {/* Last synced */}
      <div className="mt-4 pt-4 border-t border-border">
        <p className="text-xs text-muted-foreground">
          Last synced: {lastSyncTime}
        </p>
      </div>

      {/* Actions */}
      <div className="mt-4 flex gap-2">
        <button
          onClick={handleRefresh}
          disabled={isRefreshing || status === "error"}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-muted/50 hover:bg-muted text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
        >
          {isRefreshing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Syncing...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4" />
              Refresh
            </>
          )}
        </button>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button className="flex items-center justify-center px-3 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogTitle>Remove Account</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove @{username} from {platformNames[platform]}? 
              This action cannot be undone.
            </AlertDialogDescription>
            <div className="flex gap-3 justify-end">
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={async () => {
                  if (onRemove) {
                    try {
                      await onRemove();
                    } catch (error) {
                      console.error("Remove failed:", error);
                    }
                  }
                }}
                className="bg-red-500 hover:bg-red-600"
              >
                Remove
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
