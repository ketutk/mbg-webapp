"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { TablePagination } from "@/components/ui/TablePagination";
import { fmtDate } from "@/lib/format";
import {
  deleteSession,
  selectSession,
  updateSession,
  useSessionsList,
} from "@/lib/store";
import type { AuthUser, SessionListItem, SessionStatus } from "@/lib/types";
import {
  card,
  cardHead,
  cardTitle,
  pill,
  shimmerCard,
  spinner,
  sub,
} from "@/lib/ui";
import { SessionsFilterToolbar } from "./SessionsFilterToolbar";
import { SessionsHero } from "./SessionsHero";
import { SessionsTable } from "./SessionsTable";
import { useSessionFilters } from "./useSessionFilters";

export function SessionsDirectory({
  user,
  currentSessionId,
  onSelectSession,
  onToast,
}: {
  user: AuthUser;
  currentSessionId: string | null;
  onSelectSession: (id: string) => void;
  onToast: (msg: string) => void;
}) {
  const isSuperadmin = user.role === "SUPERADMIN";

  const {
    preset,
    setPreset,
    customFrom,
    setCustomFrom,
    customTo,
    setCustomTo,
    statusFilter,
    setStatusFilter,
    searchText,
    setSearchText,
    setPage,
    pageSize,
    setPageSize,
    filterParams,
    hasActiveFilters,
    resetFilters,
  } = useSessionFilters();

  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingSession, setDeletingSession] =
    useState<SessionListItem | null>(null);
  const [deletingBusy, setDeletingBusy] = useState(false);

  const { data, loading, fetching } = useSessionsList(filterParams);

  if (loading && !data) {
    return <div className={shimmerCard} aria-busy="true" />;
  }

  if (!data) return null;

  async function handleToggleStatus(item: SessionListItem) {
    const nextStatus: SessionStatus =
      item.status === "OPEN" ? "CLOSED" : "OPEN";
    setTogglingId(item.id);
    try {
      await updateSession(item.id, { status: nextStatus });
      onToast(
        `Session “${item.name}” marked as ${nextStatus === "OPEN" ? "Open" : "Closed"}`,
      );
    } catch (err) {
      onToast(
        err instanceof Error ? err.message : "Could not update session status",
      );
    } finally {
      setTogglingId(null);
    }
  }

  async function handleConfirmDeleteSession() {
    if (!deletingSession) return;
    setDeletingBusy(true);
    try {
      const targetName = deletingSession.name;
      await deleteSession(deletingSession.id);
      setDeletingSession(null);
      onToast(`Session “${targetName}” deleted`);
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Could not delete session");
    } finally {
      setDeletingBusy(false);
    }
  }

  return (
    <>
      {!currentSessionId && (
        <SessionsHero
          openCount={data.openCount}
          closedCount={data.closedCount}
          isSuperadmin={isSuperadmin}
        />
      )}

      <section
        id="sessions-directory"
        className={card}
        aria-labelledby="sessions-directory-title"
      >
        <div className={cardHead}>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className={cardTitle} id="sessions-directory-title">
                All game sessions
              </h2>
              <span className={pill("ok")}>{data.openCount} open</span>
              <span className={pill("default")}>
                {data.closedCount} closed
              </span>
            </div>
            <div className={sub}>
              Closed sessions are hidden from public visitors and visible only
              to admins and superadmins.
            </div>
          </div>
          <div className="flex items-center gap-2">
            {fetching && (
              <span
                className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#5089b7]"
                aria-live="polite"
              >
                <span className={spinner} />
                Updating…
              </span>
            )}
            <span className={pill("default")}>
              {data.totalSessions} session{data.totalSessions === 1 ? "" : "s"}
            </span>
          </div>
        </div>

        <SessionsFilterToolbar
          preset={preset}
          setPreset={setPreset}
          customFrom={customFrom}
          setCustomFrom={setCustomFrom}
          customTo={customTo}
          setCustomTo={setCustomTo}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          searchText={searchText}
          setSearchText={setSearchText}
          setPage={setPage}
          hasActiveFilters={hasActiveFilters}
          onReset={resetFilters}
        />

        <SessionsTable
          sessions={data.sessions}
          hasActiveFilters={hasActiveFilters}
          isSuperadmin={isSuperadmin}
          currentSessionId={currentSessionId}
          togglingId={togglingId}
          onSelectSession={onSelectSession}
          onHideDetail={() => selectSession(null)}
          onToggleStatus={(item) => void handleToggleStatus(item)}
          onRequestDelete={setDeletingSession}
        />

        <TablePagination
          noun="sessions"
          total={data.totalSessions}
          page={data.page}
          pageSize={data.pageSize}
          rowsPerPage={pageSize}
          totalPages={data.totalPages}
          fetching={fetching}
          pageSizeOptions={[5, 10, 25, 50]}
          onPageSizeChange={(n) => {
            setPageSize(n);
            setPage(1);
          }}
          onPrev={() => setPage((p) => Math.max(1, p - 1))}
          onNext={() => setPage((p) => Math.min(data.totalPages, p + 1))}
        />
      </section>

      {deletingSession && (
        <ConfirmDialog
          title={`Delete session “${deletingSession.name}”?`}
          description={`Permanently delete “${deletingSession.name}” (${fmtDate(deletingSession.date)}) and all its ${deletingSession.playerCount} players and ${deletingSession.gameCount} matches?`}
          confirmLabel="Delete session"
          busy={deletingBusy}
          onConfirm={() => void handleConfirmDeleteSession()}
          onClose={() => setDeletingSession(null)}
        />
      )}
    </>
  );
}
