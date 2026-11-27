import type { MetadataRoute } from "next";
import { prisma } from "@/lib/server/db";
import { SITE_URL } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      changeFrequency: "weekly",
      priority: 1,
      images: [`${SITE_URL}/logo.jpg`],
    },
    {
      url: `${SITE_URL}/sessions`,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/tournaments`,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/leaderboards`,
      changeFrequency: "weekly",
      priority: 0.8,
    },
  ];

  try {
    const [sessions, tournaments] = await Promise.all([
      prisma.session.findMany({
        where: { status: "OPEN" },
        orderBy: [{ date: "desc" }],
        take: 200,
        select: { slug: true, updatedAt: true },
      }),
      prisma.tournament.findMany({
        where: {
          status: { in: ["IN_PROGRESS", "COMPLETED"] },
          session: { status: "OPEN" },
        },
        orderBy: [{ createdAt: "desc" }],
        take: 200,
        select: { slug: true, updatedAt: true },
      }),
    ]);

    const sessionEntries: MetadataRoute.Sitemap = sessions.map((s) => ({
      url: `${SITE_URL}/sessions/${s.slug}`,
      lastModified: s.updatedAt,
      changeFrequency: "daily",
      priority: 0.7,
    }));

    const leaderboardEntries: MetadataRoute.Sitemap = sessions.map((s) => ({
      url: `${SITE_URL}/leaderboards/${s.slug}`,
      lastModified: s.updatedAt,
      changeFrequency: "daily",
      priority: 0.6,
    }));

    const tournamentEntries: MetadataRoute.Sitemap = tournaments.map((t) => ({
      url: `${SITE_URL}/tournaments/${t.slug}`,
      lastModified: t.updatedAt,
      changeFrequency: "daily",
      priority: 0.8,
    }));

    return [
      ...staticEntries,
      ...sessionEntries,
      ...tournamentEntries,
      ...leaderboardEntries,
    ];
  } catch {
    return staticEntries;
  }
}
