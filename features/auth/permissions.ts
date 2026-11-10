import type { AuthUser, Role } from "./types";

export type Permission =
  | "session:manage"
  | "session:delete"
  | "match:manage"
  | "treasury:read"
  | "treasury:add"
  | "treasury:edit"
  | "admins:manage";

const MATRIX: Record<Permission, readonly Role[]> = {
  "session:manage": ["SUPERADMIN"],
  "session:delete": ["SUPERADMIN"],
  "match:manage": ["ADMIN", "SUPERADMIN"],
  "treasury:read": ["ADMIN", "SUPERADMIN"],
  "treasury:add": ["ADMIN", "SUPERADMIN"],
  "treasury:edit": ["SUPERADMIN"],
  "admins:manage": ["SUPERADMIN"],
};

export const can = (user: AuthUser | null, p: Permission): boolean =>
  !!user && MATRIX[p].includes(user.role);

