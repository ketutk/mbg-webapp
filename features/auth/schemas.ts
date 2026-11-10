import { z } from "zod";

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(
    /^[a-z0-9_.-]{3,32}$/,
    "Username must be 3–32 characters (a-z, 0-9, _, ., -)",
  );

export const passwordSchema = z
  .string()
  .min(10, "Password must be at least 10 characters")
  .refine(
    (v) => new TextEncoder().encode(v).length <= 72,
    "Max 72 bytes (bcrypt limit)",
  );

export const loginSchema = z.object({
  username: usernameSchema,
  password: z.string().min(1, "Password is required").max(72),
});

export const changePasswordInput = z.object({
  currentPassword: z.string().min(1, "Current password is required").max(72),
  newPassword: passwordSchema,
});

export type LoginInput = z.infer<typeof loginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordInput>;

