"use client";

import { useSyncExternalStore } from "react";
import { toast } from "@/lib/toast";
import { cx, toastBox } from "@/lib/ui";

export function ToastHost() {
  const message = useSyncExternalStore(toast.subscribe, toast.get, () => "");

  return (
    <div
      className={cx(
        toastBox,
        message ? "translate-y-0 opacity-100" : "translate-y-5 opacity-0",
      )}
      role="status"
    >
      {message}
    </div>
  );
}

