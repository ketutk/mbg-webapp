import { Suspense } from "react";
import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import { TournamentDetailApp } from "@/components/tournaments/TournamentDetailApp";
import { fmtDate } from "@/lib/format";
import { resolvePublicTournamentMeta } from "@/lib/server/seo";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { card, skelBar } from "@/lib/ui";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const meta = await resolvePublicTournamentMeta(slug);

  if (!meta || !meta.isPublic) {
    return {
      title: "Tournament Bracket",
      description:
        "Doubles badminton tournament bracket at Minggu Badminton Guys.",
      robots: { index: false, follow: false },
    };
  }

  const dateLabel = fmtDate(meta.sessionDate);
  const statusLabel = meta.status === "COMPLETED" ? "Completed" : "Live";
  const championPart = meta.championName
    ? ` · Champion: ${meta.championName}`
    : "";
  const title = `${meta.name} — Tournament Bracket`;
  const description = `${statusLabel} Doubles Single Elimination bracket (${meta.teamCount} teams, ${meta.completedMatchCount}/${meta.totalMatchCount} matches${championPart}) for ${meta.sessionName} (${dateLabel}) at ${meta.venue}.`;
  const canonical = `/tournaments/${meta.slug}`;

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

async function TournamentDetailLoader({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const meta = await resolvePublicTournamentMeta(slug);

  if (meta?.matchedById) {
    permanentRedirect(`/tournaments/${meta.slug}`);
  }

  const jsonLd =
    meta && meta.isPublic
      ? {
          "@context": "https://schema.org",
          "@type": "SportsEvent",
          name: meta.name,
          startDate: meta.sessionDate,
          sport: "Badminton",
          eventStatus: "https://schema.org/EventScheduled",
          location: { "@type": "Place", name: meta.venue },
          organizer: {
            "@type": "Organization",
            name: SITE_NAME,
            url: SITE_URL,
          },
          url: `${SITE_URL}/tournaments/${meta.slug}`,
        }
      : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <TournamentDetailApp id={meta?.id ?? slug} />
    </>
  );
}

export default function TournamentDetailPage({ params }: PageProps) {
  return (
    <Suspense
      fallback={
        <div className="mt-8 grid gap-4" data-skeleton="">
          <div className={skelBar("w-48", "h-6")} />
          <div className={skelBar("w-80", "h-9")} />
          <div className={`${card} h-64`} />
        </div>
      }
    >
      <TournamentDetailLoader params={params} />
    </Suspense>
  );
}
