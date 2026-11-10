import type { HTMLAttributes } from "react";
import { cx, shimmerCard } from "@/lib/ui";

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return <div className={cx(shimmerCard, className)} aria-busy="true" {...props} />;
}

