"use client";

import { card, cx, eyebrow } from "@/lib/ui";

const STEPS = [
  {
    num: "01",
    title: "Arrive & Join the Roster",
    desc: "Check in with an organiser at court. Your name is added to the live session board.",
  },
  {
    num: "02",
    title: "Fair Match Rotation",
    desc: "Our planner prioritizes players with the fewest games and mixes partners so nobody sits out.",
  },
  {
    num: "03",
    title: "Track Live & Standings",
    desc: "Follow active courts, upcoming queue, match history, and win leaderboards right on your phone.",
  },
];

export function HomeHowItWorks() {
  return (
    <section aria-labelledby="home-how-title" className="mb-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <div className={eyebrow}>How a Sunday session works</div>
          <h2
            id="home-how-title"
            className="mt-0.5 font-display text-lg font-extrabold tracking-[-0.4px] text-[#183e6b]"
          >
            Simple flow from check-in to final shuttle
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3.5 max-[860px]:grid-cols-1">
        {STEPS.map((step) => (
          <div key={step.num} className={cx(card, "p-4.5")}>
            <span className="inline-grid size-7 place-items-center rounded-lg bg-[#eaf5ff] font-display text-[11px] font-extrabold text-[#337fc4]">
              {step.num}
            </span>
            <h3 className="mt-2.5 font-display text-sm font-extrabold text-[#183e6b]">
              {step.title}
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              {step.desc}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
