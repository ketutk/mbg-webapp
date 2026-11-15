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

export function VisitorViewSkeleton({
  onBackToList,
}: {
  onBackToList?: () => void;
}) {
  return (
    <SkeletonRegion label="Loading session">
      <section className="mt-8 mb-[22px] flex flex-wrap items-end justify-between gap-4 max-[860px]:mt-6 max-[860px]:mb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <SkeletonBar w="w-24" h="h-3" />
            <SkeletonBar w="w-14" h="h-5" className="rounded-full" />
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
        </div>
      </section>

      <section className="mb-5" aria-labelledby="visitor-courts-title">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className={cardTitle} id="visitor-courts-title">
              Courts
            </h2>
            <div className={sub}>Live matches currently on court.</div>
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
            </div>
          ))}
        </div>
      </section>

      <section className={cx(card, "mb-5")} aria-labelledby="visitor-queue-title">
        <div className={cardHead}>
          <div>
            <div className="flex items-center gap-2">
              <h2 className={cardTitle} id="visitor-queue-title">
                Queue · Next matches
              </h2>
              <SkeletonBar w="w-16" h="h-5" className="rounded-full" />
            </div>
            <div className={sub}>
              Players in the queue are next up when a court finishes.
            </div>
          </div>
        </div>
        <div className="border-t border-[#eef4f9]">
          {[0, 1].map((row) => (
            <div
              key={row}
              className="flex flex-wrap items-center gap-2.5 border-b border-[#f0f5f9] px-[22px] py-3 last:border-b-0 max-[860px]:px-[15px]"
            >
              <SkeletonBar w="w-6" h="h-6" className="rounded-lg" />
              <SkeletonBar w="w-16" h="h-5" className="rounded-full" />
              <SkeletonBar w="w-44" h="h-6" />
            </div>
          ))}
        </div>
      </section>

      <section className={card} aria-labelledby="visitor-players-title">
        <div className={cardHead}>
          <div>
            <h2 className={cardTitle} id="visitor-players-title">
              Games played
            </h2>
            <div className={sub}>
              Games played per player in this session (including queued matches).
            </div>
          </div>
          <SkeletonBar w="w-20" h="h-5" className="rounded-full" />
        </div>
        <ul className="list-none border-t border-[#eef4f9]">
          {[0, 1, 2, 3, 4, 5].map((row) => (
            <li
              key={row}
              className="flex items-center gap-3 border-b border-[#f0f5f9] px-[22px] py-3 last:border-b-0 max-[860px]:px-[15px]"
            >
              <div aria-hidden="true" className={skelCircle("size-8")} />
              <div className="min-w-0 flex-1">
                <SkeletonBar w="w-36" h="h-3.5" />
              </div>
              <SkeletonBar w="w-7" h="h-7" className="rounded-[9px]" />
            </li>
          ))}
        </ul>
      </section>
    </SkeletonRegion>
  );
}

