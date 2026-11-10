"use client";

import { fmtDate } from "@/lib/date";
import type { Session } from "../types";
import type { SessionDialogState } from "../hooks/useSessionDialogs";
import type { Recommendation } from "@/lib/match";
import { ConfirmDialog } from "@/components/ui";
import { AssignDialog } from "@/components/AssignDialog";
import { HistoryDialog } from "@/components/HistoryDialog";
import { RosterDialog } from "@/components/RosterDialog";
import { SessionSettingsDialog } from "@/components/SessionSettingsDialog";

export interface SessionDialogsProps {
  session: Session;
  dialog: SessionDialogState;
  rec: Recommendation | null;
  isSuperadmin: boolean;
  deletingSession: boolean;
  removingGameId: string | null;
  onClose: () => void;
  onAssignSaved: (msg: string) => void;
  onRosterSaved: (msg: string) => void;
  onSettingsSaved: (msg: string) => void;
  onConfirmRemoveQueued: () => void;
  onConfirmDeleteSession: () => void;
}

export function SessionDialogs({
  session,
  dialog,
  rec,
  isSuperadmin,
  deletingSession,
  removingGameId,
  onClose,
  onAssignSaved,
  onRosterSaved,
  onSettingsSaved,
  onConfirmRemoveQueued,
  onConfirmDeleteSession,
}: SessionDialogsProps) {
  if (dialog.type === "none") return null;

  if (dialog.type === "roster" && isSuperadmin) {
    return (
      <RosterDialog
        session={session}
        onClose={onClose}
        onSaved={onRosterSaved}
      />
    );
  }

  if (dialog.type === "settings" && isSuperadmin) {
    return (
      <SessionSettingsDialog
        session={session}
        onClose={onClose}
        onSaved={onSettingsSaved}
      />
    );
  }

  if (dialog.type === "history") {
    return <HistoryDialog session={session} onClose={onClose} />;
  }

  if (dialog.type === "assign") {
    return (
      <AssignDialog
        session={session}
        rec={rec}
        config={dialog.config}
        onClose={onClose}
        onSaved={onAssignSaved}
      />
    );
  }

  if (dialog.type === "removeQueued") {
    return (
      <ConfirmDialog
        title="Remove queued match?"
        description="Are you sure you want to remove this match from the queue? Its ticked players will have their match count reduced."
        confirmLabel="Remove match"
        busy={removingGameId === dialog.game.id}
        onConfirm={onConfirmRemoveQueued}
        onClose={onClose}
      />
    );
  }

  if (dialog.type === "deleteSession" && isSuperadmin) {
    return (
      <ConfirmDialog
        title={`Delete session “${session.name}”?`}
        description={`Permanently delete “${session.name}” (${fmtDate(session.date)}) and all its players and matches? This action cannot be undone.`}
        confirmLabel="Delete session"
        busy={deletingSession}
        onConfirm={onConfirmDeleteSession}
        onClose={onClose}
      />
    );
  }

  return null;
}
