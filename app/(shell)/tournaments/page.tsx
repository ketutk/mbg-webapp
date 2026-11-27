import type { Metadata } from "next";
import { TournamentList } from "@/components/tournaments/TournamentList";
import { SITE_NAME } from "@/lib/site";

const title = "Tournaments";
const description =
  "Follow live and completed doubles badminton tournament brackets linked to MBG sessions — track live courts, seeds, and champions.";

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: "/tournaments",
  },
  openGraph: {
    url: "/tournaments",
    title: `${title} · ${SITE_NAME}`,
    description,
  },
  twitter: {
    card: "summary_large_image",
    title: `${title} · ${SITE_NAME}`,
    description,
  },
};

export default function TournamentsPage() {
  return <TournamentList />;
}
