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

export const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be yyyy-mm-dd");

export const loginSchema = z.object({
  username: usernameSchema,
  password: z.string().min(1, "Password is required").max(72),
});

export const changePasswordInput = z.object({
  currentPassword: z.string().min(1, "Current password is required").max(72),
  newPassword: passwordSchema,
});

export const adminCreateInput = z.object({
  username: usernameSchema,
  password: passwordSchema,
});

export const adminPasswordInput = z.object({
  password: passwordSchema,
});

export const sessionStatusSchema = z.enum(["OPEN", "CLOSED"]);

export const sessionInput = z.object({
  name: z.string().trim().min(1, "Session name is required").max(60),
  date: isoDate,
  courtCount: z.number().int().min(1).max(8),
  status: sessionStatusSchema.default("OPEN"),
  names: z.array(z.string().trim().min(1).max(40)).max(60),
});

export const sessionPatchInput = z
  .object({
    name: z.string().trim().min(1).max(60).optional(),
    date: isoDate.optional(),
    courtCount: z.number().int().min(1).max(8).optional(),
    status: sessionStatusSchema.optional(),
  })
  .refine(
    (v) =>
      v.name !== undefined ||
      v.date !== undefined ||
      v.courtCount !== undefined ||
      v.status !== undefined,
    "Provide at least one field to update",
  );

export const rosterInput = z.object({
  names: sessionInput.shape.names,
});

export const teamsSchema = z
  .tuple([
    z.tuple([z.string().min(1), z.string().min(1)]),
    z.tuple([z.string().min(1), z.string().min(1)]),
  ])
  .refine((t) => new Set(t.flat()).size === 4, "Pick 4 different players");

export const assignInput = z.object({
  target: z.discriminatedUnion("type", [
    z.object({
      type: z.literal("court"),
      courtNumber: z.number().int().min(1).max(8),
    }),
    z.object({
      type: z.literal("queue"),
    }),
  ]),
  teams: teamsSchema,
});

export const gameUpdateInput = z.object({
  teams: teamsSchema,
});

export const tickInput = z.object({
  checked: z.boolean(),
});

export const lockInput = z.object({
  locked: z.boolean(),
});

export const startInput = z.object({
  courtNumber: z.number().int().min(1).max(8),
});

export const queueOrderInput = z.object({
  gameIds: z.array(z.string().min(1)),
});

export const treasuryInput = z.object({
  type: z.enum(["INCOME", "EXPENSE"]).default("EXPENSE"),
  amount: z
    .number()
    .int("Amount must be a whole number")
    .min(1, "Amount must be at least 1")
    .max(1_000_000_000, "Amount exceeds maximum"),
  purpose: z.string().trim().min(1, "Purpose is required").max(200),
  date: isoDate,
});

export const treasuryPatchInput = z
  .object({
    type: z.enum(["INCOME", "EXPENSE"]).optional(),
    amount: z.number().int().min(1).max(1_000_000_000).optional(),
    purpose: z.string().trim().min(1).max(200).optional(),
    date: isoDate.optional(),
  })
  .refine(
    (v) =>
      v.type !== undefined ||
      v.amount !== undefined ||
      v.purpose !== undefined ||
      v.date !== undefined,
    "Provide at least one field to update",
  );

export type LoginInput = z.infer<typeof loginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordInput>;
export type AdminCreateInput = z.infer<typeof adminCreateInput>;
export type AdminPasswordInput = z.infer<typeof adminPasswordInput>;
export type SessionInput = z.infer<typeof sessionInput>;
export type SessionPatchInput = z.infer<typeof sessionPatchInput>;
export type RosterInput = z.infer<typeof rosterInput>;
export type AssignInput = z.infer<typeof assignInput>;
export type GameUpdateInput = z.infer<typeof gameUpdateInput>;
export type TickInput = z.infer<typeof tickInput>;
export type LockInput = z.infer<typeof lockInput>;
export type StartInput = z.infer<typeof startInput>;
export type QueueOrderInput = z.infer<typeof queueOrderInput>;
export type TreasuryInput = z.infer<typeof treasuryInput>;
export type TreasuryPatchInput = z.infer<typeof treasuryPatchInput>;

