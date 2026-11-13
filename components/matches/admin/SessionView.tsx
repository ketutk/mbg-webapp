"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { fmtDate } from "@/lib/format";
import { prefillFromRec, queueOf, recommend } from "@/lib/match";
import {
  deleteSession,
  finishMatch,
  removeGame,
  reorderQueue,
  startQueuedMatch,
  updateSession,
} from "@/lib/store";
import { useToast } from "@/lib/stores/ui-store";
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
import { SessionHeaderBar } from "./SessionHeaderBar";

const AssignDialog = dynamic(() =>
  import("../AssignDialog").then((m) => m.AssignDialog),
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

export function SessionView({
  session,
  user,
}: {
  session: Session;
  user: AuthUser;
}) {
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
  const [finishingGameId, setFinishingGameId] = useState<string | null>(null);
  const [movingGameId, setMovingGameId] = useState<string | null>(null);
  const [confirmRemoveQueued, setConfirmRemoveQueued] = useState<Game | null>(
    null,
  );
  const [removingGameId, setRemovingGameId] = useState<string | null>(null);

  const isSuperadmin = user.role === "SUPERADMIN";
  const rec = useMemo(() => recommend(session, seed), [session, seed]);
  const nextUp = useMemo(() => new Set(rec?.players.map((p) => p.id)), [rec]);
  const queue = useMemo(() => queueOf(session), [session]);

  useEffect(() => {
    const warm = () => {
      void import("../AssignDialog");
      void import("../HistoryDialog");
      if (isSuperadmin) {
        void import("../RosterDialog");
        void import("../SessionSettingsDialog");
      }
    };
    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      const id = window.requestIdleCallback(warm, { timeout: 2500 });
      return () => window.cancelIdleCallback(id);
    }
    const t = setTimeout(warm, 1500);
    return () => clearTimeout(t);
  }, [isSuperadmin]);

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

  async function handleFinishGame(game: Game) {
    setFinishingGameId(game.id);
    try {
      await finishMatch(session.id, game.id);
      showToast(`Court ${game.courtNumber ?? ""} finished`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not finish match");
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
        onShowHistory={() => setShowHistory(true)}
        onEditRoster={() => setEditingRoster(true)}
        onEditSettings={() => setEditingSettings(true)}
        onToggleStatus={() => void handleToggleSessionStatus()}
        onRequestDelete={() => setConfirmDeleteSession(true)}
      />

      <CourtBoard
        session={session}
        promotingCourt={promotingCourt}
        finishingGameId={finishingGameId}
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
        onFinishGame={(g) => void handleFinishGame(g)}
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
            onShuffle={() => {
              setSeed((s) => s + 1);
              showToast("Shuffled — only players tied on games and rest can change");
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
          />
        </div>
      </div>

      {editingRoster && isSuperadmin && (
        <RosterDialog
          session={session}
          onClose={() => setEditingRoster(false)}
          onSaved={showToast}
        />
      )}
      {editingSettings && isSuperadmin && (
        <SessionSettingsDialog
          session={session}
          onClose={() => setEditingSettings(false)}
          onSaved={showToast}
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
    </>
  );
}
