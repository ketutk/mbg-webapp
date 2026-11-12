"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useUiStore } from "@/lib/stores/ui-store";

export function RouteOverlayReset() {
  const pathname = usePathname();

  useEffect(() => {
    useUiStore.getState().closeOverlays();
  }, [pathname]);

  return null;
}

