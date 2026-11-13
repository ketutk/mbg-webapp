"use client";

import { selectSession, useSessionDetail } from "@/lib/store";
import type { AuthUser } from "@/lib/types";
import { btn, card, cx, eyebrow } from "@/lib/ui";
import { SessionView } from "./SessionView";
import { SessionViewSkeleton } from "./SessionViewSkeleton";

export function AdminSessionContainer({
  sessionId,
  user,
}: {
  sessionId: string;
  user: AuthUser;
}) {
  const { data: session, error, loading } = useSessionDetail(sessionId);

  if (loading) {
    return <SessionViewSkeleton onBackToList={() => selectSession(null)} />;
  }

  if (error || !session) {
    return (
      <section className={cx(card, "mx-auto mt-8 max-w-[480px] p-8 text-center")}>
        <div className={eyebrow}>Session not found</div>
        <h2 className="mt-2 font-display text-xl font-extrabold text-[#183e6b]">
          Could not load this session
        </h2>
        <p className="mt-2 mb-5 text-xs leading-relaxed text-muted">
          {error instanceof Error
            ? error.message
            : "This session may have been deleted."}
        </p>
        <button
          type="button"
          className={btn("primary")}
          onClick={() => selectSession(null)}
        >
          ← Back to all sessions
        </button>
      </section>
    );
  }

  return <SessionView session={session} user={user} />;
}
