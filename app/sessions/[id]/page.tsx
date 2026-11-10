import { Suspense } from "react";
import type { Metadata } from "next";
import { SessionScreen, SessionScreenSkeleton } from "@/features/sessions/screens/SessionScreen";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function Page({ params }: PageProps) {
  return (
    <Suspense fallback={<SessionScreenSkeleton />}>
      <SessionRoute params={params} />
    </Suspense>
  );
}

async function SessionRoute({ params }: PageProps) {
  const { id } = await params;
  return <SessionScreen sessionId={id} />;
}

