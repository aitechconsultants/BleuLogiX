import { useEffect, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import Layout from "@/components/Layout";
import RequireAdmin from "@/components/RequireAdmin";
import UserTable from "@/components/admin/UserTable";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  getAllUsers,
  updateUserRole,
  setPlanOverride,
  clearPlanOverride,
  User,
} from "@/lib/adminUsersApi";

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      const data = await getAllUsers();
      setUsers(data);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load users";
      toast.error(message);
      console.error("Error loading users:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      await loadUsers();
      toast.success("Users refreshed");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to refresh";
      toast.error(message);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleRoleChange = async (
    userId: string,
    role: "user" | "admin" | "superadmin",
  ) => {
    try {
      const updatedUser = await updateUserRole(userId, role);
      setUsers((prev) => prev.map((u) => (u.id === userId ? updatedUser : u)));
      toast.success("User role updated");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update role";
      toast.error(message);
    }
  };

  const handleSetPlanOverride = async (
    userId: string,
    plan: string,
    expiresAt?: string,
    reason?: string,
  ) => {
    try {
      const updatedUser = await setPlanOverride(
        userId,
        plan,
        expiresAt,
        reason,
      );
      setUsers((prev) => prev.map((u) => (u.id === userId ? updatedUser : u)));
      toast.success("Plan override set");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to set plan override";
      toast.error(message);
    }
  };

  const handleClearPlanOverride = async (userId: string) => {
    try {
      const updatedUser = await clearPlanOverride(userId);
      setUsers((prev) => prev.map((u) => (u.id === userId ? updatedUser : u)));
      toast.success("Plan override cleared");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to clear override";
      toast.error(message);
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-accent-blue" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <RequireAdmin>
        <div className="min-h-screen bg-background">
          <div className="max-w-7xl mx-auto px-4 py-12">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-2">
                <h1 className="text-4xl font-bold text-foreground">
                  Admin Users
                </h1>
                <Button
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  variant="outline"
                  size="sm"
                  className="border-border"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  {isRefreshing ? "Refreshing..." : "Refresh"}
                </Button>
              </div>
              <p className="text-muted-foreground">
                Manage user roles and subscription plans
              </p>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="p-4 rounded-lg border border-border bg-card">
                <p className="text-sm text-muted-foreground mb-1">
                  Total Users
                </p>
                <p className="text-2xl font-bold text-foreground">
                  {users.length}
                </p>
              </div>
              <div className="p-4 rounded-lg border border-border bg-card">
                <p className="text-sm text-muted-foreground mb-1">Admins</p>
                <p className="text-2xl font-bold text-foreground">
                  {
                    users.filter(
                      (u) => u.role === "admin" || u.role === "superadmin",
                    ).length
                  }
                </p>
              </div>
              <div className="p-4 rounded-lg border border-border bg-card">
                <p className="text-sm text-muted-foreground mb-1">Pro Users</p>
                <p className="text-2xl font-bold text-foreground">
                  {
                    users.filter((u) => u.effective_plan_calculated === "pro")
                      .length
                  }
                </p>
              </div>
              <div className="p-4 rounded-lg border border-border bg-card">
                <p className="text-sm text-muted-foreground mb-1">
                  Active Overrides
                </p>
                <p className="text-2xl font-bold text-foreground">
                  {users.filter((u) => u.plan_override).length}
                </p>
              </div>
            </div>

            {/* Users Table */}
            <UserTable
              users={users}
              isLoading={isRefreshing}
              onRoleChange={handleRoleChange}
              onSetPlanOverride={handleSetPlanOverride}
              onClearPlanOverride={handleClearPlanOverride}
            />
          </div>
        </div>
      </RequireAdmin>
    </Layout>
  );
}
