import type { HTMLAttributes, ReactNode } from "react";
import { card, cx } from "@/lib/ui";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
}

export function Card({ className, children, ...props }: CardProps) {
  return (
    <div className={cx(card, className)} {...props}>
      {children}
    </div>
  );
}

