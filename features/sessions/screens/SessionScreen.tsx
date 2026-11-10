"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth, can } from "@/features/auth";
import { toast } from "@/lib/toast";
import { queueOf, recommend } from "@/lib/match";
import type { Team } from "@/features/matches";
import { useSessionDetail } from "../queries";
import { Button, Card, Skeleton } from "@/components/ui";
import { AppHeader } from "@/components/AppHeader";
import { CourtBoard } from "@/components/CourtBoard";
import { NextMatch } from "@/components/NextMatch";
import { PlayerGrid } from "@/components/PlayerGrid";
import { QueuePanel } from "@/components/QueuePanel";
import { VisitorView } from "@/components/VisitorView";
import { SessionHeader } from "../components/SessionHeader";
import { SessionDialogs } from "../components/SessionDialogs";
import { useSessionDialogs } from "../hooks/useSessionDialogs";
import { useSessionActions } from "../hooks/useSessionActions";
import { eyebrow } from "@/lib/ui";

export interface SessionScreenProps {
  sessionId: string;
}

export function SessionScreenSkeleton() {
  return (
    <div className="mx-auto max-w-[1190px] px-[30px] pb-14 max-[860px]:px-3.5 max-[860px]:pb-10">
      <Skeleton className="mt-6 h-14" />
      <Skeleton className="mt-8 h-20" />
      <div className="mt-8 grid grid-cols-2 gap-4 max-[860px]:grid-cols-1">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
      <Skeleton className="mt-6 h-40" />
    </div>
  );
}

export function SessionScreen({ sessionId }: SessionScreenProps) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { data: session, error, loading } = useSessionDetail(sessionId);
  const [seed, setSeed] = useState(0);

  const dialogs = useSessionDialogs();
  const { state: actState, actions } = useSessionActions(session);

  const isSuperadmin = user ? can(user, "session:manage") : false;
  const rec = useMemo(() => (session ? recommend(session, seed) : null), [session, seed]);
  const nextUp = useMemo(() => new Set(rec?.players.map((p) => p.id) ?? []), [rec]);
  const queue = useMemo(() => (session ? queueOf(session) : []), [session]);

  if (loading || authLoading) return <SessionScreenSkeleton />;

  if (error || !session) {
    return (
      <div className="mx-auto max-w-[1190px] px-[30px] pb-14 max-[860px]:px-3.5 max-[860px]:pb-10">
        <AppHeader active="matches" user={user} onToast={toast.show} />
        <Card className="mx-auto mt-10 max-w-[480px] p-8 text-center">
          <div className={eyebrow}>Session not found</div>
          <h2 className="mt-2 font-display text-xl font-extrabold text-[#183e6b]">
            Could not load this session
          </h2>
          <p className="mt-2 mb-5 text-xs leading-relaxed text-muted">
            {error instanceof Error ? error.message : "This session may have been deleted."}
          </p>
          <Link href="/">
            <Button variant="primary">← Back to all sessions</Button>
          </Link>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-[1190px] px-[30px] pb-14 max-[860px]:px-3.5 max-[860px]:pb-10">
        <AppHeader active="matches" user={null} onToast={toast.show} />
        <VisitorView sessionId={sessionId} onBackToList={() => router.push("/")} />
      </div>
    );
  }

  function handleReorder(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= queue.length) return;
    const ids = queue.map((g) => g.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    void actions.moveQueue(ids, queue[index].id);
  }

  return (
    <div className="mx-auto max-w-[1190px] px-[30px] pb-14 max-[860px]:px-3.5 max-[860px]:pb-10">
      <AppHeader active="matches" user={user} onToast={toast.show} />

      <SessionHeader
        session={session}
        isSuperadmin={isSuperadmin}
        togglingStatus={actState.togglingStatus}
        deletingSession={actState.deletingSession}
        onToggleStatus={() => void actions.toggleStatus()}
        onOpenHistory={dialogs.openHistory}
        onOpenRoster={dialogs.openRoster}
        onOpenSettings={dialogs.openSettings}
        onConfirmDelete={dialogs.openDeleteSession}
      />

      <CourtBoard
        session={session}
        promotingCourt={actState.promotingCourt}
        finishingGameId={actState.finishingGameId}
        onAssignCourt={(courtNumber) =>
          dialogs.openAssign({
            mode: "court",
            courtNumber,
            prefill: rec ? [[rec.teams[0][0].id, rec.teams[0][1].id], [rec.teams[1][0].id, rec.teams[1][1].id]] : undefined,
          })
        }
        onPromoteNext={(c) => void actions.promoteNext(c, queue[0]?.id)}
        onEditGame={(g) => dialogs.openAssign({ mode: g.status === "ON_COURT" ? "court" : "queue", editingGame: g })}
        onFinishGame={(g) => void actions.finishGame(g.id, g.courtNumber)}
      />

      <QueuePanel
        session={session}
        movingGameId={actState.movingGameId}
        removingGameId={actState.removingGameId}
        onAddQueue={() =>
          dialogs.openAssign({
            mode: "queue",
            prefill: rec ? [[rec.teams[0][0].id, rec.teams[0][1].id], [rec.teams[1][0].id, rec.teams[1][1].id]] : undefined,
          })
        }
        onEditGame={(g) => dialogs.openAssign({ mode: "queue", editingGame: g })}
        onRemoveGame={(g) => dialogs.openRemoveQueued(g)}
        onMoveQueue={handleReorder}
      />

      <div className="grid grid-cols-[minmax(0,1.7fr)_minmax(300px,1fr)] items-start gap-[17px] max-[860px]:grid-cols-1">
        <div className="sticky top-4 order-2 max-[860px]:static max-[860px]:order-1">
          <NextMatch
            session={session}
            rec={rec}
            onShuffle={() => {
              setSeed((s) => s + 1);
              toast.show("Shuffled — only players tied on games and rest can change");
            }}
            onAssignRecommended={(mode: "court" | "queue", teams: [Team, Team]) => {
              dialogs.openAssign({ mode, prefill: teams });
            }}
          />
        </div>
        <div className="order-1 min-w-0 max-[860px]:order-2">
          <PlayerGrid session={session} nextUp={nextUp} isSuperadmin={isSuperadmin} onToast={toast.show} />
        </div>
      </div>

      <SessionDialogs
        session={session}
        dialog={dialogs.dialog}
        rec={rec}
        isSuperadmin={isSuperadmin}
        deletingSession={actState.deletingSession}
        removingGameId={actState.removingGameId}
        onClose={dialogs.closeDialog}
        onAssignSaved={(msg) => {
          setSeed(0);
          toast.show(msg);
        }}
        onRosterSaved={toast.show}
        onSettingsSaved={toast.show}
        onConfirmRemoveQueued={() => {
          if (dialogs.dialog.type === "removeQueued") {
            const gameId = dialogs.dialog.game.id;
            dialogs.closeDialog();
            void actions.removeQueuedGame(gameId);
          }
        }}
        onConfirmDeleteSession={() => {
          dialogs.closeDialog();
          void actions.deleteCurrentSession();
        }}
      />
    </div>
  );
}
