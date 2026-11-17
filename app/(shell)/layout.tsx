import { Suspense, type ReactNode } from "react";
import { AppHeader, AppHeaderFallback } from "@/components/layout/AppHeader";
import { GlobalDialogs } from "@/components/layout/GlobalDialogs";
import { RouteOverlayReset } from "@/components/layout/RouteOverlayReset";
import { Toast } from "@/components/ui/Toast";

export default function ShellLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Suspense fallback={<AppHeaderFallback />}>
        <AppHeader />
      </Suspense>
      <div className="mx-auto max-w-[1190px] px-[30px] pb-14 max-[860px]:px-3.5 max-[860px]:pb-28">
        <main>{children}</main>
        <GlobalDialogs />
        <Toast />
        <Suspense fallback={null}>
          <RouteOverlayReset />
        </Suspense>
      </div>
    </>
  );
}
