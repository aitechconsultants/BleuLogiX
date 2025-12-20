import { useEffect, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { Plus, AlertCircle, Loader2, Copy, Check } from "lucide-react";
import AddSocialAccountModal from "@/components/accounts/AddSocialAccountModal";
import SocialAccountCard from "@/components/accounts/SocialAccountCard";
import { toast } from "sonner";
import { getAffiliateProfile, AffiliateProfile } from "@/lib/affiliateApi";

interface SocialAccount {
  id: string;
  platform: string;
  username: string;
  follower_count: number;
  post_count: number;
  engagement_rate?: number;
  last_synced_at?: string;
  status: "active" | "error" | "paused";
  refresh_mode?: "manual" | "scheduled";
  refresh_interval_hours?: number;
  next_refresh_at?: string;
  oauth_connected?: boolean;
  data_source?: "public" | "oauth";
}

interface ListResponse {
  accounts: SocialAccount[];
  plan: string;
  accountLimit: number;
  accountCount: number;
}

export default function AccountHub() {
  const { isSignedIn } = useAuth();
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddingAccount, setIsAddingAccount] = useState(false);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [plan, setPlan] = useState("free");
  const [accountLimit, setAccountLimit] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [affiliateProfile, setAffiliateProfile] =
    useState<AffiliateProfile | null>(null);
  const [isLoadingAffiliate, setIsLoadingAffiliate] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Fetch accounts
  const fetchAccounts = async () => {
    if (!isSignedIn) return;

    try {
      setError(null);
      const response = await fetch("/api/social-accounts");

      if (!response.ok) {
        throw new Error("Failed to load accounts");
      }

      const data: ListResponse = await response.json();
      setAccounts(data.accounts);
      setPlan(data.plan);
      setAccountLimit(data.accountLimit);
    } catch (err) {
      const message = err instanceof Error ? err.message : "An error occurred";
      setError(message);
      toast.error(message);
      console.error("Error fetching accounts:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Load affiliate profile
  const loadAffiliateProfile = async () => {
    if (!isSignedIn) return;

    try {
      setIsLoadingAffiliate(true);
      const profile = await getAffiliateProfile();
      setAffiliateProfile(profile);
    } catch (error) {
      // Affiliate module is optional, don't show error
      console.debug("Affiliate profile not available", error);
    } finally {
      setIsLoadingAffiliate(false);
    }
  };

  const handleCopyAffiliateCode = async () => {
    if (!affiliateProfile?.affiliate_code) return;
    try {
      await navigator.clipboard.writeText(affiliateProfile.affiliate_code);
      setCopiedCode(true);
      toast.success("Affiliate code copied!");
      setTimeout(() => setCopiedCode(false), 2000);
    } catch (error) {
      toast.error("Failed to copy code");
    }
  };

  useEffect(() => {
    if (isSignedIn) {
      fetchAccounts();
      loadAffiliateProfile();
    }
  }, [isSignedIn]);

  // Add account
  const handleAddAccount = async (platform: string, username: string) => {
    setIsAddingAccount(true);
    try {
      const response = await fetch("/api/social-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, username }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to add account");
      }

      toast.success(`@${username} added successfully`);
      await fetchAccounts();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to add account";
      toast.error(message);
      throw err;
    } finally {
      setIsAddingAccount(false);
    }
  };

  // Refresh account
  const handleRefreshAccount = async (accountId: string) => {
    setRefreshingId(accountId);
    try {
      const response = await fetch(
        `/api/social-accounts/${accountId}/refresh`,
        {
          method: "POST",
        },
      );

      if (!response.ok) {
        throw new Error("Failed to refresh account");
      }

      toast.success("Account refreshed");
      await fetchAccounts();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to refresh";
      toast.error(message);
    } finally {
      setRefreshingId(null);
    }
  };

  // Remove account
  const handleRemoveAccount = async (accountId: string) => {
    try {
      const response = await fetch(`/api/social-accounts/${accountId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to remove account");
      }

      toast.success("Account removed");
      await fetchAccounts();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to remove";
      toast.error(message);
    }
  };

  // Handle OAuth connect
  const handleOAuthConnect = (accountId: string, platform: string) => {
    // TODO: Implement OAuth flow modal
    // This will open the OAuth start flow for the specified platform
    toast.info(`OAuth for ${platform} coming soon!`);
  };

  if (!isSignedIn) {
    return (
      <Layout>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <p className="text-foreground mb-4">
              Please sign in to view your accounts
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-background">
        <div className="max-w-6xl mx-auto px-4 py-12">
          {/* Header */}
          <div className="flex items-center justify-between mb-12">
            <div>
              <h1 className="text-4xl font-bold text-foreground mb-2">
                Social Account Hub
              </h1>
              <p className="text-muted-foreground">
                Manage and monitor all your social media accounts in one place
              </p>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              disabled={accounts.length >= accountLimit}
              className="flex items-center gap-2 px-6 py-3 rounded-lg bg-accent-blue text-black hover:bg-highlight-blue disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
            >
              <Plus className="w-5 h-5" />
              Add Account
            </button>
          </div>

          {/* Plan and Limits Info */}
          <div className="mb-8 p-4 rounded-lg bg-card border border-border">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Plan</p>
                <p className="text-lg font-semibold text-foreground capitalize">
                  {plan}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  Accounts ({accounts.length}/{accountLimit})
                </p>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-accent-blue h-2 rounded-full transition-all"
                    style={{
                      width: `${Math.min((accounts.length / accountLimit) * 100, 100)}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Module 2D: Affiliate Code Banner */}
          {affiliateProfile && (
            <div className="mb-8 p-6 rounded-lg bg-gradient-to-r from-accent-blue/10 to-highlight-blue/10 border border-accent-blue/30">
              <h3 className="text-lg font-semibold text-foreground mb-4">
                🎯 Affiliate Code
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Code Badge */}
                <div className="md:col-span-2">
                  <p className="text-xs text-muted-foreground mb-2">
                    Your Referral Code
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="px-4 py-2 rounded-lg bg-card border border-border text-foreground font-mono text-lg font-semibold">
                      {affiliateProfile.affiliate_code}
                    </code>
                    <button
                      onClick={handleCopyAffiliateCode}
                      className="p-2 rounded-lg bg-card hover:bg-muted border border-border transition-colors"
                      title="Copy code"
                    >
                      {copiedCode ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4 text-foreground" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Stats Grid */}
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Clicks</p>
                  <p className="text-2xl font-bold text-accent-blue">
                    {affiliateProfile.stats.clicks}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Signups</p>
                  <p className="text-2xl font-bold text-accent-blue">
                    {affiliateProfile.stats.signups}
                  </p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-xs text-muted-foreground mb-2">Revenue</p>
                  <p className="text-2xl font-bold text-accent-blue">
                    ${affiliateProfile.stats.revenue.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && !isLoading && (
            <div className="mb-8 p-4 rounded-lg bg-red-500/10 border border-red-500/30 flex gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-red-700">
                  Error loading accounts
                </p>
                <p className="text-sm text-red-600">{error}</p>
              </div>
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-accent-blue" />
            </div>
          )}

          {/* Empty State */}
          {!isLoading && accounts.length === 0 && (
            <div className="text-center py-12">
              <p className="text-lg text-muted-foreground mb-6">
                No social accounts connected yet
              </p>
              <button
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-accent-blue text-black hover:bg-highlight-blue font-medium transition-colors"
              >
                <Plus className="w-5 h-5" />
                Add Your First Account
              </button>
            </div>
          )}

          {/* Accounts Grid */}
          {!isLoading && accounts.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {accounts.map((account) => (
                <SocialAccountCard
                  key={account.id}
                  id={account.id}
                  platform={account.platform}
                  username={account.username}
                  followerCount={account.follower_count}
                  postCount={account.post_count}
                  engagementRate={account.engagement_rate}
                  lastSyncedAt={account.last_synced_at}
                  status={account.status}
                  isRefreshing={refreshingId === account.id}
                  onRefresh={() => handleRefreshAccount(account.id)}
                  onRemove={() => handleRemoveAccount(account.id)}
                  plan={plan}
                  refreshMode={account.refresh_mode}
                  refreshIntervalHours={account.refresh_interval_hours}
                  nextRefreshAt={account.next_refresh_at}
                  onRefreshSettingsUpdate={fetchAccounts}
                  oauthConnected={account.oauth_connected}
                  dataSource={account.data_source}
                  onOAuthConnect={() =>
                    handleOAuthConnect(account.id, account.platform)
                  }
                />
              ))}
            </div>
          )}

          {/* Plan upgrade hint */}
          {!isLoading &&
            accounts.length >= accountLimit &&
            plan !== "enterprise" && (
              <div className="mt-12 p-6 rounded-lg bg-accent-blue/5 border border-accent-blue/30">
                <h3 className="font-semibold text-foreground mb-2">
                  Need more accounts?
                </h3>
                <p className="text-muted-foreground mb-4">
                  Upgrade your plan to add more social accounts and unlock
                  additional features.
                </p>
                <button className="px-6 py-2 rounded-lg bg-accent-blue text-black hover:bg-highlight-blue font-medium transition-colors">
                  Upgrade Plan
                </button>
              </div>
            )}
        </div>
      </div>

      {/* Add Account Modal */}
      <AddSocialAccountModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAdd={handleAddAccount}
        isLoading={isAddingAccount}
        accountLimit={accountLimit}
        currentAccountCount={accounts.length}
      />
    </Layout>
  );
}
