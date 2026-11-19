import "server-only";
import { prisma } from "./db";
import type { ClubSettingsInput } from "@/lib/schemas";
import { DEFAULT_CLUB_SETTINGS } from "@/lib/site";
import type { AuthUser, ClubSettings } from "@/lib/types";

const SINGLETON_ID = "default";

export async function getClubSettings(): Promise<ClubSettings> {
  const row = await prisma.clubSettings.findUnique({
    where: { id: SINGLETON_ID },
  });
  if (!row) return DEFAULT_CLUB_SETTINGS;
  return {
    schedule: row.schedule,
    venue: row.venue,
    skillLevel: row.skillLevel,
    whatsappUrl: row.whatsappUrl,
    ayoUrl: row.ayoUrl,
  };
}

export async function updateClubSettings(
  input: ClubSettingsInput,
  user: AuthUser,
): Promise<ClubSettings> {
  const updated = await prisma.clubSettings.upsert({
    where: { id: SINGLETON_ID },
    create: {
      id: SINGLETON_ID,
      schedule: input.schedule,
      venue: input.venue,
      skillLevel: input.skillLevel,
      whatsappUrl: input.whatsappUrl,
      ayoUrl: input.ayoUrl,
      updatedById: user.id,
    },
    update: {
      schedule: input.schedule,
      venue: input.venue,
      skillLevel: input.skillLevel,
      whatsappUrl: input.whatsappUrl,
      ayoUrl: input.ayoUrl,
      updatedById: user.id,
    },
  });

  return {
    schedule: updated.schedule,
    venue: updated.venue,
    skillLevel: updated.skillLevel,
    whatsappUrl: updated.whatsappUrl,
    ayoUrl: updated.ayoUrl,
  };
}
