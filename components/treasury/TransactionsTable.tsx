"use client";

import { fmtDate, formatIDR } from "@/lib/format";
import type { TreasuryEntry } from "@/lib/types";
import { cx, empty, linkBtn, pill, spinner } from "@/lib/ui";

export function TransactionsTable({
  entries,
  hasActiveFilters,
  isSuperadmin,
  deletingId,
  onEdit,
  onRequestDelete,
}: {
  entries: TreasuryEntry[];
  hasActiveFilters: boolean;
  isSuperadmin: boolean;
  deletingId: string | null;
  onEdit: (entry: TreasuryEntry) => void;
  onRequestDelete: (entry: TreasuryEntry) => void;
}) {
  if (entries.length === 0) {
    return (
      <div className={empty}>
        {hasActiveFilters
          ? "No treasury entries match your current filter. Try adjusting the period or clearing the search."
          : "No treasury entries yet. Use “＋ Add spent” or “＋ Add income” to start tracking."}
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
            <th className="border-b border-[#f0f5f9] py-2.5 px-3">Purpose</th>
            <th className="border-b border-[#f0f5f9] py-2.5 px-3">Type</th>
            <th className="border-b border-[#f0f5f9] py-2.5 px-3 text-right">
              Amount
            </th>
            <th className="border-b border-[#f0f5f9] py-2.5 px-3">Added by</th>
            {isSuperadmin && (
              <th className="border-b border-[#f0f5f9] py-2.5 pr-[22px] pl-3 text-right max-[860px]:pr-3.5">
                Actions
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => {
            const isDeleting = deletingId === entry.id;
            return (
              <tr
                key={entry.id}
                className={cx(
                  "transition-opacity hover:bg-[#f9fcff]",
                  isDeleting && "opacity-50",
                )}
              >
                <td className="border-b border-[#f0f5f9] py-3 pl-[22px] pr-3 whitespace-nowrap text-muted max-[860px]:pl-3.5">
                  {fmtDate(entry.date)}
                </td>
                <td className="border-b border-[#f0f5f9] py-3 px-3 font-bold text-[#204a74]">
                  {entry.purpose}
                </td>
                <td className="border-b border-[#f0f5f9] py-3 px-3">
                  <span
                    className={pill(entry.type === "INCOME" ? "ok" : "warn")}
                  >
                    {entry.type === "INCOME" ? "Income" : "Spent"}
                  </span>
                </td>
                <td
                  className={cx(
                    "border-b border-[#f0f5f9] py-3 px-3 text-right font-display font-extrabold whitespace-nowrap",
                    entry.type === "INCOME" ? "text-ok" : "text-[#b5524f]",
                  )}
                >
                  {entry.type === "INCOME" ? "+" : "−"}
                  {formatIDR(entry.amount)}
                </td>
                <td className="border-b border-[#f0f5f9] py-3 px-3 text-muted">
                  {entry.createdByName}
                </td>
                {isSuperadmin && (
                  <td className="border-b border-[#f0f5f9] py-3 pr-[22px] pl-3 text-right whitespace-nowrap max-[860px]:pr-3.5">
                    <button
                      className={cx(linkBtn, "mr-2.5")}
                      disabled={isDeleting}
                      onClick={() => onEdit(entry)}
                    >
                      Edit
                    </button>
                    <button
                      className={cx(linkBtn, "text-[#b5524f]")}
                      disabled={isDeleting}
                      onClick={() => onRequestDelete(entry)}
                    >
                      {isDeleting ? (
                        <>
                          <span className={cx(spinner, "mr-1")} />
                          Deleting…
                        </>
                      ) : (
                        "Delete"
                      )}
                    </button>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

