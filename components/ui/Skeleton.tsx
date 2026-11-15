import type { ReactNode } from "react";
import { cx, skelBar } from "@/lib/ui";

export function SkeletonRegion({
  label = "Loading content",
  className,
  children,
}: {
  label?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={label}
      data-skeleton=""
      className={className}
    >
      {children}
    </div>
  );
}

export function SkeletonBar({
  w = "w-24",
  h = "h-3.5",
  className,
}: {
  w?: string;
  h?: string;
  className?: string;
}) {
  return (
    <div aria-hidden="true" className={cx(skelBar(w, h), className)} />
  );
}

