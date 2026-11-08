import { treasuryInput } from "@/lib/schemas";
import { created, route } from "@/lib/server/http";
import { createTreasuryEntry } from "@/lib/server/treasury";

export const POST = route(
  { roles: ["ADMIN", "SUPERADMIN"], body: treasuryInput },
  async ({ body, user }) => {
    const entry = await createTreasuryEntry(body, user);
    return created({ entry });
  },
);

