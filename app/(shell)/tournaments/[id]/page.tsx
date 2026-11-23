import { Suspense } from "react";
import type { Metadata } from "next";
import { TournamentDetailApp } from "@/components/tournaments/TournamentDetailApp";
import { card, skelBar } from "@/lib/ui";

export const metadata: Metadata = {
  title: "Tournament Bracket",
};

async function TournamentDetailLoader({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <TournamentDetailApp id={id} />;
}

export default function TournamentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
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
