import { treasuryCategoryPatchInput } from "@/lib/schemas";
import { ok, route } from "@/lib/server/http";
import {
  deleteTreasuryCategory,
  updateTreasuryCategory,
} from "@/lib/server/treasury-categories";

export const PATCH = route(
  { roles: ["ADMIN", "SUPERADMIN"], body: treasuryCategoryPatchInput },
  async ({ params, body }) => {
    const { id } = await params;
    const category = await updateTreasuryCategory(id, body);
    return ok({ category });
  },
);

export const DELETE = route(
  { roles: ["ADMIN", "SUPERADMIN"] },
  async ({ params }) => {
    const { id } = await params;
    await deleteTreasuryCategory(id);
    return ok({ ok: true });
  },
);
