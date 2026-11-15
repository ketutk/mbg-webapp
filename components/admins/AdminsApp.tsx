"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/lib/stores/ui-store";
import type { AdminUser } from "@/lib/types";
import { btn, card, cx, eyebrow, h1 } from "@/lib/ui";
import { AdminsContent } from "./AdminsContent";
import { AdminsSkeleton } from "./AdminsSkeleton";

const AdminDialog = dynamic(() =>
  import("./AdminDialog").then((m) => m.AdminDialog),
);

export default function AdminsApp() {
  const { user, loading: authLoading } = useAuth();
  const [creating, setCreating] = useState(false);
  const [resetTarget, setResetTarget] = useState<AdminUser | null>(null);
  const showToast = useToast();

  const isSuperadmin = user?.role === "SUPERADMIN";

  return (
    <>
      {authLoading ? (
        <>
          <section className="mt-8 mb-[22px] flex flex-wrap items-end justify-between gap-4 max-[860px]:mt-6 max-[860px]:mb-4">
            <div>
              <div className={eyebrow}>Superadmin</div>
              <h1 className={h1}>Admin accounts</h1>
            </div>
            <button id="add-admin-btn" className={btn("primary")} disabled>
              ＋ Add admin
            </button>
          </section>
          <AdminsSkeleton />
        </>
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
