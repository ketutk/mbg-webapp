import { Suspense } from "react";
import { HomeScreen } from "@/features/sessions";
import { Skeleton } from "@/components/ui";

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-[1190px] px-[30px] pb-14 max-[860px]:px-3.5 max-[860px]:pb-10">
          <Skeleton className="mt-8 h-80" />
        </div>
      }
    >
      <HomeScreen />
    </Suspense>
  );
}
