import { Role } from "@prisma/client";

export function isAdminRole(role: Role | string): boolean {
  return role === "OWNER" || role === "SUPER_ADMIN" || role === "ADMIN";
}

export function isSuperAdminRole(role: Role | string): boolean {
  return role === "SUPER_ADMIN";
}

export function isOwnerRole(role: Role | string): boolean {
  return role === "OWNER";
}

export function getRoleLabel(role: Role | string): string {
  switch (role) {
    case "OWNER":
      return "Owner";
    case "SUPER_ADMIN":
      return "Super Admin";
    case "ADMIN":
      return "Admin";
    case "MANAGER":
      return "Manager";
    case "MEMBER":
      return "Member";
    default:
      return String(role).toLowerCase();
  }
}
