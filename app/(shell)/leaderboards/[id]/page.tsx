import { Suspense } from "react";
import type { Metadata } from "next";
import SessionLeaderboardApp from "@/components/leaderboards/SessionLeaderboardApp";
import { SessionLeaderboardSkeleton } from "@/components/leaderboards/SessionLeaderboardSkeleton";

export const metadata: Metadata = {
  title: "Session leaderboard",
};

export default function SessionLeaderboardPage() {
  return (
    <Suspense fallback={<SessionLeaderboardSkeleton />}>
      <SessionLeaderboardApp />
    </Suspense>
  );
}
