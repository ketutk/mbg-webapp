"use client";

import type { ClubSettings } from "@/lib/types";
import { card, cx, linkBtn } from "@/lib/ui";

export function HomeCommunityPillars({
  settings,
  canEdit,
  onEdit,
}: {
  settings: ClubSettings;
  canEdit: boolean;
  onEdit: () => void;
}) {
  return (
    <section
      aria-labelledby="home-community-title"
      className={cx(
        card,
        "bg-[linear-gradient(180deg,#ffffff,#f7fbff)] p-6 max-[860px]:p-5",
      )}
    >
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2
          id="home-community-title"
          className="m-0 font-display text-[19px] font-extrabold tracking-[-0.4px] text-[#183e6b]"
        >
          New to our community?
        </h2>
        {canEdit && (
          <button
            type="button"
            id="edit-club-info"
            className={linkBtn}
            onClick={onEdit}
          >
            Edit info
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4 max-[600px]:grid-cols-1 max-[600px]:gap-3.5">
        <div className="flex flex-col items-center text-center max-[600px]:flex-row max-[600px]:items-start max-[600px]:gap-3 max-[600px]:text-left">
          <div className="grid size-11 flex-none place-items-center rounded-2xl border border-[#d6eafb] bg-[#edf6ff] text-[#2c6ba1]">
            <svg
              className="size-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.9}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" />
            </svg>
          </div>
          <div className="mt-2.5 max-[600px]:mt-0">
            <div className="font-display text-xs font-extrabold text-[#183e6b]">
              When &amp; Where
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-muted">
              {settings.schedule} · {settings.venue}
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center text-center max-[600px]:flex-row max-[600px]:items-start max-[600px]:gap-3 max-[600px]:text-left">
          <div className="grid size-11 flex-none place-items-center rounded-2xl border border-[#d6eafb] bg-[#edf6ff] text-[#2c6ba1]">
            <svg
              className="size-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.9}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="14.5" cy="9.5" r="5.5" />
              <path d="M10.5 13.5 5 19" />
              <path d="M4 20l2-2" />
              <path d="M6.5 6.5 9 9" />
            </svg>
          </div>
          <div className="mt-2.5 max-[600px]:mt-0">
            <div className="font-display text-xs font-extrabold text-[#183e6b]">
              Skill Level
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-muted">
              {settings.skillLevel}
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center text-center max-[600px]:flex-row max-[600px]:items-start max-[600px]:gap-3 max-[600px]:text-left">
          <div className="grid size-11 flex-none place-items-center rounded-2xl border border-[#d6eafb] bg-[#edf6ff] text-[#2c6ba1]">
            <svg
              className="size-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.9}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M21 12a9 9 0 0 0-15.5-6.3L3 8" />
              <path d="M3 3v5h5" />
              <path d="M3 12a9 9 0 0 0 15.5 6.3L21 16" />
              <path d="M16 16h5v5" />
            </svg>
          </div>
          <div className="mt-2.5 max-[600px]:mt-0">
            <div className="font-display text-xs font-extrabold text-[#183e6b]">
              How it Works
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-muted">
              Equal court time &amp; fresh partners using our fair match planner
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
