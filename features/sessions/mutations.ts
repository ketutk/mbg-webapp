import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  deleteSessionRecord,
  patchUpdateSession,
  postCreateSession,
  putRoster,
} from "./api";
import { invalidateSession } from "./invalidate";
import { sessionKeys } from "./keys";
import type { RosterInput, SessionInput, SessionPatchInput } from "./schemas";
import type { Session } from "./types";

export function useCreateSessionMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SessionInput) => postCreateSession(input),
    meta: { success: "Session created", error: "Could not create session" },
    onSuccess: (session) => {
      qc.setQueryData(sessionKeys.detail(session.id), session);
      void qc.invalidateQueries({ queryKey: sessionKeys.list });
    },
  });
}

export function useUpdateSessionMutation(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SessionPatchInput) => patchUpdateSession(id, input),
    meta: { success: "Session updated", error: "Could not update session" },
    onSuccess: (session) => {
      qc.setQueryData(sessionKeys.detail(id), session);
      void invalidateSession(qc, id);
    },
  });
}

export function useDeleteSessionMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteSessionRecord(id),
    meta: { success: "Session deleted", error: "Could not delete session" },
    onSuccess: (_data, id) => {
      qc.removeQueries({ queryKey: sessionKeys.detail(id) });
      qc.removeQueries({ queryKey: sessionKeys.summary(id) });
      void qc.invalidateQueries({ queryKey: sessionKeys.list });
    },
  });
}

export function useUpdateRosterMutation(sessionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: RosterInput) => putRoster(sessionId, input),
    meta: { success: "Roster updated", error: "Could not update roster" },
    onSuccess: (session) => {
      qc.setQueryData(sessionKeys.detail(sessionId), session);
      void invalidateSession(qc, sessionId);
    },
  });
}

// Standalone actions for backward compatibility
export async function createSession(input: SessionInput): Promise<Session> {
  return postCreateSession(input);
}

export async function updateSession(
  id: string,
  input: SessionPatchInput,
): Promise<Session> {
  return patchUpdateSession(id, input);
}

export async function deleteSession(id: string): Promise<void> {
  await deleteSessionRecord(id);
}

export async function setRoster(
  sessionId: string,
  names: string[],
): Promise<Session> {
  return putRoster(sessionId, { names });
}

