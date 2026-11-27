"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { fmtDate } from "@/lib/format";
import { useTournamentsList } from "@/lib/store";
import type { TournamentStatus } from "@/lib/types";
import {
  btn,
  card,
  cx,
  empty,
  eyebrow,
  h1,
  pill,
  skelBar,
  sub,
} from "@/lib/ui";

const TournamentCreateDialog = dynamic(() =>
  import("./TournamentCreateDialog").then((m) => m.TournamentCreateDialog),
);

const statusLabel: Record<TournamentStatus, string> = {
  DRAFT: "Draft",
  IN_PROGRESS: "Live",
  COMPLETED: "Completed",
};

const statusTone: Record<TournamentStatus, "default" | "ok" | "warn"> = {
  DRAFT: "warn",
  IN_PROGRESS: "ok",
  COMPLETED: "default",
};

export function TournamentList() {
  const router = useRouter();
  const { user } = useAuth();
  const [filter, setFilter] = useState<"ALL" | TournamentStatus>("ALL");
  const [creating, setCreating] = useState(false);

  const { data: tournaments, loading } = useTournamentsList(
    filter === "ALL" ? undefined : { status: filter },
  );

  const tabs: { id: "ALL" | TournamentStatus; label: string }[] = [
    { id: "ALL", label: "All" },
    { id: "IN_PROGRESS", label: "Live" },
    ...(user ? [{ id: "DRAFT" as const, label: "Draft" }] : []),
    { id: "COMPLETED", label: "Completed" },
  ];

  return (
    <>
      <section className="mt-8 mb-6 flex flex-wrap items-end justify-between gap-4 max-[860px]:mt-6 max-[860px]:mb-4">
        <div>
          <span className={eyebrow}>Bracket &amp; Open-Play</span>
          <h1 className={h1}>Tournaments</h1>
          <p className={cx(sub, "mt-1")}>
            Fixed doubles brackets linked to sessions — eliminated pairs flow
            back into casual courts automatically.
          </p>
        </div>
        {user && (
          <button
            type="button"
            className={btn("primary")}
            onClick={() => setCreating(true)}
          >
            ＋ New Tournament
          </button>
        )}
      </section>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilter(tab.id)}
            className={cx(
              "rounded-full border px-3.5 py-1.5 text-xs font-extrabold transition-all",
              filter === tab.id
                ? "border-[#56a2e6] bg-[#56a2e6] text-white shadow-[0_6px_14px_#56a2e630]"
                : "border-[#dceaf6] bg-white text-[#204a74] hover:border-[#b7d6f2]",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-4 max-[760px]:grid-cols-1">
          {[0, 1].map((i) => (
            <div key={i} className={cx(card, "p-5")} data-skeleton="">
              <div className={skelBar("w-24", "h-5")} />
              <div className={cx(skelBar("w-3/4", "h-6"), "mt-3")} />
              <div className={cx(skelBar("w-1/2", "h-4"), "mt-2")} />
            </div>
          ))}
        </div>
      ) : tournaments.length === 0 ? (
        <div className={cx(card, empty, "py-12")}>
          {user
            ? "No tournaments yet. Click “＋ New Tournament” to create one linked to a session."
            : "No live or completed tournaments yet."}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 max-[760px]:grid-cols-1">
          {tournaments.map((t) => (
            <Link
              key={t.id}
              href={`/tournaments/${t.slug}`}
              className={cx(
                card,
                "group flex flex-col justify-between gap-4 p-5 no-underline transition-all hover:-translate-y-0.5 hover:border-[#9ec8ee] hover:shadow-[0_14px_30px_#3b82c41a]",
              )}
            >
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className={pill(statusTone[t.status])}>
                    {statusLabel[t.status]}
                  </span>
                  <span className="text-[11px] font-bold text-muted">
                    Doubles · Single Elimination
                  </span>
                </div>
                <h2 className="mt-3 font-display text-lg font-extrabold text-[#183e6b] group-hover:text-[#2a72b5]">
                  {t.name}
                </h2>
                <div className="mt-1 text-xs font-semibold text-muted">
                  Session: {t.sessionName} · {fmtDate(t.sessionDate)}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#eef4f9] pt-3 text-xs font-bold text-[#204a74]">
                <span>
                  {t.teamCount} team{t.teamCount === 1 ? "" : "s"}
                  {t.totalMatchCount > 0
                    ? ` · ${t.completedMatchCount}/${t.totalMatchCount} matches`
                    : ""}
                </span>
                {t.championName ? (
                  <span className={pill("ok")}>🏆 {t.championName}</span>
                ) : (
                  <span className="text-[#337fc4]">Open bracket →</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      {creating && (
        <TournamentCreateDialog
          onClose={() => setCreating(false)}
          onCreated={(created) => {
            setCreating(false);
            router.push(`/tournaments/${created.slug}`);
          }}
        />
      )}
    </>
  );
}
