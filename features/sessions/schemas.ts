import { z } from "zod";
import { isoDate } from "@/lib/schemas";

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

export type SessionInput = z.infer<typeof sessionInput>;
export type SessionPatchInput = z.infer<typeof sessionPatchInput>;
export type RosterInput = z.infer<typeof rosterInput>;

