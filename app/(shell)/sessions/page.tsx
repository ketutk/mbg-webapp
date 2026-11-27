import type { Metadata } from "next";
import MatchApp from "@/components/matches/MatchApp";
import { SITE_NAME } from "@/lib/site";

const title = "Live Sessions";
const description =
  "Browse open badminton sessions, live court assignments, upcoming queues, and fair doubles rotations at Minggu Badminton Guys.";

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: "/sessions",
  },
  openGraph: {
    url: "/sessions",
    title: `${title} · ${SITE_NAME}`,
    description,
  },
  twitter: {
    card: "summary_large_image",
    title: `${title} · ${SITE_NAME}`,
    description,
  },
};

export default function SessionsPage() {
  return <MatchApp />;
}
