import { User } from "@/lib/adminUsersApi";
import UserRowActions from "./UserRowActions";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

interface UserTableProps {
  users: User[];
  isLoading?: boolean;
  onRoleChange: (userId: string, role: "user" | "admin" | "superadmin") => Promise<void>;
  onSetPlanOverride: (userId: string, plan: string, expiresAt?: string, reason?: string) => Promise<void>;
  onClearPlanOverride: (userId: string) => Promise<void>;
}

function getPlanBadgeColor(plan: string) {
  switch (plan) {
    case "enterprise":
      return "bg-purple-500/20 text-purple-300";
    case "pro":
      return "bg-blue-500/20 text-blue-300";
    default:
      return "bg-gray-500/20 text-gray-300";
  }
}

function getStatusBadgeColor(status: string | null) {
  switch (status) {
    case "active":
      return "bg-green-500/20 text-green-300";
    case "trialing":
      return "bg-blue-500/20 text-blue-300";
    case "canceled":
    case "past_due":
      return "bg-red-500/20 text-red-300";
    default:
      return "bg-gray-500/20 text-gray-300";
  }
}

function formatDate(dateString: string | null) {
  if (!dateString) return "—";
  try {
    return format(new Date(dateString), "MMM d, yyyy");
  } catch {
    return "—";
  }
}

function formatDatetime(dateString: string | null) {
  if (!dateString) return "—";
  try {
    return format(new Date(dateString), "MMM d, yyyy HH:mm");
  } catch {
    return "—";
  }
}

export default function UserTable({
  users,
  isLoading = false,
  onRoleChange,
  onSetPlanOverride,
  onClearPlanOverride,
}: UserTableProps) {
  if (users.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground border border-border rounded-lg">
        No users found
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border border-border rounded-lg">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            <th className="px-4 py-3 text-left font-medium text-foreground">
              Email
            </th>
            <th className="px-4 py-3 text-left font-medium text-foreground">
              Role
            </th>
            <th className="px-4 py-3 text-left font-medium text-foreground">
              Effective Plan
            </th>
            <th className="px-4 py-3 text-left font-medium text-foreground">
              Plan Override
            </th>
            <th className="px-4 py-3 text-left font-medium text-foreground">
              Stripe Status
            </th>
            <th className="px-4 py-3 text-left font-medium text-foreground">
              Last Active
            </th>
            <th className="px-4 py-3 text-center font-medium text-foreground">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr
              key={user.id}
              className="border-b border-border hover:bg-muted/30 transition-colors"
            >
              <td className="px-4 py-3 text-foreground">
                <div className="flex flex-col">
                  <span className="font-mono text-xs text-muted-foreground">
                    {user.email || "—"}
                  </span>
                </div>
              </td>

              <td className="px-4 py-3">
                <Badge variant="outline" className="capitalize">
                  {user.role}
                </Badge>
              </td>

              <td className="px-4 py-3">
                <Badge className={getPlanBadgeColor(user.effective_plan_calculated)}>
                  {user.effective_plan_calculated}
                </Badge>
              </td>

              <td className="px-4 py-3">
                {user.plan_override ? (
                  <div className="space-y-1">
                    <Badge
                      className={getPlanBadgeColor(user.plan_override)}
                      variant="secondary"
                    >
                      {user.plan_override}
                    </Badge>
                    {user.plan_override_expires_at && (
                      <div className="text-xs text-muted-foreground">
                        Expires: {formatDate(user.plan_override_expires_at)}
                      </div>
                    )}
                    {user.plan_override_reason && (
                      <div className="text-xs text-muted-foreground italic">
                        "{user.plan_override_reason}"
                      </div>
                    )}
                  </div>
                ) : (
                  <span className="text-muted-foreground">None</span>
                )}
              </td>

              <td className="px-4 py-3">
                {user.subscription_status ? (
                  <Badge className={getStatusBadgeColor(user.subscription_status)}>
                    {user.subscription_status}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </td>

              <td className="px-4 py-3 text-muted-foreground text-xs">
                {formatDate(user.updated_at)}
              </td>

              <td className="px-4 py-3 text-center">
                <UserRowActions
                  user={user}
                  onRoleChange={onRoleChange}
                  onSetPlanOverride={onSetPlanOverride}
                  onClearPlanOverride={onClearPlanOverride}
                  isLoading={isLoading}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
