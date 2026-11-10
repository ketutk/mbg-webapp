import type { ButtonHTMLAttributes, ReactNode } from "react";
import { btn, cx, spinner } from "@/lib/ui";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "light" | "danger";
  size?: "sm" | "md" | "lg";
  isPending?: boolean;
  children?: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  isPending = false,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || isPending}
      className={cx(btn(variant, size), className)}
      {...props}
    >
      {isPending && <span className={cx(spinner, "mr-1.5")} />}
      {children}
    </button>
  );
}

