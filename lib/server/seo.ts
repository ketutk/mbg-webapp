import "server-only";
import { cache } from "react";
import { prisma } from "./db";
import { toDateStr } from "./dto";
import { DEFAULT_CLUB_SETTINGS } from "@/lib/site";

export interface ResolvedSessionMeta {
  id: string;
  slug: string;
  matchedById: boolean;
  isPublic: boolean;
  name: string;
  date: string;
  courtCount: number;
  playerCount: number;
  gameCount: number;
  venue: string;
}

export interface ResolvedTournamentMeta {
  id: string;
  slug: string;
  matchedById: boolean;
  isPublic: boolean;
  name: string;
  status: "DRAFT" | "IN_PROGRESS" | "COMPLETED";
  sessionName: string;
  sessionDate: string;
  teamCount: number;
  completedMatchCount: number;
  totalMatchCount: number;
  championName: string | null;
  venue: string;
}

async function getVenueName(): Promise<string> {
  const settings = await prisma.clubSettings
    .findUnique({ where: { id: "default" }, select: { venue: true } })
    .catch(() => null);
  return settings?.venue?.trim() || DEFAULT_CLUB_SETTINGS.venue;
}

/**
 * Resolve a Session by canonical `slug` (or legacy CUID `id`) for Server Component
 * routing, metadata, and JSON-LD. Wrapped with React `cache()` so `generateMetadata`
 * and the page loader share a single DB lookup per request.
 */
export const resolvePublicSessionMeta = cache(
  async (slugOrId: string): Promise<ResolvedSessionMeta | null> => {
    const bySlug = await prisma.session.findUnique({
      where: { slug: slugOrId },
      include: { _count: { select: { players: true, games: true } } },
    });
    const row =
      bySlug ??
      (await prisma.session.findUnique({
        where: { id: slugOrId },
        include: { _count: { select: { players: true, games: true } } },
      }));

    if (!row) return null;

    const venue = await getVenueName();
    return {
      id: row.id,
      slug: row.slug,
      matchedById: !bySlug,
      isPublic: row.status === "OPEN",
      name: row.name,
      date: toDateStr(row.date),
      courtCount: row.courtCount,
      playerCount: row._count.players,
      gameCount: row._count.games,
      venue,
    };
  },
);

/**
 * Resolve a Tournament by canonical `slug` (or legacy CUID `id`) for Server Component
 * routing, metadata, and JSON-LD.
 */
export const resolvePublicTournamentMeta = cache(
  async (slugOrId: string): Promise<ResolvedTournamentMeta | null> => {
    const include = {
      session: { select: { name: true, date: true, status: true } },
      teams: {
        where: { status: "CHAMPION" as const },
        include: {
          player1: { select: { name: true } },
          player2: { select: { name: true } },
        },
      },
      _count: { select: { teams: true } },
      matches: { select: { status: true } },
    };

    const bySlug = await prisma.tournament.findUnique({
      where: { slug: slugOrId },
      include,
    });
    const row =
      bySlug ??
      (await prisma.tournament.findUnique({
        where: { id: slugOrId },
        include,
      }));

    if (!row) return null;

    const playable = row.matches.filter((m) => m.status !== "BYE");
    const completedMatchCount = playable.filter(
      (m) => m.status === "COMPLETED",
    ).length;
    const champ = row.teams[0];
    const championName = champ
      ? champ.name || `${champ.player1.name} & ${champ.player2.name}`
      : null;

    const venue = await getVenueName();
    return {
      id: row.id,
      slug: row.slug,
      matchedById: !bySlug,
      isPublic: row.status !== "DRAFT" && row.session.status === "OPEN",
      name: row.name,
      status: row.status,
      sessionName: row.session.name,
      sessionDate: toDateStr(row.session.date),
      teamCount: row._count.teams,
      completedMatchCount,
      totalMatchCount: playable.length,
      championName,
      venue,
    };
  },
);
