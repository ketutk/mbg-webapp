"use client";

import { useState } from "react";
import { fmtDate } from "@/lib/date";
import { toast } from "@/lib/toast";
import type { AuthUser } from "@/features/auth";
import { can } from "@/features/auth";
import type { SessionListItem, SessionStatus } from "../types";
import { useSessionsList } from "../queries";
import { useDeleteSessionMutation } from "../mutations";
import { patchUpdateSession } from "../api";
import { useSessionsFilters } from "../hooks/useSessionsFilters";
import { SessionsFilterBar } from "./SessionsFilterBar";
import { SessionsTable } from "./SessionsTable";
import { Button, Card, ConfirmDialog, Pagination, Pill, Skeleton } from "@/components/ui";
import { cardFoot, cardHead, cardTitle, cx, empty, eyebrow, h1, spinner, sub } from "@/lib/ui";

export interface SessionsDirectoryProps {
  user: AuthUser;
  currentSessionId?: string | null;
  onNewSession?: () => void;
}

export function SessionsDirectory({
  user,
  currentSessionId = null,
  onNewSession,
}: SessionsDirectoryProps) {
  const isSuperadmin = can(user, "session:manage");
  const { state, setters, filterParams, hasActiveFilters, resetFilters } =
    useSessionsFilters(true);

  const { data, loading, fetching } = useSessionsList(filterParams);
  const deleteMutation = useDeleteSessionMutation();
  const [togglingId, setTogglingId] = useState<string | null>(null);

  if (loading && !data) return <Skeleton className="mt-8 h-80" />;
  if (!data) return null;

  async function handleToggleStatus(item: SessionListItem) {
    const nextStatus: SessionStatus = item.status === "OPEN" ? "CLOSED" : "OPEN";
    setTogglingId(item.id);
    try {
      await patchUpdateSession(item.id, { status: nextStatus });
      toast.show(`Session “${item.name}” marked as ${nextStatus === "OPEN" ? "Open" : "Closed"}`);
    } catch (err) {
      toast.show(err instanceof Error ? err.message : "Could not update session status");
    } finally {
      setTogglingId(null);
    }
  }

  async function handleConfirmDelete() {
    if (!state.deletingSession) return;
    setters.setDeletingBusy(true);
    try {
      await deleteMutation.mutateAsync(state.deletingSession.id);
      setters.setDeletingSession(null);
    } finally {
      setters.setDeletingBusy(false);
    }
  }

  return (
    <>
      <section className="mt-8 mb-5 flex flex-wrap items-end justify-between gap-4 max-[860px]:mt-6 max-[860px]:mb-4">
        <div>
          <div className={eyebrow}>Organiser dashboard</div>
          <h1 className={h1}>Match sessions</h1>
          <div className="mt-1 text-xs text-muted">
            Browse all {data.openCount + data.closedCount} sessions ({data.openCount} open · {data.closedCount} closed).
          </div>
        </div>
        {isSuperadmin && onNewSession && (
          <Button variant="primary" onClick={onNewSession}>
            ＋ New session
          </Button>
        )}
      </section>

      <Card id="sessions-directory" aria-labelledby="sessions-directory-title">
        <div className={cardHead}>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className={cardTitle} id="sessions-directory-title">All game sessions</h2>
              <Pill variant="ok">{data.openCount} open</Pill>
              <Pill variant="default">{data.closedCount} closed</Pill>
            </div>
            <div className={sub}>Closed sessions are visible only to admins and superadmins.</div>
          </div>
          <div className="flex items-center gap-2">
            {fetching && (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#5089b7]" aria-live="polite">
                <span className={spinner} /> Syncing…
              </span>
            )}
            <Pill variant="default">{data.totalSessions} session{data.totalSessions === 1 ? "" : "s"}</Pill>
          </div>
        </div>

        <SessionsFilterBar
          preset={state.preset}
          customFrom={state.customFrom}
          customTo={state.customTo}
          statusFilter={state.statusFilter}
          searchText={state.searchText}
          isOrganiser={true}
          hasActiveFilters={hasActiveFilters}
          onPresetChange={setters.setPreset}
          onCustomFromChange={setters.setCustomFrom}
          onCustomToChange={setters.setCustomTo}
          onStatusChange={setters.setStatusFilter}
          onSearchChange={(q) => { setters.setSearchText(q); setters.setPage(1); }}
          onReset={resetFilters}
        />

        {data.sessions.length === 0 ? (
          <div className={empty}>
            {hasActiveFilters
              ? "No sessions match your filter. Try adjusting dates, status, or search query."
              : isSuperadmin
                ? "No game sessions yet. Click “＋ New session” to create one."
                : "No game sessions yet. Ask a superadmin to create one."}
          </div>
        ) : (
          <SessionsTable
            sessions={data.sessions}
            currentSessionId={currentSessionId}
            togglingId={togglingId}
            isOrganiser={true}
            isSuperadmin={isSuperadmin}
            onToggleStatus={(item) => void handleToggleStatus(item)}
            onDeleteSession={setters.setDeletingSession}
          />
        )}

        <div className={cx(cardFoot, "flex-wrap gap-3 bg-[#fafdff]")}>
          <Pagination
            page={data.page}
            totalPages={data.totalPages}
            pageSize={data.pageSize}
            totalEntries={data.totalSessions}
            entryLabel="sessions"
            pageSizeOptions={[5, 10, 25, 50]}
            isPending={fetching}
            onPageChange={setters.setPage}
            onPageSizeChange={(ps) => { setters.setPageSize(ps); setters.setPage(1); }}
          />
        </div>
      </Card>

      {state.deletingSession && (
        <ConfirmDialog
          title={`Delete session “${state.deletingSession.name}”?`}
          description={`Permanently delete “${state.deletingSession.name}” (${fmtDate(state.deletingSession.date)})? This cannot be undone.`}
          confirmLabel="Delete session"
          busy={state.deletingBusy}
          onConfirm={() => void handleConfirmDelete()}
          onClose={() => setters.setDeletingSession(null)}
        />
      )}
    </>
  );
}
