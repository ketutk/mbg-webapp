"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { PLAYER_TIER_META, type PlayerTierLevel } from "@/lib/types";
import { btn, cx } from "@/lib/ui";

const TIER_LEVELS: PlayerTierLevel[] = [1, 2, 3, 4, 5];

const tierColors: Record<PlayerTierLevel, string> = {
  1: "border-[#e2e8f0] bg-[#f8fafc] text-[#475569]",
  2: "border-[#bae6fd] bg-[#f0f9ff] text-[#0369a1]",
  3: "border-[#bbf7d0] bg-[#f0fdf4] text-[#15803d]",
  4: "border-[#fde68a] bg-[#fffbeb] text-[#b45309]",
  5: "border-[#fecaca] bg-[#fef2f2] text-[#b91c1c]",
};

export function TierBadge({ tier }: { tier: PlayerTierLevel | null | undefined }) {
  if (!tier) {
    return (
      <span className="inline-flex items-center rounded-full border border-dashed border-[#cbd5e1] px-2 py-0.5 text-[10px] font-bold text-muted">
        Unrated
      </span>
    );
  }
  const meta = PLAYER_TIER_META[tier];
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-extrabold",
        tierColors[tier],
      )}
      title={`${tier} - ${meta.label}: ${meta.description}`}
    >
      {meta.short} · {meta.label}
    </span>
  );
}

export function TierBadgeSelect({
  tier,
  disabled,
  onChange,
}: {
  tier: PlayerTierLevel | null | undefined;
  disabled?: boolean;
  onChange: (next: PlayerTierLevel | null) => void;
}) {
  return (
    <select
      aria-label="Player skill tier"
      disabled={disabled}
      value={tier ?? ""}
      onChange={(e) => {
        const val = e.target.value;
        onChange(val ? (Number(val) as PlayerTierLevel) : null);
      }}
      className={cx(
        "rounded-full border px-2 py-0.5 text-[11px] font-extrabold outline-none transition-colors focus:border-[#4fa1e8] disabled:opacity-50",
        tier
          ? tierColors[tier]
          : "border-dashed border-[#cbd5e1] bg-white text-muted",
      )}
    >
      <option value="">Unrated</option>
      {TIER_LEVELS.map((lvl) => (
        <option key={lvl} value={lvl}>
          {lvl} - {PLAYER_TIER_META[lvl].label}
        </option>
      ))}
    </select>
  );
}

export function TierGuideButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex size-5 items-center justify-center rounded-full border border-[#cce0f2] bg-[#f4faff] text-[11px] font-extrabold text-[#337fc4] hover:bg-[#e7f3fe]"
        title="View 1–5 skill tier guide"
        aria-label="View 1–5 skill tier guide"
      >
        ?
      </button>

      {open && (
        <Dialog
          title="Player Skill Tier Guide (1–5)"
          description="Admin-only skill rating used for Balanced Pairs randomization (High + Low) and bracket seeding."
          onClose={() => setOpen(false)}
          footer={
            <button
              type="button"
              className={btn("primary")}
              onClick={() => setOpen(false)}
            >
              Got it
            </button>
          }
        >
          <div className="grid gap-2">
            {TIER_LEVELS.map((lvl) => {
              const meta = PLAYER_TIER_META[lvl];
              return (
                <div
                  key={lvl}
                  className="rounded-xl border border-[#e6f0f8] bg-[#fafdff] p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={cx(
                        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-extrabold",
                        tierColors[lvl],
                      )}
                    >
                      {lvl} - {meta.label}
                    </span>
                    <span className="text-[11px] font-bold text-[#204a74]">
                      {meta.description}
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs text-muted">{meta.traits}</p>
                </div>
              );
            })}
          </div>
        </Dialog>
      )}
    </>
  );
}
