import { Suspense } from "react";
import type { Metadata } from "next";
import { TreasuryScreen } from "@/features/treasury";
import { Skeleton } from "@/components/ui";

export const metadata: Metadata = {
  title: "Treasury",
  robots: {
    index: false,
    follow: false,
  },
};

export default function TreasuryPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-[1190px] px-[30px] pb-14 max-[860px]:px-3.5 max-[860px]:pb-10">
          <Skeleton className="mt-8 h-80" />
        </div>
      }
    >
      <TreasuryScreen />
    </Suspense>
  );
}
