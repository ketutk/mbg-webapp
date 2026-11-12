"use client";

import { useMemo, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { addDaysISO, getMonthRange } from "@/lib/date";
import { fmtDate, fmtMonth, todayISO } from "@/lib/format";
import { queueOf, recommend } from "@/lib/match";
import {
  deleteSession,
  finishMatch,
  removeGame,
  reorderQueue,
  selectSession,
  startQueuedMatch,
  updateSession,
  useCurrentSessionId,
  useHydrated,
  useSessionDetail,
  useSessionsList,
} from "@/lib/store";
import type {
  AuthUser,
  Game,
  Session,
  SessionListItem,
  SessionStatus,
  Team,
} from "@/lib/types";
import { AppHeader } from "@/components/layout/AppHeader";
import { AssignDialog, type AssignDialogConfig } from "./AssignDialog";
import { CourtBoard } from "./CourtBoard";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { HistoryDialog } from "./HistoryDialog";
import { LoginDialog } from "@/components/auth/LoginDialog";
import { NextMatch } from "./NextMatch";
import { PlayerGrid } from "./PlayerGrid";
import { QueuePanel } from "./QueuePanel";
import { RosterDialog } from "./RosterDialog";
import { SessionDialog } from "./SessionDialog";
import { SessionSettingsDialog } from "./SessionSettingsDialog";
import { VisitorView } from "./VisitorView";
import {
  btn,
  card,
  cardFoot,
  cardHead,
  cardTitle,
  cx,
  empty,
  eyebrow,
  fieldInput,
  h1,
  linkBtn,
  pill,
  selectInput,
  shimmerCard,
  spinner,
  sub,
  toastBox,
} from "@/lib/ui";

type PeriodPreset = "all" | "this-month" | "last-30" | "this-year" | "custom";

export default function MatchApp() {
  const hydrated = useHydrated();
  const { user, loading: authLoading } = useAuth();
  const currentId = useCurrentSessionId();

  const [creating, setCreating] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);
  const [toast, setToast] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  function showToast(msg: string) {
    setToast(msg);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(""), 2600);
  }

  const isSuperadmin = user?.role === "SUPERADMIN";

  return (
    <div className="mx-auto max-w-[1190px] px-[30px] pb-14 max-[860px]:px-3.5 max-[860px]:pb-10">
      <AppHeader
        active="matches"
        user={user}
        onNewSession={() => setCreating(true)}
        onToast={showToast}
      />

      <main>
        {!hydrated || authLoading ? (
          <div className={shimmerCard} aria-busy="true" />
        ) : user ? (
          <InternalMatchesWorkspace
            user={user}
            currentSessionId={currentId}
            onSelectSession={(id) => {
              selectSession(id);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            onNewSession={() => setCreating(true)}
            onToast={showToast}
          />
        ) : (
          <ExternalMatchesView
            currentSessionId={currentId}
            onSelectSession={(id) => {
              selectSession(id);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            onLogin={() => setLoggingIn(true)}
          />
        )}
      </main>

      {creating && isSuperadmin && (
        <SessionDialog onClose={() => setCreating(false)} />
      )}
      {loggingIn && (
        <LoginDialog
          onClose={() => setLoggingIn(false)}
          onLoggedIn={() => showToast("Logged in")}
        />
      )}

      <div
        className={cx(
          toastBox,
          toast ? "translate-y-0 opacity-100" : "translate-y-5 opacity-0",
        )}
        role="status"
      >
        {toast}
      </div>
    </div>
  );
}

function ExternalMatchesView({
  currentSessionId,
  onSelectSession,
  onLogin,
}: {
  currentSessionId: string | null;
  onSelectSession: (id: string) => void;
  onLogin: () => void;
}) {
  const [searchText, setSearchText] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 9;

  const filterParams = useMemo(
    () => ({
      status: "OPEN" as const,
      q: searchText.trim() || undefined,
      page,
      pageSize,
    }),
    [searchText, page],
  );

  const { data, loading, fetching } = useSessionsList(filterParams);

  if (currentSessionId) {
    return (
      <VisitorView
        key={currentSessionId}
        sessionId={currentSessionId}
        onBackToList={() => selectSession(null)}
      />
    );
  }

  if (loading && !data) {
    return <div className={shimmerCard} aria-busy="true" />;
  }

  if (!data) return null;

  return (
    <>
      <section className="mt-8 mb-6 flex flex-wrap items-end justify-between gap-4 max-[860px]:mt-6 max-[860px]:mb-4">
        <div>
          <div className={eyebrow}>Live match day</div>
          <h1 className={h1}>Play fair. Play more.</h1>
          <div className="mt-1 text-xs text-muted">
            Select an active session below to check live courts, upcoming queue,
            and games played per player.
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {fetching && (
            <span
              className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#5089b7]"
              aria-live="polite"
            >
              <span className={spinner} />
              Syncing…
            </span>
          )}
          <span className={pill("ok")}>
            {data.openCount} open session{data.openCount === 1 ? "" : "s"}
          </span>
        </div>
      </section>

      {(data.openCount > 3 || searchText.trim().length > 0) && (
        <div className="mb-5 flex flex-wrap items-center gap-2.5">
          <div className="relative max-w-[360px] flex-1">
            <input
              type="search"
              placeholder="Find session by name (e.g. Minggu pagi)…"
              value={searchText}
              onChange={(e) => {
                setSearchText(e.target.value);
                setPage(1);
              }}
              className={cx(fieldInput, "bg-white py-2 text-xs")}
            />
          </div>
          {searchText.trim().length > 0 && (
            <button
              type="button"
              onClick={() => {
                setSearchText("");
                setPage(1);
              }}
              className={cx(linkBtn, "text-[#b5524f] hover:underline")}
            >
              Clear search
            </button>
          )}
        </div>
      )}

      {data.sessions.length === 0 ? (
        <section
          className={cx(
            card,
            "mx-auto mt-6 max-w-[520px] px-6 py-10 text-center",
          )}
        >
          <div className={eyebrow}>No active sessions</div>
          <h2 className="mt-2 font-display text-xl font-extrabold text-[#183e6b]">
            {searchText.trim()
              ? "No matching open sessions"
              : "No open sessions right now"}
          </h2>
          <p className="mt-2 mb-5 text-xs leading-relaxed text-muted">
            {searchText.trim()
              ? "Try clearing your search to see all open sessions."
              : "Check back on game day when an organiser opens a session, or sign in if you are an organiser."}
          </p>
          {searchText.trim() ? (
            <button
              type="button"
              className={btn("light")}
              onClick={() => {
                setSearchText("");
                setPage(1);
              }}
            >
              Show all open sessions
            </button>
          ) : (
            <button
              type="button"
              className={btn("primary")}
              onClick={onLogin}
            >
              Admin login
            </button>
          )}
        </section>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4 max-[960px]:grid-cols-2 max-[600px]:grid-cols-1">
            {data.sessions.map((item) => (
              <article
                key={item.id}
                onClick={() => onSelectSession(item.id)}
                className={cx(
                  card,
                  "group flex cursor-pointer flex-col justify-between p-5 transition-all duration-150 hover:-translate-y-0.5 hover:border-[#b9dbf7] hover:shadow-[0_14px_34px_#3a7fb81f]",
                )}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className={eyebrow}>{fmtDate(item.date)}</span>
                    <span className={pill("ok")}>Open</span>
                  </div>
                  <h2 className="mt-2 font-display text-lg font-extrabold tracking-[-0.4px] text-[#183e6b] group-hover:text-[#337fc4]">
                    {item.name}
                  </h2>

                  <div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl border border-[#e6f1fb] bg-[#f7fbff] p-3 text-center">
                    <div>
                      <div className="font-display text-base font-extrabold text-[#204a74]">
                        {item.courtCount}
                      </div>
                      <div className="text-[10px] font-bold text-muted">
                        Court{item.courtCount === 1 ? "" : "s"}
                      </div>
                    </div>
                    <div className="border-x border-[#e3eff9]">
                      <div className="font-display text-base font-extrabold text-[#204a74]">
                        {item.playerCount}
                      </div>
                      <div className="text-[10px] font-bold text-muted">
                        Player{item.playerCount === 1 ? "" : "s"}
                      </div>
                    </div>
                    <div>
                      <div className="font-display text-base font-extrabold text-[#204a74]">
                        {item.gameCount}
                      </div>
                      <div className="text-[10px] font-bold text-muted">
                        Match{item.gameCount === 1 ? "" : "es"}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-[#eef4f9] pt-3.5">
                  <span className="text-[11px] font-bold text-muted">
                    Live courts & queue
                  </span>
                  <span className="text-xs font-extrabold text-[#3c78aa] group-hover:translate-x-0.5 transition-transform">
                    View session →
                  </span>
                </div>
              </article>
            ))}
          </div>

          {data.totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-2.5">
              <button
                type="button"
                className={cx(
                  btn("light", "sm"),
                  "disabled:cursor-not-allowed disabled:opacity-45",
                )}
                disabled={data.page <= 1 || fetching}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                ← Prev
              </button>
              <span className="px-2 text-xs font-extrabold text-[#204a74]">
                Page {data.page} of {data.totalPages}
              </span>
              <button
                type="button"
                className={cx(
                  btn("light", "sm"),
                  "disabled:cursor-not-allowed disabled:opacity-45",
                )}
                disabled={data.page >= data.totalPages || fetching}
                onClick={() =>
                  setPage((p) => Math.min(data.totalPages, p + 1))
                }
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
}

function InternalMatchesWorkspace({
  user,
  currentSessionId,
  onSelectSession,
  onNewSession,
  onToast,
}: {
  user: AuthUser;
  currentSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
  onToast: (msg: string) => void;
}) {
  return (
    <>
      {currentSessionId && (
        <div className="mb-8">
          <AdminSessionContainer
            key={currentSessionId}
            sessionId={currentSessionId}
            user={user}
            onToast={onToast}
          />
        </div>
      )}

      <AdminSessionsTableSection
        user={user}
        currentSessionId={currentSessionId}
        onSelectSession={onSelectSession}
        onNewSession={onNewSession}
        onToast={onToast}
      />
    </>
  );
}

function AdminSessionsTableSection({
  user,
  currentSessionId,
  onSelectSession,
  onNewSession,
  onToast,
}: {
  user: AuthUser;
  currentSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
  onToast: (msg: string) => void;
}) {
  const isSuperadmin = user.role === "SUPERADMIN";

  const [preset, setPreset] = useState<PeriodPreset>("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | SessionStatus>("ALL");
  const [searchText, setSearchText] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingSession, setDeletingSession] =
    useState<SessionListItem | null>(null);
  const [deletingBusy, setDeletingBusy] = useState(false);

  const dateRange = useMemo(() => {
    const today = todayISO();
    const ym = today.slice(0, 7);
    switch (preset) {
      case "all":
        return {};
      case "this-month":
        return getMonthRange(ym);
      case "last-30":
        return { from: addDaysISO(today, -29), to: today };
      case "this-year": {
        const year = today.slice(0, 4);
        return { from: `${year}-01-01`, to: `${year}-12-31` };
      }
      case "custom":
        return {
          from: customFrom || undefined,
          to: customTo || undefined,
        };
    }
  }, [preset, customFrom, customTo]);

  const filterParams = useMemo(
    () => ({
      from: dateRange.from,
      to: dateRange.to,
      status: statusFilter,
      q: searchText.trim() || undefined,
      page,
      pageSize,
    }),
    [dateRange.from, dateRange.to, statusFilter, searchText, page, pageSize],
  );

  const { data, loading, fetching } = useSessionsList(filterParams);

  if (loading && !data) {
    return <div className={shimmerCard} aria-busy="true" />;
  }

  if (!data) return null;

  const hasActiveFilters =
    preset !== "all" ||
    statusFilter !== "ALL" ||
    searchText.trim().length > 0;

  function resetFilters() {
    setPreset("all");
    setCustomFrom("");
    setCustomTo("");
    setStatusFilter("ALL");
    setSearchText("");
    setPage(1);
  }

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

  const startRow =
    data.totalSessions === 0 ? 0 : (data.page - 1) * data.pageSize + 1;
  const endRow = Math.min(data.totalSessions, data.page * data.pageSize);

  const presetOptions: { id: PeriodPreset; label: string }[] = [
    { id: "all", label: "All dates" },
    { id: "this-month", label: `This month (${fmtMonth(todayISO().slice(0, 7))})` },
    { id: "last-30", label: "Last 30d" },
    { id: "this-year", label: "This year" },
    { id: "custom", label: "Custom range" },
  ];

  return (
    <>
      {!currentSessionId && (
        <section className="mt-8 mb-5 flex flex-wrap items-end justify-between gap-4 max-[860px]:mt-6 max-[860px]:mb-4">
          <div>
            <div className={eyebrow}>Organiser dashboard</div>
            <h1 className={h1}>Match sessions</h1>
            <div className="mt-1 text-xs text-muted">
              Browse all {data.openCount + data.closedCount} sessions (
              {data.openCount} open · {data.closedCount} closed). Select any
              session to manage courts, queue, and player checklist.
            </div>
          </div>
          {isSuperadmin && (
            <div className="flex flex-wrap items-center gap-2">
              <button className={btn("primary")} onClick={onNewSession}>
                ＋ New session
              </button>
            </div>
          )}
        </section>
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

        {/* Filter Toolbar */}
        <div className="border-t border-[#eef4f9] bg-[#fafdff] px-[22px] py-3.5 max-[860px]:px-[15px]">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div
              className="flex flex-wrap items-center gap-1.5"
              role="group"
              aria-label="Date range filter"
            >
              {presetOptions.map((opt) => {
                const active = preset === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setPreset(opt.id);
                      setPage(1);
                    }}
                    className={cx(
                      "rounded-lg px-2.5 py-1.5 text-[11px] font-extrabold transition-colors",
                      active
                        ? "bg-[#204a74] text-white shadow-[0_2px_6px_#204a7426]"
                        : "border border-[#dcebf8] bg-white text-[#4c789c] hover:bg-[#f0f7fe]",
                    )}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className={cx(linkBtn, "text-[#b5524f] hover:underline")}
              >
                Reset filters
              </button>
            )}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2.5">
            {preset === "custom" && (
              <div className="flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-1.5 text-[11px] font-bold text-[#5d7f9d]">
                  From
                  <input
                    type="date"
                    value={customFrom}
                    onChange={(e) => {
                      setCustomFrom(e.target.value);
                      setPage(1);
                    }}
                    className="rounded-xl border border-[#d9eafa] bg-white px-2.5 py-1.5 text-xs font-bold text-[#204a74] outline-none focus:border-[#8cc3ef]"
                  />
                </label>
                <label className="flex items-center gap-1.5 text-[11px] font-bold text-[#5d7f9d]">
                  To
                  <input
                    type="date"
                    value={customTo}
                    onChange={(e) => {
                      setCustomTo(e.target.value);
                      setPage(1);
                    }}
                    className="rounded-xl border border-[#d9eafa] bg-white px-2.5 py-1.5 text-xs font-bold text-[#204a74] outline-none focus:border-[#8cc3ef]"
                  />
                </label>
              </div>
            )}

            <div
              className="inline-flex rounded-xl border border-[#d9eafa] bg-white p-0.5"
              role="group"
              aria-label="Session status filter"
            >
              {(
                [
                  { id: "ALL", label: "All status" },
                  { id: "OPEN", label: "Open" },
                  { id: "CLOSED", label: "Closed" },
                ] as const
              ).map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => {
                    setStatusFilter(st.id);
                    setPage(1);
                  }}
                  className={cx(
                    "rounded-[9px] px-2.5 py-1 text-[11px] font-extrabold transition-colors",
                    statusFilter === st.id
                      ? "bg-[#eaf5ff] text-[#204a74]"
                      : "text-[#6b8bab] hover:text-[#204a74]",
                  )}
                >
                  {st.label}
                </button>
              ))}
            </div>

            <div className="relative min-w-[200px] flex-1">
              <input
                type="search"
                placeholder="Search session name (e.g. Minggu pagi)…"
                value={searchText}
                onChange={(e) => {
                  setSearchText(e.target.value);
                  setPage(1);
                }}
                className={cx(fieldInput, "py-1.5 text-xs")}
              />
            </div>
          </div>
        </div>

        {/* Sessions Table */}
        {data.sessions.length === 0 ? (
          <div className={empty}>
            {hasActiveFilters
              ? "No sessions match your current filter. Try adjusting the date range, status, or search query."
              : isSuperadmin
                ? "No game sessions yet. Click “＋ New session” to create your first session."
                : "No game sessions yet. Ask a superadmin to create the first session."}
          </div>
        ) : (
          <div className="overflow-x-auto border-t border-[#eef4f9]">
            <table className="w-full border-separate border-spacing-0 text-left text-xs">
              <thead>
                <tr className="bg-[#fafdff] text-[10px] font-extrabold text-[#5d7f9d]">
                  <th className="border-b border-[#f0f5f9] py-2.5 pl-[22px] pr-3 max-[860px]:pl-3.5">
                    Date
                  </th>
                  <th className="border-b border-[#f0f5f9] py-2.5 px-3">
                    Session
                  </th>
                  <th className="border-b border-[#f0f5f9] py-2.5 px-3">
                    Status
                  </th>
                  <th className="border-b border-[#f0f5f9] py-2.5 px-3 text-center">
                    Courts
                  </th>
                  <th className="border-b border-[#f0f5f9] py-2.5 px-3 text-center">
                    Players
                  </th>
                  <th className="border-b border-[#f0f5f9] py-2.5 px-3 text-center">
                    Matches
                  </th>
                  <th className="border-b border-[#f0f5f9] py-2.5 pr-[22px] pl-3 text-right max-[860px]:pr-3.5">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.sessions.map((item) => {
                  const isCurrent = item.id === currentSessionId;
                  const isToggling = togglingId === item.id;
                  return (
                    <tr
                      key={item.id}
                      className={cx(
                        "transition-colors hover:bg-[#f9fcff]",
                        isCurrent && "bg-[#f1f9ff]",
                      )}
                    >
                      <td className="border-b border-[#f0f5f9] py-3 pl-[22px] pr-3 whitespace-nowrap text-muted max-[860px]:pl-3.5">
                        {fmtDate(item.date)}
                      </td>
                      <td className="border-b border-[#f0f5f9] py-3 px-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onSelectSession(item.id)}
                            className="text-left font-bold text-[#204a74] hover:text-[#337fc4] hover:underline"
                          >
                            {item.name}
                          </button>
                          {isCurrent && (
                            <span className={pill("next")}>Viewing</span>
                          )}
                        </div>
                      </td>
                      <td className="border-b border-[#f0f5f9] py-3 px-3 whitespace-nowrap">
                        <span
                          className={pill(
                            item.status === "OPEN" ? "ok" : "default",
                          )}
                        >
                          {item.status === "OPEN" ? "Open" : "Closed"}
                        </span>
                      </td>
                      <td className="border-b border-[#f0f5f9] py-3 px-3 text-center font-display font-extrabold text-[#204a74]">
                        {item.courtCount}
                      </td>
                      <td className="border-b border-[#f0f5f9] py-3 px-3 text-center font-display font-extrabold text-[#204a74]">
                        {item.playerCount}
                      </td>
                      <td className="border-b border-[#f0f5f9] py-3 px-3 text-center font-display font-extrabold text-[#204a74]">
                        {item.gameCount}
                      </td>
                      <td className="border-b border-[#f0f5f9] py-3 pr-[22px] pl-3 text-right whitespace-nowrap max-[860px]:pr-3.5">
                        <div className="inline-flex items-center justify-end gap-2.5">
                          <button
                            type="button"
                            className={btn(
                              isCurrent ? "light" : "primary",
                              "sm",
                            )}
                            onClick={() =>
                              isCurrent
                                ? selectSession(null)
                                : onSelectSession(item.id)
                            }
                          >
                            {isCurrent ? "Hide detail" : "View detail"}
                          </button>
                          <button
                            type="button"
                            className={linkBtn}
                            disabled={isToggling}
                            onClick={() => void handleToggleStatus(item)}
                          >
                            {isToggling ? (
                              <>
                                <span className={cx(spinner, "mr-1")} />
                                Saving…
                              </>
                            ) : item.status === "OPEN" ? (
                              "Close"
                            ) : (
                              "Reopen"
                            )}
                          </button>
                          {isSuperadmin && (
                            <button
                              type="button"
                              className={cx(linkBtn, "text-[#b5524f]")}
                              onClick={() => setDeletingSession(item)}
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        <div className={cx(cardFoot, "flex-wrap gap-3 bg-[#fafdff]")}>
          <div className="flex flex-wrap items-center gap-3">
            <span>
              {data.totalSessions === 0
                ? "Showing 0 sessions"
                : `Showing ${startRow}–${endRow} of ${data.totalSessions} sessions`}
            </span>
            <label className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#5d7f9d]">
              Rows
              <select
                aria-label="Rows per page"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className={cx(selectInput, "px-2 py-1 text-[11px]")}
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </label>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className={cx(
                btn("light", "sm"),
                "disabled:cursor-not-allowed disabled:opacity-45",
              )}
              disabled={data.page <= 1 || fetching}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              ← Prev
            </button>
            <span className="px-1.5 font-extrabold text-[#204a74]">
              Page {data.page} of {data.totalPages}
            </span>
            <button
              type="button"
              className={cx(
                btn("light", "sm"),
                "disabled:cursor-not-allowed disabled:opacity-45",
              )}
              disabled={data.page >= data.totalPages || fetching}
              onClick={() =>
                setPage((p) => Math.min(data.totalPages, p + 1))
              }
            >
              Next →
            </button>
          </div>
        </div>
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

function AdminSessionContainer({
  sessionId,
  user,
  onToast,
}: {
  sessionId: string;
  user: AuthUser;
  onToast: (msg: string) => void;
}) {
  const { data: session, error, loading } = useSessionDetail(sessionId);

  if (loading) {
    return <div className={shimmerCard} aria-busy="true" />;
  }

  if (error || !session) {
    return (
      <section className={cx(card, "mx-auto mt-8 max-w-[480px] p-8 text-center")}>
        <div className={eyebrow}>Session not found</div>
        <h2 className="mt-2 font-display text-xl font-extrabold text-[#183e6b]">
          Could not load this session
        </h2>
        <p className="mt-2 mb-5 text-xs leading-relaxed text-muted">
          {error instanceof Error
            ? error.message
            : "This session may have been deleted."}
        </p>
        <button
          type="button"
          className={btn("primary")}
          onClick={() => selectSession(null)}
        >
          ← Back to all sessions
        </button>
      </section>
    );
  }

  return <SessionView session={session} user={user} onToast={onToast} />;
}

function SessionView({
  session,
  user,
  onToast,
}: {
  session: Session;
  user: AuthUser;
  onToast: (msg: string) => void;
}) {
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

  async function handleToggleSessionStatus() {
    const nextStatus: SessionStatus =
      session.status === "OPEN" ? "CLOSED" : "OPEN";
    setTogglingStatus(true);
    try {
      await updateSession(session.id, { status: nextStatus });
      onToast(
        nextStatus === "OPEN"
          ? "Session opened — now visible to visitors"
          : "Session closed — now restricted to organisers",
      );
    } catch (err) {
      onToast(
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
      onToast(`Court ${game.courtNumber ?? ""} finished`);
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Could not finish match");
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
      onToast(`Moved queued match onto Court ${courtNumber}`);
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Could not start queued match");
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
      onToast(err instanceof Error ? err.message : "Could not reorder queue");
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
      onToast("Queued match removed");
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Could not remove match");
    } finally {
      setRemovingGameId(null);
    }
  }

  async function handleConfirmDeleteSession() {
    setDeletingSession(true);
    try {
      await deleteSession(session.id);
      setConfirmDeleteSession(false);
      onToast("Session deleted");
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Could not delete session");
    } finally {
      setDeletingSession(false);
    }
  }

  return (
    <>
      <section className="mt-8 mb-[22px] flex flex-wrap items-end justify-between gap-4 max-[860px]:mt-6 max-[860px]:mb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={eyebrow}>{fmtDate(session.date)}</span>
            <span
              className={pill(session.status === "OPEN" ? "ok" : "default")}
            >
              {session.status === "OPEN" ? "Open" : "Closed (Organisers only)"}
            </span>
          </div>
          <h1 className={h1}>{session.name}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className={btn("light")}
            onClick={() => selectSession(null)}
          >
            ← All sessions
          </button>
          <button
            type="button"
            className={btn("light")}
            disabled={togglingStatus}
            onClick={() => void handleToggleSessionStatus()}
          >
            {togglingStatus ? (
              <>
                <span className={cx(spinner, "mr-1.5")} />
                Updating…
              </>
            ) : session.status === "OPEN" ? (
              "Close session"
            ) : (
              "Reopen session"
            )}
          </button>
          <button
            id="match-history"
            className={btn("light")}
            onClick={() => setShowHistory(true)}
          >
            History · {session.games.length}
          </button>
          {isSuperadmin && (
            <>
              <button
                id="edit-players"
                className={btn("light")}
                onClick={() => setEditingRoster(true)}
              >
                Edit players
              </button>
              <button
                id="session-settings"
                className={btn("light")}
                onClick={() => setEditingSettings(true)}
              >
                Session settings
              </button>
              <button
                className={btn("danger")}
                disabled={deletingSession}
                onClick={() => setConfirmDeleteSession(true)}
              >
                {deletingSession ? (
                  <>
                    <span className={cx(spinner, "mr-1.5")} />
                    Deleting…
                  </>
                ) : (
                  "Delete"
                )}
              </button>
            </>
          )}
        </div>
      </section>

      <CourtBoard
        session={session}
        promotingCourt={promotingCourt}
        finishingGameId={finishingGameId}
        onAssignCourt={(courtNumber) =>
          setAssignConfig({
            mode: "court",
            courtNumber,
            prefill: rec
              ? [
                  [rec.teams[0][0].id, rec.teams[0][1].id],
                  [rec.teams[1][0].id, rec.teams[1][1].id],
                ]
              : undefined,
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
            prefill: rec
              ? [
                  [rec.teams[0][0].id, rec.teams[0][1].id],
                  [rec.teams[1][0].id, rec.teams[1][1].id],
                ]
              : undefined,
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
              onToast("Shuffled — only players tied on games and rest can change");
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
            onToast={onToast}
          />
        </div>
      </div>

      {editingRoster && isSuperadmin && (
        <RosterDialog
          session={session}
          onClose={() => setEditingRoster(false)}
          onSaved={onToast}
        />
      )}
      {editingSettings && isSuperadmin && (
        <SessionSettingsDialog
          session={session}
          onClose={() => setEditingSettings(false)}
          onSaved={onToast}
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
            onToast(msg);
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

