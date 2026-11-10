import type { ReactNode } from "react";
import { cx, errorNotice, field, fieldLabel, notice } from "@/lib/ui";

export interface FieldProps {
  label?: string;
  error?: string;
  hint?: string;
  className?: string;
  children: ReactNode;
}

export function Field({ label, error, hint, className, children }: FieldProps) {
  return (
    <div className={cx(field, className)}>
      {label && <span className={fieldLabel}>{label}</span>}
      {children}
      {hint && !error && <div className={notice}>{hint}</div>}
      {error && <div className={errorNotice}>{error}</div>}
    </div>
  );
}

