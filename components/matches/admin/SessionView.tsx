"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { fmtDate } from "@/lib/format";
import { prefillFromRec, queueOf, recommend } from "@/lib/match";
import {
  deleteSession,
  removeGame,
  reorderQueue,
  startQueuedMatch,
  updateSession,
  useTournamentsList,
} from "@/lib/store";
import { useToast } from "@/lib/stores/ui-store";
import { pill } from "@/lib/ui";
import type {
  AuthUser,
  Game,
  Session,
  SessionStatus,
  Team,
} from "@/lib/types";
import type { AssignDialogConfig } from "../AssignDialog";
import { CourtBoard } from "../CourtBoard";
import { NextMatch } from "../NextMatch";
import { PlayerGrid } from "../PlayerGrid";
import { QueuePanel } from "../QueuePanel";
import { PaymentChecklistCard } from "./PaymentChecklistCard";
import { SessionHeaderBar } from "./SessionHeaderBar";

const AssignDialog = dynamic(() =>
  import("../AssignDialog").then((m) => m.AssignDialog),
);
const FinishMatchDialog = dynamic(() =>
  import("../FinishMatchDialog").then((m) => m.FinishMatchDialog),
);
const HistoryDialog = dynamic(() =>
  import("../HistoryDialog").then((m) => m.HistoryDialog),
);
const RosterDialog = dynamic(() =>
  import("../RosterDialog").then((m) => m.RosterDialog),
);
const SessionSettingsDialog = dynamic(() =>
  import("../SessionSettingsDialog").then((m) => m.SessionSettingsDialog),
);
const TournamentCreateDialog = dynamic(() =>
  import("@/components/tournaments/TournamentCreateDialog").then(
    (m) => m.TournamentCreateDialog,
  ),
);

export function SessionView({
  session,
  user,
  onBackToList,
}: {
  session: Session;
  user: AuthUser;
  onBackToList?: () => void;
}) {
  const router = useRouter();
  const handleBack = onBackToList ?? (() => router.push("/sessions"));
  const showToast = useToast();
  const [seed, setSeed] = useState(0);
  const [editingRoster, setEditingRoster] = useState(false);
  const [editingSettings, setEditingSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [assignConfig, setAssignConfig] = useState<AssignDialogConfig | null>(
    null,
  );
  const [confirmDeleteSession, setConfirmDeleteSession] = useState(false);
  const [deletingSession, setDeletingSession] = useState(false);
  const [togglingStatus, setTogglingStatus] = useState(false);
  const [promotingCourt, setPromotingCourt] = useState<number | null>(null);
  const [finishingGame, setFinishingGame] = useState<Game | null>(null);
  const [movingGameId, setMovingGameId] = useState<string | null>(null);
  const [confirmRemoveQueued, setConfirmRemoveQueued] = useState<Game | null>(
    null,
  );
  const [removingGameId, setRemovingGameId] = useState<string | null>(null);
  const [creatingTournament, setCreatingTournament] = useState(false);
  const [excludeTournamentPlayers, setExcludeTournamentPlayers] = useState(true);

  const { data: linkedTournaments } = useTournamentsList({
    sessionId: session.id,
  });

  const activeTournamentPlayerIds = useMemo(() => {
    const ids = new Set<string>();
    for (const t of linkedTournaments) {
      if (t.status === "IN_PROGRESS") {
        for (const pid of t.activePlayerIds) ids.add(pid);
      }
    }
    return ids;
  }, [linkedTournaments]);

  const isSuperadmin = user.role === "SUPERADMIN";
  const rec = useMemo(
    () =>
      recommend(
        session,
        seed,
        undefined,
        excludeTournamentPlayers ? activeTournamentPlayerIds : undefined,
      ),
    [session, seed, excludeTournamentPlayers, activeTournamentPlayerIds],
  );
  const nextUp = useMemo(() => new Set(rec?.players.map((p) => p.id)), [rec]);
  const queue = useMemo(() => queueOf(session), [session]);

  useEffect(() => {
    const warm = () => {
      void import("../AssignDialog");
      void import("../FinishMatchDialog");
      void import("../HistoryDialog");
      void import("../RosterDialog");
      void import("../SessionSettingsDialog");
    };
    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      const id = window.requestIdleCallback(warm, { timeout: 2500 });
      return () => window.cancelIdleCallback(id);
    }
    const t = setTimeout(warm, 1500);
    return () => clearTimeout(t);
  }, []);

  async function handleToggleSessionStatus() {
    const nextStatus: SessionStatus =
      session.status === "OPEN" ? "CLOSED" : "OPEN";
    setTogglingStatus(true);
    try {
      await updateSession(session.id, { status: nextStatus });
      showToast(
        nextStatus === "OPEN"
          ? "Session opened — now visible to visitors"
          : "Session closed — now restricted to organisers",
      );
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Could not update session status",
      );
    } finally {
      setTogglingStatus(false);
    }
  }

  async function handlePromoteNext(courtNumber: number) {
    const first = queue[0];
    if (!first) return;
    setPromotingCourt(courtNumber);
    try {
      await startQueuedMatch(session.id, first.id, courtNumber);
      showToast(`Moved queued match onto Court ${courtNumber}`);
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Could not start queued match",
      );
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
      showToast(err instanceof Error ? err.message : "Could not reorder queue");
    } finally {
      setMovingGameId(null);
    }
  }

  async function handleConfirmRemoveQueued() {
    if (!confirmRemoveQueued) return;
    setRemovingGameId(confirmRemoveQueued.id);
    try {
      await removeGame(session.id, confirmRemoveQueued.id);
      setConfirmRemoveQueued(null);
      showToast("Queued match removed");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not remove match");
    } finally {
      setRemovingGameId(null);
    }
  }

  async function handleConfirmDeleteSession() {
    setDeletingSession(true);
    try {
      await deleteSession(session.id);
      setConfirmDeleteSession(false);
      showToast("Session deleted");
      handleBack();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not delete session");
    } finally {
      setDeletingSession(false);
    }
  }

  return (
    <>
      <SessionHeaderBar
        session={session}
        isSuperadmin={isSuperadmin}
        togglingStatus={togglingStatus}
        deletingSession={deletingSession}
        onBackToList={handleBack}
        onShowHistory={() => setShowHistory(true)}
        onEditRoster={() => setEditingRoster(true)}
        onEditSettings={() => setEditingSettings(true)}
        onToggleStatus={() => void handleToggleSessionStatus()}
        onCreateTournament={() => setCreatingTournament(true)}
        onRequestDelete={() => setConfirmDeleteSession(true)}
      />

      {linkedTournaments.length > 0 && (
        <section className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#fde68a] bg-[linear-gradient(135deg,#fffbeb,#f4faff)] px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-extrabold text-[#92400e]">
              🏆 Linked Tournament{linkedTournaments.length > 1 ? "s" : ""}:
            </span>
            {linkedTournaments.map((t) => (
              <Link
                key={t.id}
                href={`/tournaments/${t.id}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#dcebf8] bg-white px-3 py-1 text-xs font-extrabold text-[#183e6b] no-underline hover:border-[#56a2e6]"
              >
                <span>{t.name}</span>
                <span
                  className={pill(
                    t.status === "IN_PROGRESS"
                      ? "ok"
                      : t.status === "DRAFT"
                        ? "warn"
                        : "default",
                  )}
                >
                  {t.status === "IN_PROGRESS"
                    ? "Live"
                    : t.status === "DRAFT"
                      ? "Draft"
                      : "Done"}
                </span>
                <span className="text-[#337fc4]">→</span>
              </Link>
            ))}
          </div>
          {activeTournamentPlayerIds.size > 0 && (
            <span className="text-[11px] font-bold text-[#92400e]">
              {activeTournamentPlayerIds.size} active in bracket · eliminated
              pairs flow to casual courts
            </span>
          )}
        </section>
      )}

      <CourtBoard
        session={session}
        promotingCourt={promotingCourt}
        finishingGameId={null}
        onAssignCourt={(courtNumber) =>
          setAssignConfig({
            mode: "court",
            courtNumber,
            prefill: prefillFromRec(rec),
          })
        }
        onPromoteNext={(c) => void handlePromoteNext(c)}
        onEditGame={(game) =>
          setAssignConfig({
            mode: game.status === "ON_COURT" ? "court" : "queue",
            editingGame: game,
          })
        }
        onFinishGame={(g) => setFinishingGame(g)}
      />

      <QueuePanel
        session={session}
        movingGameId={movingGameId}
        removingGameId={removingGameId}
        onAddQueue={() =>
          setAssignConfig({
            mode: "queue",
            prefill: prefillFromRec(rec),
          })
        }
        onEditGame={(game) =>
          setAssignConfig({
            mode: "queue",
            editingGame: game,
          })
        }
        onRemoveGame={(g) => setConfirmRemoveQueued(g)}
        onMoveQueue={(idx, dir) => void handleMoveQueue(idx, dir)}
      />

      <div className="grid grid-cols-[minmax(0,1.7fr)_minmax(300px,1fr)] items-start gap-[17px] max-[860px]:grid-cols-1">
        <div className="sticky top-4 order-2 max-[860px]:static max-[860px]:order-1">
          <NextMatch
            session={session}
            rec={rec}
            tournamentFilter={
              activeTournamentPlayerIds.size > 0
                ? {
                    activeCount: activeTournamentPlayerIds.size,
                    casualCount: Math.max(
                      0,
                      session.players.length - activeTournamentPlayerIds.size,
                    ),
                    excluded: excludeTournamentPlayers,
                    onToggle: setExcludeTournamentPlayers,
                  }
                : undefined
            }
            onShuffle={() => {
              setSeed((s) => s + 1);
              showToast("Shuffled — tried a fresh match combination");
            }}
            onAssignRecommended={(mode: "court" | "queue", teams: [Team, Team]) => {
              setAssignConfig({ mode, prefill: teams });
            }}
          />
        </div>
        <div className="order-1 min-w-0 max-[860px]:order-2">
          <PlayerGrid session={session} nextUp={nextUp} />
        </div>
      </div>

      <PaymentChecklistCard session={session} />

      {editingRoster && (
        <RosterDialog
          session={session}
          onClose={() => setEditingRoster(false)}
          onSaved={showToast}
        />
      )}
      {editingSettings && (
        <SessionSettingsDialog
          session={session}
          onClose={() => setEditingSettings(false)}
          onSaved={showToast}
        />
      )}
      {showHistory && (
        <HistoryDialog session={session} onClose={() => setShowHistory(false)} />
      )}
      {finishingGame && (
        <FinishMatchDialog
          session={session}
          game={finishingGame}
          onClose={() => setFinishingGame(null)}
          onSaved={showToast}
        />
      )}
      {assignConfig && (
        <AssignDialog
          session={session}
          rec={rec}
          config={assignConfig}
          onClose={() => setAssignConfig(null)}
          onSaved={(msg) => {
            setSeed(0);
            showToast(msg);
          }}
        />
      )}
      {confirmRemoveQueued && (
        <ConfirmDialog
          title="Remove queued match?"
          description="Are you sure you want to remove this match from the queue? Its ticked players will have their match count reduced."
          confirmLabel="Remove match"
          busy={removingGameId === confirmRemoveQueued.id}
          onConfirm={() => void handleConfirmRemoveQueued()}
          onClose={() => setConfirmRemoveQueued(null)}
        />
      )}
      {confirmDeleteSession && (
        <ConfirmDialog
          title={`Delete session “${session.name}”?`}
          description={`Permanently delete “${session.name}” (${fmtDate(session.date)}) and all its players and matches? This action cannot be undone.`}
          confirmLabel="Delete session"
          busy={deletingSession}
          onConfirm={() => void handleConfirmDeleteSession()}
          onClose={() => setConfirmDeleteSession(false)}
        />
      )}
      {creatingTournament && (
        <TournamentCreateDialog
          defaultSessionId={session.id}
          onClose={() => setCreatingTournament(false)}
          onCreated={(created) => {
            setCreatingTournament(false);
            router.push(`/tournaments/${created.id}`);
          }}
        />
      )}
    </>
  );
}
