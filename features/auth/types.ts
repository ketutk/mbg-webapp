export interface AuthUser {
  id: string;
  username: string;
  role: Role;
}

export type Role = "SUPERADMIN" | "ADMIN";

