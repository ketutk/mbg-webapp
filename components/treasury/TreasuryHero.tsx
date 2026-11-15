"use client";

import { SkeletonBar } from "@/components/ui/Skeleton";
import { formatIDR } from "@/lib/format";
import type { EntryType, TreasurySummary } from "@/lib/types";
import { btn, eyebrow, h1 } from "@/lib/ui";

export function TreasuryHero({
  treasury,
  onAdd,
}: {
  treasury?: TreasurySummary;
  onAdd?: (type: EntryType) => void;
}) {
  return (
    <section className="mt-8 mb-5 flex flex-wrap items-end justify-between gap-4 max-[860px]:mt-6 max-[860px]:mb-4">
      <div>
        <div className={eyebrow}>Club treasury</div>
        {treasury ? (
          <>
            <h1 className={h1}>{formatIDR(treasury.balance)}</h1>
            <div className="mt-1 text-xs text-muted">
              All-time cash left · Total income {formatIDR(treasury.income)} ·
              Total spent {formatIDR(treasury.expense)}
            </div>
          </>
        ) : (
          <>
            <h1 className={h1}>
              <SkeletonBar w="w-52" h="h-9" className="mt-1" />
            </h1>
            <div className="mt-1.5 flex items-center gap-2 text-xs text-muted">
              <span>All-time cash left</span>
              <SkeletonBar w="w-48" h="h-3.5" />
            </div>
          </>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          id="treasury-add-income"
          className={btn("light")}
          disabled={!onAdd}
          onClick={() => onAdd?.("INCOME")}
        >
          ＋ Add income
        </button>
        <button
          id="treasury-add"
          className={btn("primary")}
          disabled={!onAdd}
          onClick={() => onAdd?.("EXPENSE")}
        >
          ＋ Add spent
        </button>
      </div>
    </section>
  );
}

