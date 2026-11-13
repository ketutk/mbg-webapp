"use client";

import { useIsFetching } from "@tanstack/react-query";
import { cx, spinner } from "@/lib/ui";

export function SyncStatus({ variant }: { variant: "desktop" | "drawer" }) {
  const isFetching = useIsFetching({
    predicate: (query) => query.state.fetchStatus === "fetching",
  });

  return (
    <span
      className={
        variant === "desktop"
          ? "flex items-center gap-[7px] text-xs text-muted"
          : "flex items-center gap-1.5 text-xs font-bold text-[#204a74]"
      }
    >
      {isFetching > 0 ? (
        <>
          <span className={cx(spinner, "size-2.5 text-[#5da5e4]")} />
          <span>Syncing…</span>
        </>
      ) : (
        <>
          <i
            className={
              variant === "desktop"
                ? "size-[7px] rounded-full bg-[#53b8a3]"
                : "size-2 rounded-full bg-[#53b8a3]"
            }
          />
          <span>Live</span>
        </>
      )}
    </span>
  );
}

