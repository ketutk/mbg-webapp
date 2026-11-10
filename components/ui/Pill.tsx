import type { HTMLAttributes, ReactNode } from "react";
import { pill } from "@/lib/ui";

export interface PillProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "warn" | "ok" | "next" | "danger";
  children?: ReactNode;
}

export function Pill({
  variant = "default",
  className,
  children,
  ...props
}: PillProps) {
  return (
    <span className={[pill(variant), className].filter(Boolean).join(" ")} {...props}>
      {children}
    </span>
  );
}

