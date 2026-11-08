"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { fmtDate } from "@/lib/format";
import { deleteAdmin, useAdmins, useHydrated } from "@/lib/store";
import type { AdminUser } from "@/lib/types";
import { AdminDialog } from "./AdminDialog";
import { AppHeader } from "./AppHeader";
import {
  btn,
  card,
  cardHead,
  cardTitle,
  cx,
  empty,
  eyebrow,
  h1,
  linkBtn,
  pill,
  shimmerCard,
  sub,
  toastBox,
} from "@/lib/ui";

export default function AdminsApp() {
  const hydrated = useHydrated();
  const { user, loading: authLoading } = useAuth();
  const [creating, setCreating] = useState(false);
  const [resetTarget, setResetTarget] = useState<AdminUser | null>(null);
  const [toast, setToast] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  function showToast(msg: string) {
    setToast(msg);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(""), 2600);
  }

  const isSuperadmin = user?.role === "SUPERADMIN";

  return (
    <div className="mx-auto max-w-[1190px] px-[30px] pb-14 max-[860px]:px-3.5 max-[860px]:pb-10">
      <AppHeader active="admins" user={user} onToast={showToast} />

      <main>
        {!hydrated || authLoading ? (
          <div className={shimmerCard} aria-busy="true" />
        ) : !isSuperadmin ? (
          <section className={cx(card, "mx-auto mt-14 max-w-[480px] p-8 text-center")}>
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
      </main>

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

      <div
        className={cx(
          toastBox,
          toast ? "translate-y-0 opacity-100" : "translate-y-5 opacity-0",
        )}
        role="status"
      >
        {toast}
      </div>
    </div>
  );
}

function AdminsContent({
  currentUserId,
  onAdd,
  onReset,
  onToast,
}: {
  currentUserId: string;
  onAdd: () => void;
  onReset: (admin: AdminUser) => void;
  onToast: (msg: string) => void;
}) {
  const { data: admins, loading } = useAdmins();

  if (loading || !admins) {
    return <div className={shimmerCard} aria-busy="true" />;
  }

  async function handleDelete(admin: AdminUser) {
    if (
      !window.confirm(
        `Soft-delete admin “${admin.username}”? Their active sessions will be revoked immediately.`,
      )
    ) {
      return;
    }
    try {
      await deleteAdmin(admin.id);
      onToast(`Admin “${admin.username}” deleted`);
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Could not delete admin");
    }
  }

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

        {admins.length === 0 ? (
          <div className={empty}>No accounts found.</div>
        ) : (
          <div className="overflow-x-auto border-t border-[#eef4f9]">
            <table className="w-full border-separate border-spacing-0 text-left text-xs">
              <thead>
                <tr className="bg-[#fafdff] text-[10px] font-extrabold text-[#5d7f9d]">
                  <th className="border-b border-[#f0f5f9] py-2.5 pl-[22px] pr-3 max-[860px]:pl-3.5">
                    Username
                  </th>
                  <th className="border-b border-[#f0f5f9] py-2.5 px-3">
                    Role
                  </th>
                  <th className="border-b border-[#f0f5f9] py-2.5 px-3">
                    Status
                  </th>
                  <th className="border-b border-[#f0f5f9] py-2.5 px-3">
                    Created
                  </th>
                  <th className="border-b border-[#f0f5f9] py-2.5 pr-[22px] pl-3 text-right max-[860px]:pr-3.5">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {admins.map((admin) => {
                  const isDeleted = admin.deletedAt !== null;
                  const canDelete =
                    !isDeleted &&
                    admin.role !== "SUPERADMIN" &&
                    admin.id !== currentUserId;
                  return (
                    <tr key={admin.id} className="hover:bg-[#f9fcff]">
                      <td className="border-b border-[#f0f5f9] py-3 pl-[22px] pr-3 font-bold text-[#204a74] max-[860px]:pl-3.5">
                        {admin.username}
                      </td>
                      <td className="border-b border-[#f0f5f9] py-3 px-3">
                        <span
                          className={pill(
                            admin.role === "SUPERADMIN" ? "ok" : "default",
                          )}
                        >
                          {admin.role}
                        </span>
                      </td>
                      <td className="border-b border-[#f0f5f9] py-3 px-3">
                        {isDeleted ? (
                          <span className={pill("danger")}>
                            Deleted · {fmtDate(admin.deletedAt!)}
                          </span>
                        ) : (
                          <span className={pill("ok")}>Active</span>
                        )}
                      </td>
                      <td className="border-b border-[#f0f5f9] py-3 px-3 text-muted">
                        {fmtDate(admin.createdAt)}
                      </td>
                      <td className="border-b border-[#f0f5f9] py-3 pr-[22px] pl-3 text-right whitespace-nowrap max-[860px]:pr-3.5">
                        {!isDeleted && (
                          <button
                            className={cx(linkBtn, canDelete && "mr-3")}
                            onClick={() => onReset(admin)}
                          >
                            Reset password
                          </button>
                        )}
                        {canDelete && (
                          <button
                            className={cx(linkBtn, "text-[#b5524f]")}
                            onClick={() => void handleDelete(admin)}
                          >
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

