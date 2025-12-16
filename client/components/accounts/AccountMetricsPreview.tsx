import { Users, BarChart3, FileText } from "lucide-react";

interface AccountMetricsPreviewProps {
  followerCount: number;
  postCount: number;
  engagementRate?: number;
  isLoading?: boolean;
}

export default function AccountMetricsPreview({
  followerCount,
  postCount,
  engagementRate,
  isLoading = false,
}: AccountMetricsPreviewProps) {
  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + "M";
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + "K";
    }
    return num.toString();
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="h-12 bg-muted rounded animate-pulse" />
        <div className="h-12 bg-muted rounded animate-pulse" />
        <div className="h-12 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Followers */}
      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border">
        <Users className="w-5 h-5 text-accent-blue flex-shrink-0" />
        <div>
          <p className="text-xs text-muted-foreground">Followers</p>
          <p className="text-lg font-semibold text-foreground">
            {formatNumber(followerCount)}
          </p>
        </div>
      </div>

      {/* Posts */}
      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border">
        <FileText className="w-5 h-5 text-accent-blue flex-shrink-0" />
        <div>
          <p className="text-xs text-muted-foreground">Posts</p>
          <p className="text-lg font-semibold text-foreground">{postCount}</p>
        </div>
      </div>

      {/* Engagement Rate */}
      {engagementRate !== undefined && engagementRate !== null ? (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border">
          <BarChart3 className="w-5 h-5 text-accent-blue flex-shrink-0" />
          <div>
            <p className="text-xs text-muted-foreground">Engagement Rate</p>
            <p className="text-lg font-semibold text-foreground">
              {(engagementRate * 100).toFixed(2)}%
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
