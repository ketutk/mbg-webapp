import { SkeletonBar, SkeletonRegion } from "@/components/ui/Skeleton";
import {
  btn,
  card,
  cardHead,
  cardTitle,
  courtCard,
  cx,
  skelCircle,
  sub,
} from "@/lib/ui";

export function SessionViewSkeleton({
  onBackToList,
}: {
  onBackToList?: () => void;
}) {
  return (
    <SkeletonRegion label="Loading session workspace">
      <section className="mt-8 mb-[22px] flex flex-wrap items-end justify-between gap-4 max-[860px]:mt-6 max-[860px]:mb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <SkeletonBar w="w-24" h="h-3" />
            <SkeletonBar w="w-20" h="h-5" className="rounded-full" />
          </div>
          <SkeletonBar w="w-64" h="h-9" className="mt-2" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className={btn("light")}
            onClick={onBackToList}
            disabled={!onBackToList}
          >
            ← All sessions
          </button>
          <SkeletonBar w="w-28" h="h-9" className="rounded-xl" />
          <SkeletonBar w="w-24" h="h-9" className="rounded-xl" />
        </div>
      </section>

      <section className="mb-5" aria-labelledby="courts-title">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className={cardTitle} id="courts-title">
              Courts
            </h2>
            <div className={sub}>
              Assign matches directly to an open court or promote the next match from the queue.
            </div>
          </div>
          <SkeletonBar w="w-24" h="h-6" className="rounded-full" />
        </div>

        <div className="grid grid-cols-2 gap-3.5 max-[860px]:grid-cols-1">
          {[1, 2].map((courtNumber) => (
            <div
              key={courtNumber}
              className={cx(courtCard, "flex flex-col justify-between gap-3")}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-display text-sm font-extrabold text-[#204a74]">
                  Court {courtNumber}
                </span>
                <SkeletonBar w="w-16" h="h-5" className="rounded-full" />
              </div>
              <div className="grid grid-cols-2 gap-2 rounded-2xl bg-[#f4faff] p-3">
                {[0, 1, 2, 3].map((slot) => (
                  <SkeletonBar key={slot} w="w-full" h="h-9" className="rounded-xl" />
                ))}
              </div>
              <div className="flex justify-end gap-2">
                <SkeletonBar w="w-24" h="h-8" className="rounded-xl" />
                <SkeletonBar w="w-28" h="h-8" className="rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className={cx(card, "mb-5")} aria-labelledby="queue-title">
        <div className={cardHead}>
          <div>
            <div className="flex items-center gap-2">
              <h2 className={cardTitle} id="queue-title">
                Queue · Next matches
              </h2>
              <SkeletonBar w="w-16" h="h-5" className="rounded-full" />
            </div>
            <div className={sub}>
              Queued matches already count in games played and are flagged as “Queued” until placed on a court.
            </div>
          </div>
          <SkeletonBar w="w-28" h="h-8" className="rounded-xl" />
        </div>
        <div className="border-t border-[#eef4f9]">
          {[0, 1].map((row) => (
            <div
              key={row}
              className="flex flex-wrap items-center justify-between gap-3 border-b border-[#f0f5f9] px-[22px] py-3 last:border-b-0 max-[860px]:px-[15px]"
            >
              <div className="flex items-center gap-2.5">
                <SkeletonBar w="w-6" h="h-6" className="rounded-lg" />
                <SkeletonBar w="w-16" h="h-5" className="rounded-full" />
                <SkeletonBar w="w-48" h="h-6" />
              </div>
              <SkeletonBar w="w-20" h="h-4" />
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-[minmax(0,1.7fr)_minmax(300px,1fr)] items-start gap-[17px] max-[860px]:grid-cols-1">
        <div className="sticky top-4 order-2 max-[860px]:static max-[860px]:order-1">
          <section
            className={cx(card, "bg-[linear-gradient(180deg,#fff,#fafdff)]")}
            aria-labelledby="rec-title"
          >
            <div className={cardHead}>
              <div>
                <h2 className={cardTitle} id="rec-title">
                  Next match
                </h2>
                <div className={sub}>
                  Players with the fewest games go first.
                </div>
              </div>
              <SkeletonBar w="w-16" h="h-5" className="rounded-full" />
            </div>
            <div className="mx-[18px] mb-4 grid gap-2 rounded-2xl bg-[#f4faff] p-3.5">
              {[0, 1, 2, 3].map((slot) => (
                <SkeletonBar key={slot} w="w-full" h="h-9" className="rounded-xl" />
              ))}
            </div>
            <div className="flex gap-2 px-[18px] pb-4">
              <SkeletonBar w="w-20" h="h-9" className="rounded-xl" />
              <SkeletonBar w="w-full" h="h-9" className="flex-1 rounded-xl" />
            </div>
          </section>
        </div>

        <div className="order-1 min-w-0 max-[860px]:order-2">
          <section className={card} aria-labelledby="grid-title">
            <div className={cardHead}>
              <div>
                <h2 className={cardTitle} id="grid-title">
                  Games played
                </h2>
                <div className={sub}>
                  Columns are created when a match is assigned to a court or queue, and lock automatically at 4 players.
                </div>
              </div>
            </div>
            <div className="border-t border-[#eef4f9]">
              {[0, 1, 2, 3, 4, 5].map((row) => (
                <div
                  key={row}
                  className="flex items-center gap-3 border-b border-[#f0f5f9] px-[22px] py-3 last:border-b-0 max-[860px]:px-3.5"
                >
                  <div aria-hidden="true" className={skelCircle("size-8")} />
                  <div className="min-w-0 flex-1">
                    <SkeletonBar w="w-36" h="h-3.5" />
                  </div>
                  <SkeletonBar w="w-7" h="h-7" className="rounded-[9px]" />
                  <div className="flex gap-3 pl-2">
                    <SkeletonBar w="w-5" h="h-5" className="rounded" />
                    <SkeletonBar w="w-5" h="h-5" className="rounded" />
                    <SkeletonBar w="w-5" h="h-5" className="rounded" />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </SkeletonRegion>
  );
}

