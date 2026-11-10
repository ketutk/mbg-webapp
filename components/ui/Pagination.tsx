import { btn, cx, selectInput } from "@/lib/ui";

export interface PaginationProps {
  page: number;
  totalPages: number;
  pageSize?: number;
  totalEntries?: number;
  entryLabel?: string;
  pageSizeOptions?: number[];
  isPending?: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
}

export function Pagination({
  page,
  totalPages,
  pageSize,
  totalEntries,
  entryLabel = "entries",
  pageSizeOptions = [10, 25, 50],
  isPending = false,
  onPageChange,
  onPageSizeChange,
}: PaginationProps) {
  const startRow =
    totalEntries !== undefined && pageSize !== undefined
      ? totalEntries === 0
        ? 0
        : (page - 1) * pageSize + 1
      : undefined;
  const endRow =
    totalEntries !== undefined && pageSize !== undefined
      ? Math.min(totalEntries, page * pageSize)
      : undefined;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] text-muted">
      <div className="flex flex-wrap items-center gap-3">
        {totalEntries !== undefined && (
          <span>
            {totalEntries === 0
              ? `Showing 0 ${entryLabel}`
              : `Showing ${startRow}–${endRow} of ${totalEntries} ${entryLabel}`}
          </span>
        )}
        {pageSize !== undefined && onPageSizeChange && (
          <label className="inline-flex items-center gap-1.5 font-bold text-[#5d7f9d]">
            Rows
            <select
              aria-label="Rows per page"
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className={cx(selectInput, "px-2 py-1 text-[11px]")}
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          className={cx(
            btn("light", "sm"),
            "disabled:cursor-not-allowed disabled:opacity-45",
          )}
          disabled={page <= 1 || isPending}
          onClick={() => onPageChange(Math.max(1, page - 1))}
        >
          ← Prev
        </button>
        <span className="px-1.5 font-extrabold text-[#204a74]">
          Page {page} of {Math.max(1, totalPages)}
        </span>
        <button
          type="button"
          className={cx(
            btn("light", "sm"),
            "disabled:cursor-not-allowed disabled:opacity-45",
          )}
          disabled={page >= totalPages || isPending}
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        >
          Next →
        </button>
      </div>
    </div>
  );
}

