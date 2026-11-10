"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/toast";
import type { Session } from "../types";
import {
  useDeleteSessionMutation,
  useUpdateSessionMutation,
} from "../mutations";
import {
  useFinishMatch,
  useRemoveGame,
  useReorderQueue,
  useStartQueuedMatch,
} from "@/features/matches";

export function useSessionActions(session: Session | null | undefined) {
  const router = useRouter();
  const sessionId = session?.id ?? "";

  const [togglingStatus, setTogglingStatus] = useState(false);
  const [deletingSession, setDeletingSession] = useState(false);
  const [promotingCourt, setPromotingCourt] = useState<number | null>(null);
  const [finishingGameId, setFinishingGameId] = useState<string | null>(null);
  const [movingGameId, setMovingGameId] = useState<string | null>(null);
  const [removingGameId, setRemovingGameId] = useState<string | null>(null);

  const updateMutation = useUpdateSessionMutation(sessionId);
  const deleteMutation = useDeleteSessionMutation();
  const startQueuedMutation = useStartQueuedMatch(sessionId);
  const finishMatchMutation = useFinishMatch(sessionId);
  const reorderQueueMutation = useReorderQueue(sessionId);
  const removeGameMutation = useRemoveGame(sessionId);

  async function toggleStatus() {
    if (!session) return;
    const nextStatus = session.status === "OPEN" ? "CLOSED" : "OPEN";
    setTogglingStatus(true);
    try {
      await updateMutation.mutateAsync({ status: nextStatus });
      toast.show(
        nextStatus === "OPEN"
          ? "Session opened — now visible to visitors"
          : "Session closed — now restricted to organisers",
      );
    } catch (err) {
      toast.show(err instanceof Error ? err.message : "Could not update status");
    } finally {
      setTogglingStatus(false);
    }
  }

  async function finishGame(gameId: string, courtNumber?: number | null) {
    if (!session) return;
    setFinishingGameId(gameId);
    try {
      await finishMatchMutation.mutateAsync(gameId);
      toast.show(`Court ${courtNumber ?? ""} finished`);
    } catch (err) {
      toast.show(err instanceof Error ? err.message : "Could not finish match");
    } finally {
      setFinishingGameId(null);
    }
  }

  async function promoteNext(courtNumber: number, queueGameId?: string) {
    if (!session || !queueGameId) return;
    setPromotingCourt(courtNumber);
    try {
      await startQueuedMutation.mutateAsync({
        gameId: queueGameId,
        courtNumber,
      });
      toast.show(`Moved queued match onto Court ${courtNumber}`);
    } catch (err) {
      toast.show(err instanceof Error ? err.message : "Could not start queued match");
    } finally {
      setPromotingCourt(null);
    }
  }

  async function moveQueue(gameIds: string[], movingId: string) {
    if (!session) return;
    setMovingGameId(movingId);
    try {
      await reorderQueueMutation.mutateAsync(gameIds);
    } catch (err) {
      toast.show(err instanceof Error ? err.message : "Could not reorder queue");
    } finally {
      setMovingGameId(null);
    }
  }

  async function removeQueuedGame(gameId: string) {
    if (!session) return;
    setRemovingGameId(gameId);
    try {
      await removeGameMutation.mutateAsync(gameId);
      toast.show("Queued match removed");
    } catch (err) {
      toast.show(err instanceof Error ? err.message : "Could not remove match");
    } finally {
      setRemovingGameId(null);
    }
  }

  async function deleteCurrentSession() {
    if (!session) return;
    setDeletingSession(true);
    try {
      await deleteMutation.mutateAsync(session.id);
      toast.show("Session deleted");
      router.push("/");
    } catch (err) {
      toast.show(err instanceof Error ? err.message : "Could not delete session");
    } finally {
      setDeletingSession(false);
    }
  }

  return {
    state: {
      togglingStatus,
      deletingSession,
      promotingCourt,
      finishingGameId,
      movingGameId,
      removingGameId,
    },
    actions: {
      toggleStatus,
      finishGame,
      promoteNext,
      moveQueue,
      removeQueuedGame,
      deleteCurrentSession,
    },
  };
}

