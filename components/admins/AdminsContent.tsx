"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { deleteAdmin, useAdmins } from "@/lib/store";
import { useToast } from "@/lib/stores/ui-store";
import type { AdminUser } from "@/lib/types";
import {
  btn,
  card,
  cardHead,
  cardTitle,
  eyebrow,
  h1,
  pill,
  sub,
} from "@/lib/ui";
import { AdminsSkeleton } from "./AdminsSkeleton";
import { AdminsTable } from "./AdminsTable";

export function AdminsContent({
  currentUserId,
  onAdd,
  onReset,
}: {
  currentUserId: string;
  onAdd: () => void;
  onReset: (admin: AdminUser) => void;
}) {
  const showToast = useToast();
  const { data: admins, loading } = useAdmins();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmAdmin, setConfirmAdmin] = useState<AdminUser | null>(null);

  if (loading || !admins) {
    return (
      <>
        <section className="mt-8 mb-[22px] flex flex-wrap items-end justify-between gap-4 max-[860px]:mt-6 max-[860px]:mb-4">
          <div>
            <div className={eyebrow}>Superadmin</div>
            <h1 className={h1}>Admin accounts</h1>
          </div>
          <button
            id="add-admin-btn"
            className={btn("primary")}
            onClick={onAdd}
          >
            ＋ Add admin
          </button>
        </section>
        <AdminsSkeleton />
      </>
    );
  }

  async function handleConfirmDelete() {
    if (!confirmAdmin) return;
    setDeletingId(confirmAdmin.id);
    try {
      await deleteAdmin(confirmAdmin.id);
      const deletedName = confirmAdmin.username;
      setConfirmAdmin(null);
      showToast(`Admin “${deletedName}” deleted`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not delete admin");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <>
      <section className="mt-8 mb-[22px] flex flex-wrap items-end justify-between gap-4 max-[860px]:mt-6 max-[860px]:mb-4">
        <div>
          <div className={eyebrow}>Superadmin</div>
          <h1 className={h1}>Admin accounts</h1>
        </div>
        <button id="add-admin-btn" className={btn("primary")} onClick={onAdd}>
          ＋ Add admin
        </button>
      </section>

      <section className={card} aria-labelledby="admins-title">
        <div className={cardHead}>
          <div>
            <h2 className={cardTitle} id="admins-title">
              Organisers
            </h2>
            <div className={sub}>
              Soft-deleted accounts keep their username reserved and audit history intact, but cannot log in.
            </div>
          </div>
          <span className={pill("default")}>
            {admins.length} account{admins.length === 1 ? "" : "s"}
          </span>
        </div>

        <AdminsTable
          admins={admins}
          currentUserId={currentUserId}
          deletingId={deletingId}
          onReset={onReset}
          onRequestDelete={setConfirmAdmin}
        />
      </section>

      {confirmAdmin && (
        <ConfirmDialog
          title={`Delete admin “${confirmAdmin.username}”?`}
          description={`Soft-delete organiser account “${confirmAdmin.username}”? Their active sessions will be revoked immediately and they will no longer be able to log in.`}
          confirmLabel="Delete admin"
          busy={deletingId === confirmAdmin.id}
          onConfirm={() => void handleConfirmDelete()}
          onClose={() => setConfirmAdmin(null)}
        />
      )}
    </>
  );
}
