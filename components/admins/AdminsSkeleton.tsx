import { SkeletonBar, SkeletonRegion } from "@/components/ui/Skeleton";
import { card, cardHead, cardTitle, sub } from "@/lib/ui";

export function AdminsSkeleton() {
  return (
    <SkeletonRegion label="Loading organiser accounts">
      <section className={card} aria-labelledby="admins-title">
        <div className={cardHead}>
          <div>
            <h2 className={cardTitle} id="admins-title">
              Organisers
            </h2>
            <div className={sub}>
              Soft-deleted accounts keep their username reserved and audit history intact, but cannot log in.
            </div>
          </div>
          <SkeletonBar w="w-20" h="h-5" className="rounded-full" />
        </div>

        <div className="overflow-x-auto border-t border-[#eef4f9]">
          <table className="w-full border-separate border-spacing-0 text-left text-xs">
            <thead>
              <tr className="bg-[#fafdff] text-[10px] font-extrabold text-[#5d7f9d]">
                <th className="border-b border-[#f0f5f9] py-2.5 pl-[22px] pr-3 max-[860px]:pl-3.5">
                  Username
                </th>
                <th className="border-b border-[#f0f5f9] py-2.5 px-3">Role</th>
                <th className="border-b border-[#f0f5f9] py-2.5 px-3">Status</th>
                <th className="border-b border-[#f0f5f9] py-2.5 px-3">Created</th>
                <th className="border-b border-[#f0f5f9] py-2.5 pr-[22px] pl-3 text-right max-[860px]:pr-3.5">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {[0, 1, 2, 3].map((row) => (
                <tr key={row}>
                  <td className="border-b border-[#f0f5f9] py-3.5 pl-[22px] pr-3 max-[860px]:pl-3.5">
                    <SkeletonBar w="w-28" h="h-4" />
                  </td>
                  <td className="border-b border-[#f0f5f9] py-3.5 px-3">
                    <SkeletonBar w="w-20" h="h-5" className="rounded-full" />
                  </td>
                  <td className="border-b border-[#f0f5f9] py-3.5 px-3">
                    <SkeletonBar w="w-16" h="h-5" className="rounded-full" />
                  </td>
                  <td className="border-b border-[#f0f5f9] py-3.5 px-3">
                    <SkeletonBar w="w-24" h="h-3.5" />
                  </td>
                  <td className="border-b border-[#f0f5f9] py-3.5 pr-[22px] pl-3 max-[860px]:pr-3.5">
                    <SkeletonBar w="w-24" h="h-4" className="ml-auto" />
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

