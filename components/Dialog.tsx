"use client";

import { useEffect, type ReactNode } from "react";
import { btn, cx, modalActions, spinner } from "@/lib/ui";

const maxWidthClasses = {
  sm: "w-[min(420px,100%)]",
  md: "w-[min(520px,100%)]",
  lg: "w-[min(680px,100%)]",
};

export interface DialogProps {
  title: string;
  description?: string;
  onClose: () => void;
  maxWidth?: keyof typeof maxWidthClasses;
  footer?: ReactNode;
  children?: ReactNode;
}

export function Dialog({
  title,
  description,
  onClose,
  maxWidth = "md",
  footer,
  children,
}: DialogProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-20 grid animate-fade place-items-center bg-[#23466ac9] p-[18px]"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className={cx(
          "max-h-[92vh] animate-pop overflow-auto rounded-[20px] border border-[#e3eff9] bg-white p-[23px] shadow-[0_24px_80px_#123b6126]",
          maxWidthClasses[maxWidth],
        )}
      >
        <div className="mb-1.5 flex items-start justify-between gap-3">
          <h2 className="m-0 font-display text-[21px] font-extrabold text-[#234c74]">
            {title}
          </h2>
          <button
            type="button"
            aria-label="Close dialog"
            onClick={onClose}
            className="grid size-7 flex-none place-items-center rounded-lg text-xs font-extrabold text-[#7d9ab4] transition-colors hover:bg-[#f2f8fe] hover:text-[#204a74]"
          >
            ✕
          </button>
        </div>
        {description && (
          <p className="mb-4 text-xs leading-[1.55] text-muted">{description}</p>
        )}
        {children}
        {footer && <div className={modalActions}>{footer}</div>}
      </div>
    </div>
  );
}

export interface ConfirmDialogProps {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "primary" | "danger";
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmDialog({
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  busy = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  return (
    <Dialog
      title={title}
      description={description}
      maxWidth="sm"
      onClose={() => {
        if (!busy) onClose();
      }}
      footer={
        <>
          <button
            type="button"
            className={btn("light")}
            disabled={busy}
            onClick={onClose}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={btn(variant)}
            disabled={busy}
            onClick={onConfirm}
          >
            {busy ? (
              <>
                <span className={cx(spinner, "mr-1.5")} />
                Processing…
              </>
            ) : (
              confirmLabel
            )}
          </button>
        </>
      }
    />
  );
}

