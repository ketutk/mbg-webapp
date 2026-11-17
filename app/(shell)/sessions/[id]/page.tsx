import { Suspense } from "react";
import type { Metadata } from "next";
import SessionDetailApp from "@/components/matches/SessionDetailApp";
import { VisitorViewSkeleton } from "@/components/matches/VisitorViewSkeleton";

export const metadata: Metadata = {
  title: "Session detail",
};

export default function SessionDetailPage() {
  return (
    <Suspense fallback={<VisitorViewSkeleton />}>
      <SessionDetailApp />
    </Suspense>
  );
}
