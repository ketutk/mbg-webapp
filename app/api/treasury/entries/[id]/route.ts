import { treasuryPatchInput } from "@/lib/schemas";
import { ok, route } from "@/lib/server/http";
import {
  softDeleteTreasuryEntry,
  updateTreasuryEntry,
} from "@/lib/server/treasury";

export const PATCH = route(
  { roles: ["SUPERADMIN"], body: treasuryPatchInput },
  async ({ params, body, user }) => {
    const { id } = await params;
    const entry = await updateTreasuryEntry(id, body, user);
    return ok({ entry });
  },
);

export const DELETE = route(
  { roles: ["SUPERADMIN"] },
  async ({ params, user }) => {
    const { id } = await params;
    await softDeleteTreasuryEntry(id, user);
    return ok({ ok: true });
  },
);

