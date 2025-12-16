import { useState } from "react";
import { format } from "date-fns";
import {
  Trash2,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Loader2,
  Lock,
} from "lucide-react";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";
import { updateRefreshSettings } from "@/lib/refreshSettingsApi";

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
  plan?: string;
  refreshMode?: "manual" | "scheduled";
  refreshIntervalHours?: number;
  nextRefreshAt?: string;
  onRefreshSettingsUpdate?: () => Promise<void>;
  oauthConnected?: boolean;
  dataSource?: "public" | "oauth";
  onOAuthConnect?: () => void;
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
  plan = "free",
  refreshMode = "manual",
  refreshIntervalHours = 24,
  nextRefreshAt,
  onRefreshSettingsUpdate,
  oauthConnected = false,
  dataSource = "public",
  onOAuthConnect,
}: SocialAccountCardProps) {
  const [isSavingRefreshSettings, setIsSavingRefreshSettings] = useState(false);
  const [localRefreshMode, setLocalRefreshMode] = useState(refreshMode);
  const [localRefreshInterval, setLocalRefreshInterval] =
    useState(refreshIntervalHours);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const canScheduleRefresh = plan !== "free";

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

  const handleSaveRefreshSettings = async () => {
    setIsSavingRefreshSettings(true);
    try {
      await updateRefreshSettings(id, {
        refresh_mode: localRefreshMode,
        refresh_interval_hours: localRefreshInterval,
      });
      toast.success("Refresh settings updated");
      setIsPopoverOpen(false);
      if (onRefreshSettingsUpdate) {
        await onRefreshSettingsUpdate();
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update";
      toast.error(message);
      // Revert UI
      setLocalRefreshMode(refreshMode);
      setLocalRefreshInterval(refreshIntervalHours);
    } finally {
      setIsSavingRefreshSettings(false);
    }
  };

  const lastSyncTime = lastSyncedAt
    ? format(new Date(lastSyncedAt), "MMM dd, yyyy HH:mm")
    : "Never";

  const nextRefreshTime =
    nextRefreshAt && localRefreshMode === "scheduled"
      ? format(new Date(nextRefreshAt), "MMM dd, yyyy HH:mm")
      : null;

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

  const canUseOAuth = plan !== "free" && plan !== "pro";

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

      {/* Data source badge + OAuth button */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <span
            className={`inline-block px-2 py-1 rounded text-xs font-medium ${
              dataSource === "oauth"
                ? "bg-green-500/20 text-green-700"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {dataSource === "oauth" ? "🔐 OAuth" : "📊 Public"}
          </span>
        </div>
        {!oauthConnected && (
          <button
            onClick={onOAuthConnect}
            disabled={!canUseOAuth}
            title={!canUseOAuth ? "OAuth requires Premium or Enterprise" : ""}
            className={`text-xs font-medium px-2 py-1 rounded transition-colors ${
              canUseOAuth
                ? "bg-blue-500/20 text-blue-700 hover:bg-blue-500/30"
                : "bg-gray-500/20 text-gray-600 cursor-not-allowed"
            }`}
          >
            {!canUseOAuth && <Lock className="w-3 h-3 inline mr-1" />}
            Connect OAuth
          </button>
        )}
        {oauthConnected && (
          <span className="text-xs font-medium px-2 py-1 rounded bg-green-500/20 text-green-700">
            ✓ OAuth Connected
          </span>
        )}
      </div>

      {/* Metrics */}
      <AccountMetricsPreview
        followerCount={followerCount}
        postCount={postCount}
        engagementRate={engagementRate}
      />

      {/* Auto Refresh Settings */}
      <div className="mt-4 pt-4 border-t border-border">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <p className="text-xs font-medium text-foreground">
              Auto Refresh: {localRefreshMode === "scheduled" ? "ON" : "OFF"}
            </p>
            {!canScheduleRefresh && localRefreshMode === "scheduled" && (
              <Lock className="w-3 h-3 text-yellow-500" />
            )}
          </div>
          <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
            <PopoverTrigger asChild>
              <button className="text-xs text-accent-blue hover:text-highlight-blue font-medium">
                Settings
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-64">
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-foreground block mb-2">
                    Refresh Mode
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        value="manual"
                        checked={localRefreshMode === "manual"}
                        onChange={(e) =>
                          setLocalRefreshMode(e.target.value as any)
                        }
                        className="w-4 h-4"
                      />
                      <span className="text-sm text-foreground">Manual</span>
                    </label>
                    <label
                      className={`flex items-center gap-2 cursor-pointer ${
                        !canScheduleRefresh
                          ? "opacity-50 cursor-not-allowed"
                          : ""
                      }`}
                    >
                      <input
                        type="radio"
                        value="scheduled"
                        checked={localRefreshMode === "scheduled"}
                        onChange={(e) =>
                          setLocalRefreshMode(e.target.value as any)
                        }
                        disabled={!canScheduleRefresh}
                        className="w-4 h-4"
                      />
                      <span className="text-sm text-foreground">Scheduled</span>
                      {!canScheduleRefresh && (
                        <Lock className="w-3 h-3 text-yellow-500" />
                      )}
                    </label>
                  </div>
                  {!canScheduleRefresh && (
                    <p className="text-xs text-yellow-600 mt-2">
                      Upgrade to Pro to enable scheduled refresh
                    </p>
                  )}
                </div>

                {localRefreshMode === "scheduled" && (
                  <div>
                    <label className="text-xs font-medium text-foreground block mb-2">
                      Interval (hours)
                    </label>
                    <select
                      value={localRefreshInterval}
                      onChange={(e) =>
                        setLocalRefreshInterval(parseInt(e.target.value))
                      }
                      className="w-full px-2 py-1 rounded border border-border bg-card text-foreground text-sm"
                    >
                      <option value="6">Every 6 hours</option>
                      <option value="12">Every 12 hours</option>
                      <option value="24">Every 24 hours</option>
                    </select>
                  </div>
                )}

                <div className="flex gap-2 justify-end pt-2">
                  <button
                    onClick={() => setIsPopoverOpen(false)}
                    disabled={isSavingRefreshSettings}
                    className="px-3 py-1 rounded text-sm border border-border text-foreground hover:bg-muted disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveRefreshSettings}
                    disabled={isSavingRefreshSettings}
                    className="px-3 py-1 rounded text-sm bg-accent-blue text-black hover:bg-highlight-blue disabled:opacity-50 flex items-center gap-1"
                  >
                    {isSavingRefreshSettings ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save"
                    )}
                  </button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
        {nextRefreshTime && (
          <p className="text-xs text-muted-foreground">
            Next refresh: {nextRefreshTime}
          </p>
        )}
      </div>

      {/* Last synced */}
      <div className="mt-4 pt-4 border-t border-border">
        <p className="text-xs text-muted-foreground">
          Last synced: {lastSyncTime}
        </p>
      </div>

      {/* Monetization Hint */}
      <div className="mt-4 pt-4 border-t border-border">
        <p className="text-xs text-muted-foreground">
          💰 <span className="font-medium">Monetization:</span> Set up link
          tracking in affiliate code to earn commissions
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
              Are you sure you want to remove @{username} from{" "}
              {platformNames[platform]}? This action cannot be undone.
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
