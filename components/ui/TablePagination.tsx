"use client";

import { btn, cardFoot, cx, selectInput } from "@/lib/ui";

export function TablePagination({
  noun,
  total,
  page,
  pageSize,
  rowsPerPage,
  totalPages,
  fetching,
  pageSizeOptions,
  onPageSizeChange,
  onPrev,
  onNext,
}: {
  noun: string;
  total: number;
  page: number;
  pageSize: number;
  rowsPerPage?: number;
  totalPages: number;
  fetching: boolean;
  pageSizeOptions: readonly number[];
  onPageSizeChange: (n: number) => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const startRow = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endRow = Math.min(total, page * pageSize);

  return (
    <div className={cx(cardFoot, "flex-wrap gap-3 bg-[#fafdff]")}>
      <div className="flex flex-wrap items-center gap-3">
        <span>
          {total === 0
            ? `Showing 0 ${noun}`
            : `Showing ${startRow}–${endRow} of ${total} ${noun}`}
        </span>
        <label className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#5d7f9d]">
          Rows
          <select
            aria-label="Rows per page"
            value={rowsPerPage ?? pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className={cx(selectInput, "px-2 py-1 text-[11px]")}
          >
            {pageSizeOptions.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
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
          disabled={page <= 1 || fetching}
          onClick={onPrev}
        >
          ← Prev
        </button>
        <span className="px-1.5 font-extrabold text-[#204a74]">
          Page {page} of {totalPages}
        </span>
        <button
          type="button"
          className={cx(
            btn("light", "sm"),
            "disabled:cursor-not-allowed disabled:opacity-45",
          )}
          disabled={page >= totalPages || fetching}
          onClick={onNext}
        >
          Next →
        </button>
      </div>
    </div>
  );
}

