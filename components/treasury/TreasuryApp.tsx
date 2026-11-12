"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useHydrated } from "@/lib/store";
import { useToast, useUiStore } from "@/lib/stores/ui-store";
import type { EntryType, TreasuryEntry } from "@/lib/types";
import { btn, card, cx, eyebrow, shimmerCard } from "@/lib/ui";
import { TreasuryContent } from "./TreasuryContent";
import { TreasuryEntryDialog } from "./TreasuryEntryDialog";

export default function TreasuryApp() {
  const hydrated = useHydrated();
  const { user, loading: authLoading } = useAuth();
  const openLogin = useUiStore((s) => s.openLogin);
  const [dialogMode, setDialogMode] = useState<{
    initialType?: EntryType;
    editingEntry?: TreasuryEntry;
  } | null>(null);
  const showToast = useToast();

  const isSuperadmin = user?.role === "SUPERADMIN";

  return (
    <>
      {!hydrated || authLoading ? (
        <div className={shimmerCard} aria-busy="true" />
      ) : !user ? (
        <section
          className={cx(card, "mx-auto mt-14 max-w-[480px] p-8 text-center")}
        >
          <div className={eyebrow}>Organisers only</div>
          <h1 className="mt-2 font-display text-2xl font-extrabold text-[#183e6b]">
            Please log in to view treasury
          </h1>
          <p className="mt-2 mb-5 text-xs leading-relaxed text-muted">
            Club treasury balances and transactions are restricted to organisers.
          </p>
          <button className={btn("primary")} onClick={openLogin}>
            Admin login
          </button>
        </section>
      ) : (
        <TreasuryContent
          isSuperadmin={isSuperadmin}
          onAdd={(type) => setDialogMode({ initialType: type })}
          onEdit={(entry) => setDialogMode({ editingEntry: entry })}
        />
      )}

      {dialogMode && (
        <TreasuryEntryDialog
          initialType={dialogMode.initialType}
          editingEntry={dialogMode.editingEntry}
          onClose={() => setDialogMode(null)}
          onSaved={showToast}
        />
      )}
    </>
  );
}
