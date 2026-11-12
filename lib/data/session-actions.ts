import { api } from "../api";
import { queryClient, queryKeys } from "../query";
import type { SessionInput, SessionPatchInput } from "../schemas";
import type { Session } from "../types";
import { CURRENT_KEY, selectSession } from "./current-session";

export async function createSession(input: SessionInput): Promise<Session> {
  const { session } = await api<{ session: Session }>("/sessions", {
    method: "POST",
    body: input,
  });
  queryClient.setQueryData<Session>(queryKeys.sessionDetail(session.id), session);
  selectSession(session.id);
  void queryClient.invalidateQueries({ queryKey: queryKeys.sessionsList });
  void queryClient.invalidateQueries({
    queryKey: queryKeys.sessionSummary(session.id),
  });
  return session;
}

export async function updateSession(
  id: string,
  input: SessionPatchInput,
): Promise<Session> {
  const { session } = await api<{ session: Session }>(`/sessions/${id}`, {
    method: "PATCH",
    body: input,
  });
  queryClient.setQueryData<Session>(queryKeys.sessionDetail(id), session);
  void queryClient.invalidateQueries({ queryKey: queryKeys.sessionsList });
  void queryClient.invalidateQueries({ queryKey: queryKeys.sessionSummary(id) });
  return session;
}

export async function deleteSession(id: string): Promise<void> {
  await api<{ ok: boolean }>(`/sessions/${id}`, { method: "DELETE" });
  queryClient.removeQueries({ queryKey: queryKeys.sessionDetail(id) });
  queryClient.removeQueries({ queryKey: queryKeys.sessionSummary(id) });
  if (localStorage.getItem(CURRENT_KEY) === id) {
    selectSession(null);
  }
  void queryClient.invalidateQueries({ queryKey: queryKeys.sessionsList });
}

export async function setRoster(
  sessionId: string,
  names: string[],
): Promise<Session> {
  const { session } = await api<{ session: Session }>(
    `/sessions/${sessionId}/players`,
    {
      method: "PUT",
      body: { names },
    },
  );
  queryClient.setQueryData<Session>(queryKeys.sessionDetail(sessionId), session);
  void queryClient.invalidateQueries({ queryKey: queryKeys.sessionsList });
  void queryClient.invalidateQueries({
    queryKey: queryKeys.sessionSummary(sessionId),
  });
  return session;
}

