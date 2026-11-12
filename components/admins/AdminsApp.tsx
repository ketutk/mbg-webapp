"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { useHydrated } from "@/lib/store";
import { useToast } from "@/lib/stores/ui-store";
import type { AdminUser } from "@/lib/types";
import { btn, card, cx, eyebrow, shimmerCard } from "@/lib/ui";
import { AdminDialog } from "./AdminDialog";
import { AdminsContent } from "./AdminsContent";

export default function AdminsApp() {
  const hydrated = useHydrated();
  const { user, loading: authLoading } = useAuth();
  const [creating, setCreating] = useState(false);
  const [resetTarget, setResetTarget] = useState<AdminUser | null>(null);
  const showToast = useToast();

  const isSuperadmin = user?.role === "SUPERADMIN";

  return (
    <>
      {!hydrated || authLoading ? (
        <div className={shimmerCard} aria-busy="true" />
      ) : !isSuperadmin ? (
        <section
          className={cx(card, "mx-auto mt-14 max-w-[480px] p-8 text-center")}
        >
          <div className={eyebrow}>Restricted</div>
          <h1 className="mt-2 font-display text-2xl font-extrabold text-[#183e6b]">
            Not allowed
          </h1>
          <p className="mt-2 mb-5 text-xs leading-relaxed text-muted">
            Only superadmins can view or manage organiser accounts.
          </p>
          <Link href="/" className={btn("primary")}>
            Back to matches
          </Link>
        </section>
      ) : (
        <AdminsContent
          currentUserId={user.id}
          onAdd={() => setCreating(true)}
          onReset={(admin) => setResetTarget(admin)}
          onToast={showToast}
        />
      )}

      {creating && (
        <AdminDialog
          onClose={() => setCreating(false)}
          onSaved={showToast}
        />
      )}
      {resetTarget && (
        <AdminDialog
          resetTarget={resetTarget}
          onClose={() => setResetTarget(null)}
          onSaved={showToast}
        />
      )}
    </>
  );
}
