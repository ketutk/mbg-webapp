"use client";

import { fmtDate } from "@/lib/format";
import type { AdminUser } from "@/lib/types";
import { cx, empty, linkBtn, pill, spinner } from "@/lib/ui";

export function AdminsTable({
  admins,
  currentUserId,
  deletingId,
  onReset,
  onRequestDelete,
}: {
  admins: AdminUser[];
  currentUserId: string;
  deletingId: string | null;
  onReset: (admin: AdminUser) => void;
  onRequestDelete: (admin: AdminUser) => void;
}) {
  if (admins.length === 0) {
    return <div className={empty}>No accounts found.</div>;
  }

  return (
    <div className="overflow-x-auto border-t border-[#eef4f9]">
      <table className="w-full border-separate border-spacing-0 text-left text-xs">
        <thead>
          <tr className="bg-[#fafdff] text-[10px] font-extrabold text-[#5d7f9d]">
            <th className="border-b border-[#f0f5f9] py-2.5 pl-[22px] pr-3 max-[860px]:pl-3.5">
              Username
            </th>
            <th className="border-b border-[#f0f5f9] py-2.5 px-3">Role</th>
            <th className="border-b border-[#f0f5f9] py-2.5 px-3">Status</th>
            <th className="border-b border-[#f0f5f9] py-2.5 px-3">Created</th>
            <th className="border-b border-[#f0f5f9] py-2.5 pr-[22px] pl-3 text-right max-[860px]:pr-3.5">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {admins.map((admin) => {
            const isDeleted = admin.deletedAt !== null;
            const isDeleting = deletingId === admin.id;
            const canDelete =
              !isDeleted &&
              admin.role !== "SUPERADMIN" &&
              admin.id !== currentUserId;
            return (
              <tr
                key={admin.id}
                className={cx(
                  "transition-opacity hover:bg-[#f9fcff]",
                  isDeleting && "opacity-50",
                )}
              >
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
                      disabled={isDeleting}
                      onClick={() => onReset(admin)}
                    >
                      Reset password
                    </button>
                  )}
                  {canDelete && (
                    <button
                      className={cx(linkBtn, "text-[#b5524f]")}
                      disabled={isDeleting}
                      onClick={() => onRequestDelete(admin)}
                    >
                      {isDeleting ? (
                        <>
                          <span className={cx(spinner, "mr-1")} />
                          Deleting…
                        </>
                      ) : (
                        "Delete"
                      )}
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

