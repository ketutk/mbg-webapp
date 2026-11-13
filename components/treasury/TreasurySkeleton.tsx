import { SkeletonBar, SkeletonRegion } from "@/components/ui/Skeleton";
import { card, cardHead, cardTitle, cx, sub } from "@/lib/ui";

export function TreasurySkeleton() {
  return (
    <SkeletonRegion label="Loading treasury data">
      <section
        aria-label="Treasury overview"
        className="mb-5 grid grid-cols-4 gap-3.5 max-[980px]:grid-cols-2 max-[540px]:grid-cols-1"
      >
        <div className={cx(card, "p-4")}>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-extrabold text-[#5d7f9d]">
              All-time cash left
            </span>
            <SkeletonBar w="w-14" h="h-5" className="rounded-full" />
          </div>
          <SkeletonBar w="w-32" h="h-7" className="mt-2" />
          <div className="mt-3">
            <div className="h-2 w-full overflow-hidden rounded-full bg-[#eef5fc]" />
            <div className="mt-1.5 flex justify-between">
              <SkeletonBar w="w-10" h="h-2.5" />
              <SkeletonBar w="w-10" h="h-2.5" />
            </div>
          </div>
        </div>

        {["Period income", "Period spent", "Period net flow"].map((label) => (
          <div key={label} className={cx(card, "p-4")}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-extrabold text-[#5d7f9d]">
                {label}
              </span>
              <SkeletonBar w="w-12" h="h-5" className="rounded-full" />
            </div>
            <SkeletonBar w="w-28" h="h-7" className="mt-2" />
            <SkeletonBar w="w-24" h="h-3" className="mt-2.5" />
          </div>
        ))}
      </section>

      <section
        className={cx(card, "mb-5")}
        aria-labelledby="monthly-cashflow-title"
      >
        <div className={cardHead}>
          <div>
            <h2 className={cardTitle} id="monthly-cashflow-title">
              Monthly cashflow (last 6 months)
            </h2>
            <div className={sub}>
              Click any month column to filter transactions for that period.
            </div>
          </div>
          <div className="flex items-center gap-3 text-[11px] font-bold text-muted">
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block size-2.5 rounded-sm bg-ok" />
              Income
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block size-2.5 rounded-sm bg-[#d97b78]" />
              Spent
            </span>
          </div>
        </div>

        <div className="grid grid-cols-6 gap-2.5 border-t border-[#eef4f9] px-[22px] py-4 max-[860px]:grid-cols-3 max-[860px]:px-[15px] max-[480px]:grid-cols-2">
          {[0, 1, 2, 3, 4, 5].map((m) => (
            <div
              key={m}
              className="flex flex-col justify-between rounded-2xl border border-[#e8f1fa] bg-[#fbfdff] p-3"
            >
              <SkeletonBar w="w-12" h="h-3" />
              <div className="my-3 flex h-16 items-end justify-center gap-2 border-b border-[#e5eff8] px-2 pt-2">
                <SkeletonBar w="w-full" h="h-10" className="flex-1 rounded-t-md" />
                <SkeletonBar w="w-full" h="h-7" className="flex-1 rounded-t-md" />
              </div>
              <div className="space-y-1.5">
                <SkeletonBar w="w-full" h="h-2.5" />
                <SkeletonBar w="w-4/5" h="h-2.5" />
                <SkeletonBar w="w-full" h="h-2.5" />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className={card} aria-labelledby="entries-title">
        <div className={cardHead}>
          <div>
            <h2 className={cardTitle} id="entries-title">
              Transactions
            </h2>
            <div className={sub}>
              Filter by periodical preset, month, entry type, or keyword.
            </div>
          </div>
          <SkeletonBar w="w-20" h="h-5" className="rounded-full" />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#eef4f9] bg-[#fbfdff] px-[22px] py-3.5 max-[860px]:px-[15px]">
          <div className="flex flex-wrap items-center gap-2">
            <SkeletonBar w="w-20" h="h-8" className="rounded-xl" />
            <SkeletonBar w="w-24" h="h-8" className="rounded-xl" />
            <SkeletonBar w="w-20" h="h-8" className="rounded-xl" />
          </div>
          <SkeletonBar w="w-56" h="h-8" className="rounded-xl" />
        </div>

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
              </tr>
            </thead>
            <tbody>
              {[0, 1, 2, 3, 4, 5].map((row) => (
                <tr key={row}>
                  <td className="border-b border-[#f0f5f9] py-3.5 pl-[22px] pr-3 max-[860px]:pl-3.5">
                    <SkeletonBar w="w-20" h="h-3.5" />
                  </td>
                  <td className="border-b border-[#f0f5f9] py-3.5 px-3">
                    <SkeletonBar w="w-48" h="h-4" />
                  </td>
                  <td className="border-b border-[#f0f5f9] py-3.5 px-3">
                    <SkeletonBar w="w-16" h="h-5" className="rounded-full" />
                  </td>
                  <td className="border-b border-[#f0f5f9] py-3.5 px-3">
                    <SkeletonBar w="w-24" h="h-4" className="ml-auto" />
                  </td>
                  <td className="border-b border-[#f0f5f9] py-3.5 px-3">
                    <SkeletonBar w="w-20" h="h-3.5" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </SkeletonRegion>
  );
}

