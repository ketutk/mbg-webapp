"use client";

import { useUiStore } from "@/lib/stores/ui-store";
import { btn, eyebrow, h1 } from "@/lib/ui";

export function SessionsHero({
  openCount,
  closedCount,
  isSuperadmin,
}: {
  openCount: number;
  closedCount: number;
  isSuperadmin: boolean;
}) {
  const openNewSession = useUiStore((s) => s.openNewSession);

  return (
    <section className="mt-8 mb-5 flex flex-wrap items-end justify-between gap-4 max-[860px]:mt-6 max-[860px]:mb-4">
      <div>
        <div className={eyebrow}>Organiser dashboard</div>
        <h1 className={h1}>Match sessions</h1>
        <div className="mt-1 text-xs text-muted">
          Browse all {openCount + closedCount} sessions ({openCount} open ·{" "}
          {closedCount} closed). Select any session to manage courts, queue, and
          player checklist.
        </div>
      </div>
      {isSuperadmin && (
        <div className="flex flex-wrap items-center gap-2">
          <button className={btn("primary")} onClick={openNewSession}>
            ＋ New session
          </button>
        </div>
      )}
    </section>
  );
}
