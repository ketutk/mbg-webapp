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

export const playerPaidInput = z.object({
  paid: z.boolean(),
});

export const playerTierLevelSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
]);

export const playerTierInput = z.object({
  tier: playerTierLevelSchema.nullable(),
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

export const finishMatchInput = z
  .object({
    scoreA: z
      .number()
      .int("Score must be a whole number")
      .min(0, "Score cannot be negative")
      .max(99, "Score max is 99"),
    scoreB: z
      .number()
      .int("Score must be a whole number")
      .min(0, "Score cannot be negative")
      .max(99, "Score max is 99"),
  })
  .refine((v) => v.scoreA !== v.scoreB, {
    message: "Scores cannot be tied — enter a winning score",
    path: ["scoreB"],
  });

export const treasuryCategoryInput = z.object({
  name: z.string().trim().min(1, "Category name is required").max(40),
  type: z.enum(["INCOME", "EXPENSE"]).nullable().optional().default(null),
});

export const treasuryCategoryPatchInput = z
  .object({
    name: z.string().trim().min(1, "Category name is required").max(40).optional(),
    type: z.enum(["INCOME", "EXPENSE"]).nullable().optional(),
  })
  .refine(
    (v) => v.name !== undefined || v.type !== undefined,
    "Provide at least one field to update",
  );

export const treasuryInput = z.object({
  type: z.enum(["INCOME", "EXPENSE"]).default("EXPENSE"),
  amount: z
    .number()
    .int("Amount must be a whole number")
    .min(1, "Amount must be at least 1")
    .max(1_000_000_000, "Amount exceeds maximum"),
  purpose: z.string().trim().min(1, "Purpose is required").max(200),
  date: isoDate,
  categoryId: z.string().min(1).nullable().optional(),
});

export const treasuryPatchInput = z
  .object({
    type: z.enum(["INCOME", "EXPENSE"]).optional(),
    amount: z.number().int().min(1).max(1_000_000_000).optional(),
    purpose: z.string().trim().min(1).max(200).optional(),
    date: isoDate.optional(),
    categoryId: z.string().min(1).nullable().optional(),
  })
  .refine(
    (v) =>
      v.type !== undefined ||
      v.amount !== undefined ||
      v.purpose !== undefined ||
      v.date !== undefined ||
      v.categoryId !== undefined,
    "Provide at least one field to update",
  );

const optionalHttpUrl = z
  .union([z.string(), z.null()])
  .optional()
  .transform((val) => (val ?? "").trim())
  .refine((val) => val.length <= 300, "URL is too long (max 300 characters)")
  .refine((val) => {
    if (!val) return true;
    try {
      const url = new URL(val);
      return url.protocol === "https:" || url.protocol === "http:";
    } catch {
      return false;
    }
  }, "Enter a valid http:// or https:// URL")
  .transform((val) => (val ? val : null));

export const clubSettingsInput = z.object({
  schedule: z.string().trim().min(1, "Schedule is required").max(80),
  venue: z.string().trim().min(1, "Venue is required").max(100),
  skillLevel: z.string().trim().min(1, "Skill level is required").max(120),
  whatsappUrl: optionalHttpUrl,
  ayoUrl: optionalHttpUrl,
});

export const tournamentCreateInput = z
  .object({
    name: z.string().trim().min(1, "Tournament name is required").max(80),
    sessionId: z.string().min(1).optional(),
    createSession: sessionInput.optional(),
    hasThirdPlace: z.boolean().optional().default(false),
    preferredCourts: z
      .array(z.number().int().min(1).max(8))
      .max(8)
      .optional()
      .default([]),
  })
  .refine((v) => Boolean(v.sessionId) || Boolean(v.createSession), {
    message: "Select an existing session or create a new one",
  });

export const tournamentPatchInput = z
  .object({
    name: z.string().trim().min(1, "Tournament name is required").max(80).optional(),
    hasThirdPlace: z.boolean().optional(),
    preferredCourts: z.array(z.number().int().min(1).max(8)).max(8).optional(),
  })
  .refine(
    (v) =>
      v.name !== undefined ||
      v.hasThirdPlace !== undefined ||
      v.preferredCourts !== undefined,
    "Provide at least one field to update",
  );

export const tournamentTeamAddInput = z
  .object({
    player1Id: z.string().min(1, "Pick Player 1"),
    player2Id: z.string().min(1, "Pick Player 2"),
    name: z.string().trim().max(50).nullable().optional(),
  })
  .refine((v) => v.player1Id !== v.player2Id, {
    message: "Pick two different players for a doubles team",
    path: ["player2Id"],
  });

export const tournamentRandomizeInput = z.object({
  playerIds: z
    .array(z.string().min(1))
    .min(4, "Select at least 4 players (2 teams)")
    .refine((ids) => new Set(ids).size === ids.length, "Duplicate player selected")
    .refine((ids) => ids.length % 2 === 0, "Select an even number of players"),
  replaceExisting: z.boolean().optional().default(true),
});

export const tournamentTeamsReorderInput = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("reorder"),
    teamIds: z.array(z.string().min(1)).min(1),
  }),
  z.object({
    action: z.literal("shuffle"),
  }),
  z.object({
    action: z.literal("seedByTier"),
  }),
]);

export const tournamentMatchAssignInput = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("court"),
    courtNumber: z.number().int().min(1).max(8),
  }),
  z.object({
    type: z.literal("queue"),
  }),
]);

export const tournamentWalkoverInput = z.object({
  winnerSide: z.enum(["A", "B"]),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordInput>;
export type AdminCreateInput = z.infer<typeof adminCreateInput>;
export type AdminPasswordInput = z.infer<typeof adminPasswordInput>;
export type SessionInput = z.infer<typeof sessionInput>;
export type SessionPatchInput = z.infer<typeof sessionPatchInput>;
export type RosterInput = z.infer<typeof rosterInput>;
export type PlayerPaidInput = z.infer<typeof playerPaidInput>;
export type PlayerTierInput = z.infer<typeof playerTierInput>;
export type AssignInput = z.infer<typeof assignInput>;
export type GameUpdateInput = z.infer<typeof gameUpdateInput>;
export type TickInput = z.infer<typeof tickInput>;
export type LockInput = z.infer<typeof lockInput>;
export type StartInput = z.infer<typeof startInput>;
export type QueueOrderInput = z.infer<typeof queueOrderInput>;
export type FinishMatchInput = z.infer<typeof finishMatchInput>;
export type TreasuryInput = z.infer<typeof treasuryInput>;
export type TreasuryPatchInput = z.infer<typeof treasuryPatchInput>;
export type TreasuryCategoryInput = z.infer<typeof treasuryCategoryInput>;
export type TreasuryCategoryPatchInput = z.infer<
  typeof treasuryCategoryPatchInput
>;
export type ClubSettingsInput = z.infer<typeof clubSettingsInput>;
export type TournamentCreateInput = z.infer<typeof tournamentCreateInput>;
export type TournamentPatchInput = z.infer<typeof tournamentPatchInput>;
export type TournamentTeamAddInput = z.infer<typeof tournamentTeamAddInput>;
export type TournamentRandomizeInput = z.infer<typeof tournamentRandomizeInput>;
export type TournamentTeamsReorderInput = z.infer<typeof tournamentTeamsReorderInput>;
export type TournamentMatchAssignInput = z.infer<typeof tournamentMatchAssignInput>;
export type TournamentWalkoverInput = z.infer<typeof tournamentWalkoverInput>;

