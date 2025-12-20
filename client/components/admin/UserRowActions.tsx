import { useState } from "react";
import { MoreVertical, Trash2, Settings } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import RoleSelect from "./RoleSelect";
import PlanOverrideModal from "./PlanOverrideModal";

interface User {
  id: string;
  email: string | null;
  role: "user" | "admin" | "superadmin";
  plan_override: string | null;
  plan_override_expires_at: string | null;
  plan_override_reason: string | null;
  stripe_customer_id: string | null;
}

interface UserRowActionsProps {
  user: User;
  onRoleChange: (userId: string, role: "user" | "admin" | "superadmin") => Promise<void>;
  onSetPlanOverride: (userId: string, plan: string, expiresAt?: string, reason?: string) => Promise<void>;
  onClearPlanOverride: (userId: string) => Promise<void>;
  isLoading?: boolean;
}

export default function UserRowActions({
  user,
  onRoleChange,
  onSetPlanOverride,
  onClearPlanOverride,
  isLoading = false,
}: UserRowActionsProps) {
  const [showRoleSelect, setShowRoleSelect] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleRoleChange = async (newRole: "user" | "admin" | "superadmin") => {
    setIsProcessing(true);
    try {
      await onRoleChange(user.id, newRole);
      setShowRoleSelect(false);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSetPlanOverride = async (
    plan: string,
    expiresAt?: string,
    reason?: string
  ) => {
    setIsProcessing(true);
    try {
      await onSetPlanOverride(user.id, plan, expiresAt, reason);
      setShowPlanModal(false);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClearPlanOverride = async () => {
    setIsProcessing(true);
    try {
      await onClearPlanOverride(user.id);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      {showRoleSelect ? (
        <RoleSelect
          value={user.role}
          onValueChange={handleRoleChange}
          disabled={isProcessing || isLoading}
        />
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              disabled={isLoading}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setShowRoleSelect(true)}>
              <Settings className="h-4 w-4 mr-2" />
              Change Role
            </DropdownMenuItem>

            <DropdownMenuItem onClick={() => setShowPlanModal(true)}>
              <Settings className="h-4 w-4 mr-2" />
              Set Plan Override
            </DropdownMenuItem>

            {user.plan_override && (
              <DropdownMenuItem
                onClick={handleClearPlanOverride}
                disabled={isProcessing}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear Plan Override
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <PlanOverrideModal
        isOpen={showPlanModal}
        onClose={() => setShowPlanModal(false)}
        onSubmit={handleSetPlanOverride}
        isLoading={isProcessing}
        userEmail={user.email || "User"}
      />
    </>
  );
}
