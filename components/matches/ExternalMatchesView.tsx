"use client";

import { useMemo, useState } from "react";
import { fmtDate } from "@/lib/format";
import { selectSession, useSessionsList } from "@/lib/store";
import {
  btn,
  card,
  cx,
  eyebrow,
  fieldInput,
  h1,
  linkBtn,
  pill,
  shimmerCard,
  spinner,
} from "@/lib/ui";
import { VisitorView } from "./VisitorView";

export function ExternalMatchesView({
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

