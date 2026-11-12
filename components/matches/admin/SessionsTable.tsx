"use client";

import { fmtDate } from "@/lib/format";
import type { SessionListItem } from "@/lib/types";
import { btn, cx, empty, linkBtn, pill, spinner } from "@/lib/ui";

export function SessionsTable({
  sessions,
  hasActiveFilters,
  isSuperadmin,
  currentSessionId,
  togglingId,
  onSelectSession,
  onHideDetail,
  onToggleStatus,
  onRequestDelete,
}: {
  sessions: SessionListItem[];
  hasActiveFilters: boolean;
  isSuperadmin: boolean;
  currentSessionId: string | null;
  togglingId: string | null;
  onSelectSession: (id: string) => void;
  onHideDetail: () => void;
  onToggleStatus: (item: SessionListItem) => void;
  onRequestDelete: (item: SessionListItem) => void;
}) {
  if (sessions.length === 0) {
    return (
      <div className={empty}>
        {hasActiveFilters
          ? "No sessions match your current filter. Try adjusting the date range, status, or search query."
          : isSuperadmin
            ? "No game sessions yet. Click “＋ New session” to create your first session."
            : "No game sessions yet. Ask a superadmin to create the first session."}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border-t border-[#eef4f9]">
      <table className="w-full border-separate border-spacing-0 text-left text-xs">
        <thead>
          <tr className="bg-[#fafdff] text-[10px] font-extrabold text-[#5d7f9d]">
            <th className="border-b border-[#f0f5f9] py-2.5 pl-[22px] pr-3 max-[860px]:pl-3.5">
              Date
            </th>
            <th className="border-b border-[#f0f5f9] py-2.5 px-3">Session</th>
            <th className="border-b border-[#f0f5f9] py-2.5 px-3">Status</th>
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
          {sessions.map((item) => {
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
                    className={pill(item.status === "OPEN" ? "ok" : "default")}
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
                      className={btn(isCurrent ? "light" : "primary", "sm")}
                      onClick={() =>
                        isCurrent ? onHideDetail() : onSelectSession(item.id)
                      }
                    >
                      {isCurrent ? "Hide detail" : "View detail"}
                    </button>
                    <button
                      type="button"
                      className={linkBtn}
                      disabled={isToggling}
                      onClick={() => onToggleStatus(item)}
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
                        onClick={() => onRequestDelete(item)}
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
  );
}

