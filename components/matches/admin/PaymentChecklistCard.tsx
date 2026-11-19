"use client";

import { useState } from "react";
import { initials } from "@/lib/initials";
import { setPlayerPaid } from "@/lib/store";
import { useToast } from "@/lib/stores/ui-store";
import type { Session } from "@/lib/types";
import {
  avatar,
  card,
  cardHead,
  cardTitle,
  cx,
  empty,
  pill,
  spinner,
  sub,
} from "@/lib/ui";

type PaidFilter = "ALL" | "UNPAID" | "PAID";

export function PaymentChecklistCard({ session }: { session: Session }) {
  const showToast = useToast();
  const [filter, setFilter] = useState<PaidFilter>("ALL");
  const [pendingIds, setPendingIds] = useState<Set<string>>(() => new Set());

  const totalCount = session.players.length;
  const paidCount = session.players.filter((p) => p.paid).length;
  const unpaidCount = totalCount - paidCount;

  const visiblePlayers = session.players.filter((p) => {
    if (filter === "PAID") return p.paid;
    if (filter === "UNPAID") return !p.paid;
    return true;
  });

  async function handleTogglePaid(playerId: string, paid: boolean) {
    setPendingIds((prev) => new Set(prev).add(playerId));
    try {
      await setPlayerPaid(session.id, playerId, paid);
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Could not update payment status",
      );
    } finally {
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(playerId);
        return next;
      });
    }
  }

  return (
    <section
      className={cx(card, "mt-5")}
      aria-labelledby="payment-checklist-title"
    >
      <div className={cx(cardHead, "flex-wrap items-center")}>
        <div>
          <h2 className={cardTitle} id="payment-checklist-title">
            Payment checklist
          </h2>
          <div className={sub}>
            Organisers only · track which players have paid for this session.
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span
            className={pill(
              paidCount === totalCount && totalCount > 0 ? "ok" : "warn",
            )}
          >
            {paidCount}/{totalCount} paid
          </span>

          <div
            className="inline-flex rounded-xl border border-[#deedf9] bg-[#f4faff] p-0.5 text-[11px] font-extrabold"
            role="group"
            aria-label="Filter payment checklist"
          >
            {(
              [
                { id: "ALL", label: `All (${totalCount})` },
                { id: "UNPAID", label: `Unpaid (${unpaidCount})` },
                { id: "PAID", label: `Paid (${paidCount})` },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                aria-pressed={filter === opt.id}
                onClick={() => setFilter(opt.id)}
                className={cx(
                  "rounded-[9px] px-2.5 py-1 transition-all",
                  filter === opt.id
                    ? "bg-white text-[#204a74] shadow-xs"
                    : "text-muted hover:text-[#204a74]",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {totalCount === 0 ? (
        <div className={cx(empty, "border-t border-[#eef4f9]")}>
          No players yet. Use “Edit players” to add your roster.
        </div>
      ) : visiblePlayers.length === 0 ? (
        <div className={cx(empty, "border-t border-[#eef4f9]")}>
          No {filter.toLowerCase()} players in this session.
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2.5 border-t border-[#eef4f9] px-[22px] py-4 max-[860px]:grid-cols-2 max-[860px]:px-[15px] max-[520px]:grid-cols-1">
          {visiblePlayers.map((player) => {
            const isPending = pendingIds.has(player.id);
            return (
              <label
                key={player.id}
                className={cx(
                  "flex cursor-pointer items-center gap-2.5 rounded-2xl border p-3 transition-colors",
                  player.paid
                    ? "border-[#bde8dd] bg-[#f4fcfa]"
                    : "border-[#e5eff8] bg-[#fafdff] hover:border-[#cbe2f6]",
                  isPending && "opacity-65",
                )}
              >
                <input
                  type="checkbox"
                  checked={player.paid}
                  disabled={isPending}
                  aria-label={`Mark ${player.name} as paid`}
                  onChange={(e) =>
                    void handleTogglePaid(player.id, e.target.checked)
                  }
                  className="size-4.5 cursor-pointer accent-[#2f8f7b] disabled:cursor-not-allowed"
                />
                <span className={avatar}>{initials(player.name)}</span>
                <span className="min-w-0 flex-1 truncate text-xs font-extrabold text-[#204a74]">
                  {player.name}
                </span>
                {isPending ? (
                  <span className={cx(spinner, "text-[#5089b7]")} />
                ) : (
                  <span className={pill(player.paid ? "ok" : "warn")}>
                    {player.paid ? "Paid" : "Unpaid"}
                  </span>
                )}
              </label>
            );
          })}
        </div>
      )}
    </section>
  );
}
