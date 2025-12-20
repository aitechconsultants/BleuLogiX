import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface RoleSelectProps {
  value: "user" | "admin" | "superadmin";
  onValueChange: (value: "user" | "admin" | "superadmin") => void;
  disabled?: boolean;
}

export default function RoleSelect({
  value,
  onValueChange,
  disabled = false,
}: RoleSelectProps) {
  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger className="w-32">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="user">User</SelectItem>
        <SelectItem value="admin">Admin</SelectItem>
        <SelectItem value="superadmin">Superadmin</SelectItem>
      </SelectContent>
    </Select>
  );
}
