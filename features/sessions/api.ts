import { api } from "@/lib/api";
import type { RosterInput, SessionInput, SessionPatchInput } from "./schemas";
import type { Session, SessionSummary, SessionsFilterParams, SessionsPage } from "./types";

function buildSessionSearchParams(params: SessionsFilterParams = {}): string {
  const sp = new URLSearchParams();
  const { from, to, status, q, page, pageSize } = params;
  if (from) sp.set("from", from);
  if (to) sp.set("to", to);
  if (status && status !== "ALL") sp.set("status", status);
  if (q?.trim()) sp.set("q", q.trim());
  if (page && page > 1) sp.set("page", String(page));
  if (pageSize) sp.set("pageSize", String(pageSize));
  return sp.toString();
}

export async function fetchSessionsPage(
  params?: SessionsFilterParams,
): Promise<SessionsPage> {
  const qs = buildSessionSearchParams(params);
  return api<SessionsPage>(qs ? `/sessions?${qs}` : "/sessions");
}

export async function fetchSessionDetail(id: string): Promise<Session> {
  const { session } = await api<{ session: Session }>(`/sessions/${id}`);
  return session;
}

export async function fetchSessionSummary(id: string): Promise<SessionSummary> {
  const { summary } = await api<{ summary: SessionSummary }>(
    `/sessions/${id}/summary`,
  );
  return summary;
}

export async function postCreateSession(input: SessionInput): Promise<Session> {
  const { session } = await api<{ session: Session }>("/sessions", {
    method: "POST",
    body: input,
  });
  return session;
}

export async function patchUpdateSession(
  id: string,
  input: SessionPatchInput,
): Promise<Session> {
  const { session } = await api<{ session: Session }>(`/sessions/${id}`, {
    method: "PATCH",
    body: input,
  });
  return session;
}

export async function deleteSessionRecord(id: string): Promise<void> {
  await api<{ ok: boolean }>(`/sessions/${id}`, { method: "DELETE" });
}

export async function putRoster(
  sessionId: string,
  input: RosterInput,
): Promise<Session> {
  const { session } = await api<{ session: Session }>(
    `/sessions/${sessionId}/players`,
    {
      method: "PUT",
      body: input,
    },
  );
  return session;
}
