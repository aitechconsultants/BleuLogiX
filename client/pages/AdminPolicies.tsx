import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  getPlanPolicies,
  updatePlanPolicy,
  getWorkspaceOverrides,
  updateWorkspaceOverride,
  deleteWorkspaceOverride,
  PlanPolicy,
  WorkspacePolicyOverride,
} from "@/lib/adminPoliciesApi";

export default function AdminPolicies() {
  const [policies, setPolicies] = useState<PlanPolicy[]>([]);
  const [overrides, setOverrides] = useState<WorkspacePolicyOverride[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState<string | null>(null);
  const [isDeleteing, setIsDeleting] = useState<string | null>(null);
  const [searchWorkspaceId, setSearchWorkspaceId] = useState("");
  const [isAddingOverride, setIsAddingOverride] = useState(false);
  const [editingPolicies, setEditingPolicies] = useState<
    Record<string, Partial<PlanPolicy>>
  >({});
  const [newOverride, setNewOverride] = useState<{
    workspace_id: string;
    social_accounts_limit?: number;
    allow_scheduled_refresh?: boolean;
    allow_oauth?: boolean;
  }>({
    workspace_id: "",
  });

  // Load data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [policiesData, overridesData] = await Promise.all([
        getPlanPolicies(),
        getWorkspaceOverrides(),
      ]);
      setPolicies(policiesData);
      setOverrides(overridesData);
    } catch (error) {
      toast.error("Failed to load policies");
      console.error("Error loading data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePolicyChange = (
    planKey: string,
    field: keyof PlanPolicy,
    value: any,
  ) => {
    setEditingPolicies((prev) => ({
      ...prev,
      [planKey]: {
        ...prev[planKey],
        [field]: value,
      },
    }));
  };

  const savePolicyRow = async (planKey: string) => {
    if (
      !editingPolicies[planKey] ||
      Object.keys(editingPolicies[planKey]).length === 0
    ) {
      return;
    }

    setIsSaving(planKey);
    try {
      const updatedPolicy = await updatePlanPolicy(
        planKey,
        editingPolicies[planKey],
      );
      setPolicies((prev) =>
        prev.map((p) => (p.plan_key === planKey ? updatedPolicy : p)),
      );
      setEditingPolicies((prev) => {
        const copy = { ...prev };
        delete copy[planKey];
        return copy;
      });
      toast.success(`Plan "${planKey}" updated`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save";
      toast.error(message);
    } finally {
      setIsSaving(planKey);
    }
  };

  const addWorkspaceOverride = async () => {
    if (!newOverride.workspace_id.trim()) {
      toast.error("Workspace ID is required");
      return;
    }

    setIsAddingOverride(true);
    try {
      const created = await updateWorkspaceOverride(newOverride.workspace_id, {
        social_accounts_limit: newOverride.social_accounts_limit,
        allow_scheduled_refresh: newOverride.allow_scheduled_refresh,
        allow_oauth: newOverride.allow_oauth,
      });
      setOverrides((prev) => [...prev, created]);
      setNewOverride({ workspace_id: "" });
      toast.success(
        `Override created for workspace ${newOverride.workspace_id}`,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to create override";
      toast.error(message);
    } finally {
      setIsAddingOverride(false);
    }
  };

  const removeWorkspaceOverride = async (workspaceId: string) => {
    setIsDeleting(workspaceId);
    try {
      await deleteWorkspaceOverride(workspaceId);
      setOverrides((prev) =>
        prev.filter((o) => o.workspace_id !== workspaceId),
      );
      toast.success("Override removed");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to delete";
      toast.error(message);
    } finally {
      setIsDeleting(null);
    }
  };

  const filteredOverrides = searchWorkspaceId
    ? overrides.filter((o) => o.workspace_id.includes(searchWorkspaceId))
    : overrides;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent-blue" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Admin Policies
          </h1>
          <p className="text-muted-foreground">
            Manage plan policies and workspace-level feature toggles
          </p>
        </div>

        {/* Plan Policies Section */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold text-foreground mb-6">
            Plan Policies
          </h2>
          <div className="overflow-x-auto border border-border rounded-lg">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-foreground">
                    Plan
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-foreground">
                    Accounts Limit
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-foreground">
                    Scheduled Refresh
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-foreground">
                    OAuth
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-foreground">
                    Default Interval (h)
                  </th>
                  <th className="px-4 py-3 text-center font-medium text-foreground">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {policies.map((policy) => {
                  const edited = editingPolicies[policy.plan_key];
                  const isEditing = edited && Object.keys(edited).length > 0;

                  return (
                    <tr
                      key={policy.plan_key}
                      className="border-b border-border hover:bg-muted/30"
                    >
                      {/* Plan */}
                      <td className="px-4 py-3 font-medium text-foreground capitalize">
                        {policy.plan_key}
                      </td>

                      {/* Accounts Limit */}
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          value={
                            edited?.social_accounts_limit ??
                            policy.social_accounts_limit
                          }
                          onChange={(e) =>
                            handlePolicyChange(
                              policy.plan_key,
                              "social_accounts_limit",
                              e.target.value ? parseInt(e.target.value) : 0,
                            )
                          }
                          className="w-20 px-2 py-1 rounded border border-border bg-card text-foreground text-sm"
                        />
                      </td>

                      {/* Scheduled Refresh */}
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={
                            edited?.allow_scheduled_refresh ??
                            policy.allow_scheduled_refresh
                          }
                          onChange={(e) =>
                            handlePolicyChange(
                              policy.plan_key,
                              "allow_scheduled_refresh",
                              e.target.checked,
                            )
                          }
                          className="w-4 h-4"
                        />
                      </td>

                      {/* OAuth */}
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={edited?.allow_oauth ?? policy.allow_oauth}
                          onChange={(e) =>
                            handlePolicyChange(
                              policy.plan_key,
                              "allow_oauth",
                              e.target.checked,
                            )
                          }
                          className="w-4 h-4"
                        />
                      </td>

                      {/* Default Interval */}
                      <td className="px-4 py-3">
                        <select
                          value={
                            edited?.default_refresh_interval_hours ??
                            policy.default_refresh_interval_hours
                          }
                          onChange={(e) =>
                            handlePolicyChange(
                              policy.plan_key,
                              "default_refresh_interval_hours",
                              parseInt(e.target.value),
                            )
                          }
                          className="px-2 py-1 rounded border border-border bg-card text-foreground text-sm"
                        >
                          <option value="6">6</option>
                          <option value="12">12</option>
                          <option value="24">24</option>
                        </select>
                      </td>

                      {/* Action */}
                      <td className="px-4 py-3 text-center">
                        {isEditing ? (
                          <button
                            onClick={() => savePolicyRow(policy.plan_key)}
                            disabled={isSaving === policy.plan_key}
                            className="px-3 py-1 rounded bg-accent-blue text-black text-sm font-medium hover:bg-highlight-blue disabled:opacity-50"
                          >
                            {isSaving === policy.plan_key
                              ? "Saving..."
                              : "Save"}
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Workspace Overrides Section */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-foreground">
              Workspace Overrides
            </h2>
            <Dialog>
              <DialogTrigger asChild>
                <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-blue text-black hover:bg-highlight-blue font-medium">
                  <Plus className="w-4 h-4" />
                  Add Override
                </button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Workspace Override</DialogTitle>
                  <DialogDescription>
                    Create a policy override for a specific workspace
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-foreground block mb-1">
                      Workspace ID *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., ws_123456789"
                      value={newOverride.workspace_id}
                      onChange={(e) =>
                        setNewOverride({
                          ...newOverride,
                          workspace_id: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 rounded border border-border bg-card text-foreground"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-foreground block mb-1">
                      Accounts Limit (optional)
                    </label>
                    <input
                      type="number"
                      placeholder="Leave blank for plan default"
                      value={newOverride.social_accounts_limit ?? ""}
                      onChange={(e) =>
                        setNewOverride({
                          ...newOverride,
                          social_accounts_limit: e.target.value
                            ? parseInt(e.target.value)
                            : undefined,
                        })
                      }
                      className="w-full px-3 py-2 rounded border border-border bg-card text-foreground"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="scheduled"
                      checked={newOverride.allow_scheduled_refresh ?? false}
                      onChange={(e) =>
                        setNewOverride({
                          ...newOverride,
                          allow_scheduled_refresh: e.target.checked,
                        })
                      }
                    />
                    <label
                      htmlFor="scheduled"
                      className="text-sm font-medium text-foreground"
                    >
                      Allow Scheduled Refresh
                    </label>
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="oauth"
                      checked={newOverride.allow_oauth ?? false}
                      onChange={(e) =>
                        setNewOverride({
                          ...newOverride,
                          allow_oauth: e.target.checked,
                        })
                      }
                    />
                    <label
                      htmlFor="oauth"
                      className="text-sm font-medium text-foreground"
                    >
                      Allow OAuth
                    </label>
                  </div>

                  <div className="flex gap-3 justify-end pt-4">
                    <button
                      onClick={() => {
                        setNewOverride({ workspace_id: "" });
                      }}
                      className="px-4 py-2 rounded border border-border text-foreground hover:bg-muted"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={addWorkspaceOverride}
                      disabled={isAddingOverride}
                      className="px-4 py-2 rounded bg-accent-blue text-black hover:bg-highlight-blue font-medium disabled:opacity-50"
                    >
                      {isAddingOverride ? "Creating..." : "Create"}
                    </button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Search */}
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search by workspace ID..."
              value={searchWorkspaceId}
              onChange={(e) => setSearchWorkspaceId(e.target.value)}
              className="w-full max-w-md px-3 py-2 rounded border border-border bg-card text-foreground placeholder-muted-foreground"
            />
          </div>

          {/* Overrides Table */}
          {filteredOverrides.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {overrides.length === 0
                ? "No workspace overrides yet"
                : "No results matching your search"}
            </div>
          ) : (
            <div className="overflow-x-auto border border-border rounded-lg">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium text-foreground">
                      Workspace ID
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-foreground">
                      Accounts Limit
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-foreground">
                      Scheduled Refresh
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-foreground">
                      OAuth
                    </th>
                    <th className="px-4 py-3 text-center font-medium text-foreground">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOverrides.map((override) => (
                    <tr
                      key={override.workspace_id}
                      className="border-b border-border hover:bg-muted/30"
                    >
                      <td className="px-4 py-3 font-mono text-sm text-foreground">
                        {override.workspace_id}
                      </td>
                      <td className="px-4 py-3 text-foreground">
                        {override.social_accounts_limit ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-foreground">
                        {override.allow_scheduled_refresh !== undefined
                          ? override.allow_scheduled_refresh
                            ? "✓"
                            : "✗"
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-foreground">
                        {override.allow_oauth !== undefined
                          ? override.allow_oauth
                            ? "✓"
                            : "✗"
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() =>
                            removeWorkspaceOverride(override.workspace_id)
                          }
                          disabled={isDeleteing === override.workspace_id}
                          className="p-2 text-red-500 hover:bg-red-500/10 rounded disabled:opacity-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
