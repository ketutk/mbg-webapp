import { Suspense } from "react";
import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import SessionDetailApp from "@/components/matches/SessionDetailApp";
import { VisitorViewSkeleton } from "@/components/matches/VisitorViewSkeleton";
import { fmtDate } from "@/lib/format";
import { resolvePublicSessionMeta } from "@/lib/server/seo";
import { SITE_NAME, SITE_URL } from "@/lib/site";

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
      title: "Session",
      description: "Live badminton session details at Minggu Badminton Guys.",
      robots: { index: false, follow: false },
    };
  }

  const dateLabel = fmtDate(meta.date);
  const title = `${meta.name} (${dateLabel})`;
  const description = `Live badminton session on ${dateLabel} at ${meta.venue} · ${meta.courtCount} court${meta.courtCount === 1 ? "" : "s"}, ${meta.playerCount} players, ${meta.gameCount} matches. Check live courts, queue, and match history.`;
  const canonical = `/sessions/${meta.slug}`;

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

async function SessionDetailLoader({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const meta = await resolvePublicSessionMeta(slug);

  if (meta?.matchedById) {
    permanentRedirect(`/sessions/${meta.slug}`);
  }

  const jsonLd =
    meta && meta.isPublic
      ? {
          "@context": "https://schema.org",
          "@type": "SportsEvent",
          name: meta.name,
          startDate: meta.date,
          sport: "Badminton",
          eventStatus: "https://schema.org/EventScheduled",
          location: { "@type": "Place", name: meta.venue },
          organizer: {
            "@type": "Organization",
            name: SITE_NAME,
            url: SITE_URL,
          },
          url: `${SITE_URL}/sessions/${meta.slug}`,
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
      <SessionDetailApp sessionId={meta?.id ?? slug} />
    </>
  );
}

export default function SessionDetailPage({ params }: PageProps) {
  return (
    <Suspense fallback={<VisitorViewSkeleton />}>
      <SessionDetailLoader params={params} />
    </Suspense>
  );
}
