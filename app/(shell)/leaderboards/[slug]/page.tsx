import { Suspense } from "react";
import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import SessionLeaderboardApp from "@/components/leaderboards/SessionLeaderboardApp";
import { SessionLeaderboardSkeleton } from "@/components/leaderboards/SessionLeaderboardSkeleton";
import { fmtDate } from "@/lib/format";
import { resolvePublicSessionMeta } from "@/lib/server/seo";
import { SITE_NAME } from "@/lib/site";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const meta = await resolvePublicSessionMeta(slug);

  if (!meta || !meta.isPublic) {
    return {
      title: "Session Leaderboard",
      description:
        "Win-loss badminton session standings at Minggu Badminton Guys.",
      robots: { index: false, follow: false },
    };
  }

  const dateLabel = fmtDate(meta.date);
  const title = `${meta.name} Leaderboard (${dateLabel})`;
  const description = `Win-loss standings for ${meta.name} (${dateLabel}) · ${meta.playerCount} players across ${meta.gameCount} matches.`;
  const canonical = `/leaderboards/${meta.slug}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      url: canonical,
      title: `${title} · ${SITE_NAME}`,
      description,
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} · ${SITE_NAME}`,
      description,
    },
  };
}

async function SessionLeaderboardLoader({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const meta = await resolvePublicSessionMeta(slug);

  if (meta?.matchedById) {
    permanentRedirect(`/leaderboards/${meta.slug}`);
  }

  return <SessionLeaderboardApp sessionId={meta?.id ?? slug} />;
}

export default function SessionLeaderboardPage({ params }: PageProps) {
  return (
    <Suspense fallback={<SessionLeaderboardSkeleton />}>
      <SessionLeaderboardLoader params={params} />
    </Suspense>
  );
}
