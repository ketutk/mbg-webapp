import type { Metadata } from "next";
import LeaderboardsApp from "@/components/leaderboards/LeaderboardsApp";

export const metadata: Metadata = {
  title: "Leaderboards",
};

export default function LeaderboardsPage() {
  return <LeaderboardsApp />;
}
