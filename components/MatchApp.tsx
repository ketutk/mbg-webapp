"use client";

import { useMemo, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { fmtDate } from "@/lib/format";
import { queueOf, recommend } from "@/lib/match";
import {
  deleteSession,
  finishMatch,
  removeGame,
  reorderQueue,
  selectSession,
  startQueuedMatch,
  useCurrentSessionId,
  useHydrated,
  useSessionDetail,
  useSessionsList,
} from "@/lib/store";
import type { AuthUser, Game, Session, SessionListItem, Team } from "@/lib/types";
import { AppHeader } from "./AppHeader";
import { AssignDialog, type AssignDialogConfig } from "./AssignDialog";
import { CourtBoard } from "./CourtBoard";
import { HistoryDialog } from "./HistoryDialog";
import { LoginDialog } from "./LoginDialog";
import { NextMatch } from "./NextMatch";
import { PlayerGrid } from "./PlayerGrid";
import { QueuePanel } from "./QueuePanel";
import { RosterDialog } from "./RosterDialog";
import { SessionDialog } from "./SessionDialog";
import { SessionSettingsDialog } from "./SessionSettingsDialog";
import { VisitorView } from "./VisitorView";
import {
  btn,
  cx,
  eyebrow,
  h1,
  selectInput,
  shimmerCard,
  spinner,
  toastBox,
} from "@/lib/ui";

export default function MatchApp() {
  const hydrated = useHydrated();
  const { user, loading: authLoading } = useAuth();
  const { data: sessions = [], loading: listLoading } = useSessionsList();
  const currentId = useCurrentSessionId();

  const [creating, setCreating] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);
  const [toast, setToast] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  function showToast(msg: string) {
    setToast(msg);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(""), 2600);
  }

  const activeId =
    sessions.find((s) => s.id === currentId)?.id ?? sessions[0]?.id ?? null;
  const isSuperadmin = user?.role === "SUPERADMIN";

  return (
    <div className="mx-auto max-w-[1190px] px-[30px] pb-14 max-[860px]:px-3.5 max-[860px]:pb-10">
      <AppHeader
        active="matches"
        user={user}
        onNewSession={() => setCreating(true)}
        onToast={showToast}
      />

      <main>
        {!hydrated || authLoading || listLoading ? (
          <div className={shimmerCard} aria-busy="true" />
        ) : activeId ? (
          user ? (
            <AdminSessionContainer
              key={activeId}
              sessionId={activeId}
              sessions={sessions}
              user={user}
              onToast={showToast}
            />
          ) : (
            <VisitorView sessionId={activeId} sessions={sessions} />
          )
        ) : (
          <section className="mx-auto mt-[12vh] max-w-[560px] text-center">
            <div className={eyebrow}>Game day</div>
            <h1 className={h1}>Play fair. Play more.</h1>
            <p className="mt-4 mb-[26px] leading-[1.6] text-muted">
              {isSuperadmin
                ? "Create a game session, add your players and assign matches to courts or the queue so everyone gets equal court time."
                : user
                  ? "No sessions yet. Ask a superadmin to create the first session."
                  : "No game sessions have been created yet. Check back on game day or log in as an organiser."}
            </p>
            {isSuperadmin ? (
              <button
                className={btn("primary", "lg")}
                onClick={() => setCreating(true)}
              >
                ＋ Create your first session
              </button>
            ) : !user ? (
              <button
                className={btn("primary", "lg")}
                onClick={() => setLoggingIn(true)}
              >
                Admin login
              </button>
            ) : null}
          </section>
        )}
      </main>

      {creating && isSuperadmin && (
        <SessionDialog onClose={() => setCreating(false)} />
      )}
      {loggingIn && (
        <LoginDialog
          onClose={() => setLoggingIn(false)}
          onLoggedIn={() => showToast("Logged in")}
        />
      )}

      <div
        className={cx(
          toastBox,
          toast ? "translate-y-0 opacity-100" : "translate-y-5 opacity-0",
        )}
        role="status"
      >
        {toast}
      </div>
    </div>
  );
}

function AdminSessionContainer({
  sessionId,
  sessions,
  user,
  onToast,
}: {
  sessionId: string;
  sessions: SessionListItem[];
  user: AuthUser;
  onToast: (msg: string) => void;
}) {
  const { data: session, loading } = useSessionDetail(sessionId);

  if (loading || !session) {
    return <div className={shimmerCard} aria-busy="true" />;
  }

  return (
    <SessionView
      session={session}
      sessions={sessions}
      user={user}
      onToast={onToast}
    />
  );
}

function SessionView({
  session,
  sessions,
  user,
  onToast,
}: {
  session: Session;
  sessions: SessionListItem[];
  user: AuthUser;
  onToast: (msg: string) => void;
}) {
  const [seed, setSeed] = useState(0);
  const [editingRoster, setEditingRoster] = useState(false);
  const [editingSettings, setEditingSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [assignConfig, setAssignConfig] = useState<AssignDialogConfig | null>(
    null,
  );
  const [deletingSession, setDeletingSession] = useState(false);
  const [promotingCourt, setPromotingCourt] = useState<number | null>(null);
  const [finishingGameId, setFinishingGameId] = useState<string | null>(null);
  const [movingGameId, setMovingGameId] = useState<string | null>(null);
  const [removingGameId, setRemovingGameId] = useState<string | null>(null);

  const isSuperadmin = user.role === "SUPERADMIN";
  const rec = useMemo(() => recommend(session, seed), [session, seed]);
  const nextUp = useMemo(() => new Set(rec?.players.map((p) => p.id)), [rec]);
  const queue = useMemo(() => queueOf(session), [session]);

  async function handleFinishGame(game: Game) {
    setFinishingGameId(game.id);
    try {
      await finishMatch(session.id, game.id);
      onToast(`Court ${game.courtNumber ?? ""} finished`);
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Could not finish match");
    } finally {
      setFinishingGameId(null);
    }
  }

  async function handlePromoteNext(courtNumber: number) {
    const first = queue[0];
    if (!first) return;
    setPromotingCourt(courtNumber);
    try {
      await startQueuedMatch(session.id, first.id, courtNumber);
      onToast(`Moved queued match onto Court ${courtNumber}`);
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Could not start queued match");
    } finally {
      setPromotingCourt(null);
    }
  }

  async function handleMoveQueue(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= queue.length) return;
    const moving = queue[index];
    const ids = queue.map((g) => g.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    setMovingGameId(moving.id);
    try {
      await reorderQueue(session.id, ids);
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Could not reorder queue");
    } finally {
      setMovingGameId(null);
    }
  }

  async function handleRemoveQueued(game: Game) {
    if (!window.confirm("Remove this queued match?")) return;
    setRemovingGameId(game.id);
    try {
      await removeGame(session.id, game.id);
      onToast("Queued match removed");
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Could not remove match");
    } finally {
      setRemovingGameId(null);
    }
  }

  async function handleDeleteSession() {
    if (!window.confirm(`Delete session “${session.name}”?`)) return;
    setDeletingSession(true);
    try {
      await deleteSession(session.id);
      onToast("Session deleted");
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Could not delete session");
    } finally {
      setDeletingSession(false);
    }
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
              className={selectInput}
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
          <button
            id="match-history"
            className={btn("light")}
            onClick={() => setShowHistory(true)}
          >
            History · {session.games.length}
          </button>
          {isSuperadmin && (
            <>
              <button
                id="edit-players"
                className={btn("light")}
                onClick={() => setEditingRoster(true)}
              >
                Edit players
              </button>
              <button
                id="session-settings"
                className={btn("light")}
                onClick={() => setEditingSettings(true)}
              >
                Session settings
              </button>
              <button
                className={btn("danger")}
                disabled={deletingSession}
                onClick={() => void handleDeleteSession()}
              >
                {deletingSession ? (
                  <>
                    <span className={cx(spinner, "mr-1.5")} />
                    Deleting…
                  </>
                ) : (
                  "Delete"
                )}
              </button>
            </>
          )}
        </div>
      </section>

      <CourtBoard
        session={session}
        promotingCourt={promotingCourt}
        finishingGameId={finishingGameId}
        onAssignCourt={(courtNumber) =>
          setAssignConfig({
            mode: "court",
            courtNumber,
            prefill: rec
              ? [
                  [rec.teams[0][0].id, rec.teams[0][1].id],
                  [rec.teams[1][0].id, rec.teams[1][1].id],
                ]
              : undefined,
          })
        }
        onPromoteNext={(c) => void handlePromoteNext(c)}
        onEditGame={(game) =>
          setAssignConfig({
            mode: game.status === "ON_COURT" ? "court" : "queue",
            editingGame: game,
          })
        }
        onFinishGame={(g) => void handleFinishGame(g)}
      />

      <QueuePanel
        session={session}
        movingGameId={movingGameId}
        removingGameId={removingGameId}
        onAddQueue={() =>
          setAssignConfig({
            mode: "queue",
            prefill: rec
              ? [
                  [rec.teams[0][0].id, rec.teams[0][1].id],
                  [rec.teams[1][0].id, rec.teams[1][1].id],
                ]
              : undefined,
          })
        }
        onEditGame={(game) =>
          setAssignConfig({
            mode: "queue",
            editingGame: game,
          })
        }
        onRemoveGame={(g) => void handleRemoveQueued(g)}
        onMoveQueue={(idx, dir) => void handleMoveQueue(idx, dir)}
      />

      <div className="grid grid-cols-[minmax(0,1.7fr)_minmax(300px,1fr)] items-start gap-[17px] max-[860px]:grid-cols-1">
        <div className="sticky top-4 order-2 max-[860px]:static max-[860px]:order-1">
          <NextMatch
            session={session}
            rec={rec}
            onShuffle={() => {
              setSeed((s) => s + 1);
              onToast("Shuffled — only players tied on games and rest can change");
            }}
            onAssignRecommended={(mode: "court" | "queue", teams: [Team, Team]) => {
              setAssignConfig({ mode, prefill: teams });
            }}
          />
        </div>
        <div className="order-1 min-w-0 max-[860px]:order-2">
          <PlayerGrid
            session={session}
            nextUp={nextUp}
            isSuperadmin={isSuperadmin}
            onToast={onToast}
          />
        </div>
      </div>

      {editingRoster && isSuperadmin && (
        <RosterDialog
          session={session}
          onClose={() => setEditingRoster(false)}
          onSaved={onToast}
        />
      )}
      {editingSettings && isSuperadmin && (
        <SessionSettingsDialog
          session={session}
          onClose={() => setEditingSettings(false)}
          onSaved={onToast}
        />
      )}
      {showHistory && (
        <HistoryDialog session={session} onClose={() => setShowHistory(false)} />
      )}
      {assignConfig && (
        <AssignDialog
          session={session}
          rec={rec}
          config={assignConfig}
          onClose={() => setAssignConfig(null)}
          onSaved={(msg) => {
            setSeed(0);
            onToast(msg);
          }}
        />
      )}
    </>
  );
}
