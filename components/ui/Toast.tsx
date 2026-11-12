"use client";

import { useUiStore } from "@/lib/stores/ui-store";
import { cx, toastBox } from "@/lib/ui";

export function Toast() {
  const toast = useUiStore((s) => s.toast);
  return (
    <div
      className={cx(
        toastBox,
        toast ? "translate-y-0 opacity-100" : "translate-y-5 opacity-0",
      )}
      role="status"
    >
      {toast}
    </div>
  );
}

