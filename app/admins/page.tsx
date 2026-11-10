import { Suspense } from "react";
import type { Metadata } from "next";
import AdminsApp from "@/components/AdminsApp";
import { Skeleton } from "@/components/ui";

export const metadata: Metadata = {
  title: "Admins",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminsPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-[1190px] px-[30px] pb-14 max-[860px]:px-3.5 max-[860px]:pb-10">
          <Skeleton className="mt-8 h-80" />
        </div>
      }
    >
      <AdminsApp />
    </Suspense>
  );
}
