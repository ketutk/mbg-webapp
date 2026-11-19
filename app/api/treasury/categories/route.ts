import { treasuryCategoryInput } from "@/lib/schemas";
import { created, ok, route } from "@/lib/server/http";
import {
  createTreasuryCategory,
  listTreasuryCategories,
} from "@/lib/server/treasury-categories";

export const GET = route({ roles: ["ADMIN", "SUPERADMIN"] }, async () => {
  const categories = await listTreasuryCategories();
  return ok({ categories });
});

export const POST = route(
  { roles: ["ADMIN", "SUPERADMIN"], body: treasuryCategoryInput },
  async ({ body, user }) => {
    const category = await createTreasuryCategory(body, user);
    return created({ category });
  },
);
