import { SkeletonBar, SkeletonRegion } from "@/components/ui/Skeleton";
import { card, cx, eyebrow } from "@/lib/ui";

export function ExternalMatchesSkeleton() {
  return (
    <SkeletonRegion
      label="Loading open sessions"
      className="grid grid-cols-3 gap-4 max-[960px]:grid-cols-2 max-[600px]:grid-cols-1"
    >
      {[0, 1, 2].map((idx) => (
        <article
          key={idx}
          className={cx(card, "flex flex-col justify-between p-5")}
        >
          <div>
            <div className="flex items-center justify-between gap-2">
              <SkeletonBar w="w-24" h="h-3" />
              <SkeletonBar w="w-14" h="h-5" className="rounded-full" />
            </div>
            <SkeletonBar w="w-3/4" h="h-5" className="mt-2.5" />

            <div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl border border-[#e6f1fb] bg-[#f7fbff] p-3 text-center">
              <div>
                <SkeletonBar w="w-6" h="h-4" className="mx-auto" />
                <div className="mt-1 text-[10px] font-bold text-muted">
                  Courts
                </div>
              </div>
              <div className="border-x border-[#e3eff9]">
                <SkeletonBar w="w-6" h="h-4" className="mx-auto" />
                <div className="mt-1 text-[10px] font-bold text-muted">
                  Players
                </div>
              </div>
              <div>
                <SkeletonBar w="w-6" h="h-4" className="mx-auto" />
                <div className="mt-1 text-[10px] font-bold text-muted">
                  Matches
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-[#eef4f9] pt-3.5">
            <span className={cx(eyebrow, "text-[10px] tracking-normal text-muted normal-case")}>
              Live courts & queue
            </span>
            <span className="text-xs font-extrabold text-[#3c78aa]">
              View session →
            </span>
          </div>
        </article>
      ))}
    </SkeletonRegion>
  );
}

