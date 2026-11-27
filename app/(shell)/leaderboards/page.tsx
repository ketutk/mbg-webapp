import type { Metadata } from "next";
import LeaderboardsApp from "@/components/leaderboards/LeaderboardsApp";
import { SITE_NAME } from "@/lib/site";

const title = "Leaderboards";
const description =
  "View badminton session standings and win-loss leaderboards for Minggu Badminton Guys.";

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: "/leaderboards",
  },
  openGraph: {
    url: "/leaderboards",
    title: `${title} · ${SITE_NAME}`,
    description,
  },
  twitter: {
    card: "summary_large_image",
    title: `${title} · ${SITE_NAME}`,
    description,
  },
};

export default function LeaderboardsPage() {
  return <LeaderboardsApp />;
}
