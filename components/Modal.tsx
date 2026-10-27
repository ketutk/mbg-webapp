"use client";

import { useEffect, type ReactNode } from "react";

export function Modal({
  title,
  description,
  onClose,
  children,
}: {
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
}) {
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
      <div className="max-h-[92vh] w-[min(520px,100%)] animate-pop overflow-auto rounded-[20px] border border-[#e3eff9] bg-white p-[23px] shadow-[0_24px_80px_#123b6126]">
        <h2 className="mb-1.5 font-display text-[21px] font-extrabold text-[#234c74]">
          {title}
        </h2>
        {description && (
          <p className="mb-4 text-xs leading-[1.55] text-muted">{description}</p>
        )}
        {children}
      </div>
    </div>
  );
}
