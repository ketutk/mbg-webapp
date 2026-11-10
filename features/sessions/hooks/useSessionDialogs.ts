"use client";

import { useState } from "react";
import type { Game } from "@/features/matches";
import type { AssignDialogConfig } from "@/components/AssignDialog";

export type SessionDialogState =
  | { type: "none" }
  | { type: "roster" }
  | { type: "settings" }
  | { type: "history" }
  | { type: "assign"; config: AssignDialogConfig }
  | { type: "removeQueued"; game: Game }
  | { type: "deleteSession" };

export function useSessionDialogs() {
  const [dialog, setDialog] = useState<SessionDialogState>({ type: "none" });

  return {
    dialog,
    openRoster: () => setDialog({ type: "roster" }),
    openSettings: () => setDialog({ type: "settings" }),
    openHistory: () => setDialog({ type: "history" }),
    openAssign: (config: AssignDialogConfig) => setDialog({ type: "assign", config }),
    openRemoveQueued: (game: Game) => setDialog({ type: "removeQueued", game }),
    openDeleteSession: () => setDialog({ type: "deleteSession" }),
    closeDialog: () => setDialog({ type: "none" }),
  };
}
