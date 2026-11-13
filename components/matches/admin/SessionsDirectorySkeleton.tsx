import { SkeletonBar, SkeletonRegion } from "@/components/ui/Skeleton";
import { card, cardHead, cardTitle, eyebrow, h1, sub } from "@/lib/ui";

export function SessionsDirectorySkeleton({
  showHero = true,
}: {
  showHero?: boolean;
}) {
  return (
    <SkeletonRegion label="Loading game sessions">
      {showHero && (
        <section className="mt-8 mb-5 flex flex-wrap items-end justify-between gap-4 max-[860px]:mt-6 max-[860px]:mb-4">
          <div>
            <div className={eyebrow}>Organiser dashboard</div>
            <h1 className={h1}>Match sessions</h1>
            <SkeletonBar w="w-80" h="h-3.5" className="mt-2 max-w-full" />
          </div>
        </section>
      )}

      <section
        id="sessions-directory"
        className={card}
        aria-labelledby="sessions-directory-title"
      >
        <div className={cardHead}>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className={cardTitle} id="sessions-directory-title">
                All game sessions
              </h2>
              <SkeletonBar w="w-16" h="h-5" className="rounded-full" />
              <SkeletonBar w="w-16" h="h-5" className="rounded-full" />
            </div>
            <div className={sub}>
              Closed sessions are hidden from public visitors and visible only
              to admins and superadmins.
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
                <th className="border-b border-[#f0f5f9] py-2.5 px-3">Session</th>
                <th className="border-b border-[#f0f5f9] py-2.5 px-3">Status</th>
                <th className="border-b border-[#f0f5f9] py-2.5 px-3 text-center">
                  Courts
                </th>
                <th className="border-b border-[#f0f5f9] py-2.5 px-3 text-center">
                  Players
                </th>
                <th className="border-b border-[#f0f5f9] py-2.5 px-3 text-center">
                  Matches
                </th>
                <th className="border-b border-[#f0f5f9] py-2.5 pr-[22px] pl-3 text-right max-[860px]:pr-3.5">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {[0, 1, 2, 3, 4].map((row) => (
                <tr key={row}>
                  <td className="border-b border-[#f0f5f9] py-3.5 pl-[22px] pr-3 max-[860px]:pl-3.5">
                    <SkeletonBar w="w-20" h="h-3.5" />
                  </td>
                  <td className="border-b border-[#f0f5f9] py-3.5 px-3">
                    <SkeletonBar w="w-40" h="h-4" />
                  </td>
                  <td className="border-b border-[#f0f5f9] py-3.5 px-3">
                    <SkeletonBar w="w-14" h="h-5" className="rounded-full" />
                  </td>
                  <td className="border-b border-[#f0f5f9] py-3.5 px-3">
                    <SkeletonBar w="w-6" h="h-4" className="mx-auto" />
                  </td>
                  <td className="border-b border-[#f0f5f9] py-3.5 px-3">
                    <SkeletonBar w="w-6" h="h-4" className="mx-auto" />
                  </td>
                  <td className="border-b border-[#f0f5f9] py-3.5 px-3">
                    <SkeletonBar w="w-6" h="h-4" className="mx-auto" />
                  </td>
                  <td className="border-b border-[#f0f5f9] py-3.5 pr-[22px] pl-3 max-[860px]:pr-3.5">
                    <SkeletonBar w="w-24" h="h-7" className="ml-auto rounded-xl" />
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

