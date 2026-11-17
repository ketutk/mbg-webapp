import Link from "next/link";
import { SkeletonBar, SkeletonRegion } from "@/components/ui/Skeleton";
import { btn, card, cardHead, cardTitle, skelCircle, sub } from "@/lib/ui";

export function SessionLeaderboardSkeleton() {
  return (
    <SkeletonRegion label="Loading session leaderboard">
      <section className="mt-8 mb-[22px] flex flex-wrap items-end justify-between gap-4 max-[860px]:mt-6 max-[860px]:mb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <SkeletonBar w="w-24" h="h-3" />
            <SkeletonBar w="w-14" h="h-5" className="rounded-full" />
          </div>
          <SkeletonBar w="w-64" h="h-9" className="mt-2" />
          <SkeletonBar w="w-56" h="h-3" className="mt-2" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/leaderboards" className={btn("light")}>
            ← All leaderboards
          </Link>
        </div>
      </section>

      <section className={card} aria-labelledby="session-leaderboard-title">
        <div className={cardHead}>
          <div>
            <h2 className={cardTitle} id="session-leaderboard-title">
              Player rankings
            </h2>
            <div className={sub}>
              Sorted by total winning matches, then fewest losses.
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
              <SkeletonBar w="w-8" h="h-6" className="rounded-full" />
              <div aria-hidden="true" className={skelCircle("size-8")} />
              <SkeletonBar w="w-36" h="h-3.5" className="flex-1" />
              <SkeletonBar w="w-14" h="h-7" className="rounded-[9px]" />
              <SkeletonBar w="w-14" h="h-7" className="rounded-[9px]" />
            </li>
          ))}
        </ul>
      </section>
    </SkeletonRegion>
  );
}
