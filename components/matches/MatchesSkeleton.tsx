import { SkeletonBar, SkeletonRegion } from "@/components/ui/Skeleton";
import { eyebrow, h1 } from "@/lib/ui";
import { ExternalMatchesSkeleton } from "./ExternalMatchesSkeleton";

export function MatchesSkeleton() {
  return (
    <SkeletonRegion label="Loading matches">
      <section className="mt-8 mb-6 flex flex-wrap items-end justify-between gap-4 max-[860px]:mt-6 max-[860px]:mb-4">
        <div>
          <div className={eyebrow}>Live match day</div>
          <h1 className={h1}>Play fair. Play more.</h1>
          <div className="mt-1 text-xs text-muted">
            Select an active session below to check live courts, upcoming queue,
            and games played per player.
          </div>
        </div>
        <SkeletonBar w="w-28" h="h-6" className="rounded-full" />
      </section>

      <ExternalMatchesSkeleton />
    </SkeletonRegion>
  );
}

