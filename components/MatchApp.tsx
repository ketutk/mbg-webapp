"use client";

import { useMemo, useRef, useState } from "react";
import { deleteSession, selectSession, useDB, useHydrated } from "@/lib/store";
import { recommend } from "@/lib/match";
import type { Session } from "@/lib/types";
import { NextMatch } from "./NextMatch";
import { PlayerGrid } from "./PlayerGrid";
import { RosterDialog } from "./RosterDialog";
import { SessionDialog } from "./SessionDialog";
import { HistoryDialog } from "./HistoryDialog";
import { btn, card, cx, eyebrow, h1 } from "@/lib/ui";

const fmtDate = (d: string) =>
  new Date(`${d}T12:00:00`).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

export default function MatchApp() {
  const db = useDB();
  const hydrated = useHydrated();
  const [creating, setCreating] = useState(false);

  const session = db.sessions.find((s) => s.id === db.currentId) ?? db.sessions.at(-1);

  return (
    <div className="mx-auto max-w-[1190px] px-[30px] pb-14 max-[860px]:px-3.5 max-[860px]:pb-10">
      <header className="flex min-h-[76px] items-center justify-between gap-3 border-b border-[#dcebf8]">
        <div className="flex items-center gap-3 font-display text-base font-extrabold tracking-[-0.35px]">
          <div className="grid size-10 place-items-center rounded-[14px] bg-[linear-gradient(145deg,#85c4f5,#5398da)] text-xs font-extrabold text-white shadow-[0_5px_13px_#4898d834]">
            MBG
          </div>
          <div>
            Minggu Badminton Guys
            <small className="mt-0.5 block font-sans text-[10px] font-semibold tracking-[0.65px] text-[#7d9ab4]">
              FAIR MATCH PLANNER
            </small>
          </div>
        </div>
        <div className="flex items-center gap-3.5">
          <span className="flex items-center gap-[7px] text-xs text-muted max-[860px]:hidden">
            <i className="size-[7px] rounded-full bg-[#53b8a3]" /> Saved on this device
          </span>
          <button
            id="new-session"
            className={btn("primary")}
            onClick={() => setCreating(true)}
          >
            ＋ New session
          </button>
        </div>
      </header>

      {!hydrated ? (
        <div
          className={cx(
            card,
            "mt-8 h-80 animate-shimmer bg-[linear-gradient(100deg,#fff_30%,#eef6fd_50%,#fff_70%)] bg-size-[200%_100%]",
          )}
          aria-busy="true"
        />
      ) : session ? (
        <SessionView key={session.id} session={session} sessions={db.sessions} />
      ) : (
        <section className="mx-auto mt-[12vh] max-w-[560px] text-center">
          <div className={eyebrow}>Game day</div>
          <h1 className={h1}>Play fair. Play more.</h1>
          <p className="mt-4 mb-[26px] leading-[1.6] text-muted">
            Create a game session, add your players and tick off who has played. We&apos;ll
            recommend the next match so everyone gets the same number of games.
          </p>
          <button className={btn("primary", "lg")} onClick={() => setCreating(true)}>
            ＋ Create your first session
          </button>
        </section>
      )}

      {creating && <SessionDialog onClose={() => setCreating(false)} />}
    </div>
  );
}

function SessionView({ session, sessions }: { session: Session; sessions: Session[] }) {
  const [seed, setSeed] = useState(0);
  const [editing, setEditing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [toast, setToast] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const rec = useMemo(() => recommend(session, seed), [session, seed]);
  const nextUp = useMemo(() => new Set(rec?.players.map((p) => p.id)), [rec]);

  function showToast(msg: string) {
    setToast(msg);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(""), 2200);
  }

  return (
    <>
      <section className="mt-8 mb-[22px] flex flex-wrap items-end justify-between gap-4 max-[860px]:mt-6 max-[860px]:mb-4">
        <div>
          <div className={eyebrow}>{fmtDate(session.date)}</div>
          <h1 className={h1}>{session.name}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label>
            <span className="sr-only">Switch session</span>
            <select
              id="session-select"
              className="max-w-[260px] rounded-xl border border-[#d9eafa] bg-white px-3 py-2.5 text-xs font-bold text-[#3c78aa]"
              value={session.id}
              onChange={(e) => selectSession(e.target.value)}
            >
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} · {fmtDate(s.date)}
                </option>
              ))}
            </select>
          </label>
          <button id="match-history" className={btn("light")} onClick={() => setShowHistory(true)}>
            History · {session.games.length}
          </button>
          <button id="edit-players" className={btn("light")} onClick={() => setEditing(true)}>
            Edit players
          </button>
          <button
            className={btn("danger")}
            onClick={() => {
              if (window.confirm(`Delete session “${session.name}”?`)) deleteSession(session.id);
            }}
          >
            Delete
          </button>
        </div>
      </section>

      <div className="grid grid-cols-[minmax(0,1.7fr)_minmax(300px,1fr)] items-start gap-[17px] max-[860px]:grid-cols-1">
        <div className="sticky top-4 order-2 max-[860px]:static max-[860px]:order-1">
          <NextMatch
            session={session}
            rec={rec}
            onShuffle={() => {
              setSeed((s) => s + 1);
              showToast("Shuffled — only players tied on games and rest can change");
            }}
            onStarted={() => {
              setSeed(0);
              showToast("Match added — 4 players ticked");
            }}
          />
        </div>
        <div className="order-1 min-w-0 max-[860px]:order-2">
          <PlayerGrid session={session} nextUp={nextUp} />
        </div>
      </div>

      {editing && <RosterDialog session={session} onClose={() => setEditing(false)} />}
      {showHistory && (
        <HistoryDialog session={session} onClose={() => setShowHistory(false)} />
      )}
      <div
        className={cx(
          "pointer-events-none fixed bottom-[22px] left-1/2 z-30 max-w-[calc(100vw-32px)] -translate-x-1/2 rounded-xl bg-[#285c8d] px-4 py-[11px] text-xs text-white shadow-[0_8px_22px_#23598b35] transition-all duration-200",
          toast ? "translate-y-0 opacity-100" : "translate-y-5 opacity-0",
        )}
        role="status"
      >
        {toast}
      </div>
    </>
  );
}
