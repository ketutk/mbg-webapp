"use client";

import Link from "next/link";
import type { ClubSettings } from "@/lib/types";

export function HomeJoinBanner({
  settings,
  canEdit,
  onEditSettings,
}: {
  settings: ClubSettings;
  canEdit: boolean;
  onEditSettings: () => void;
}) {
  const hasLinks = Boolean(settings.whatsappUrl || settings.ayoUrl);

  return (
    <section
      aria-labelledby="home-join-title"
      className="overflow-hidden rounded-[22px] bg-[linear-gradient(135deg,#173b66,#164e52)] p-7 text-white shadow-[0_14px_34px_#173b6628] max-[860px]:p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-5">
        <div className="max-w-[540px]">
          <h2
            id="home-join-title"
            className="m-0 font-display text-xl font-extrabold tracking-[-0.4px] text-white max-[860px]:text-lg"
          >
            Want to join our next session?
          </h2>
          <p className="mt-1.5 text-xs leading-relaxed text-[#cfe3f2]">
            Hop into our WhatsApp group or join us on AYO to RSVP, check open
            slots, and meet the Minggu Badminton Guys crew.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {settings.whatsappUrl && (
            <a
              href={settings.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-[#2f8f7b] px-4 py-3 text-xs font-extrabold text-white no-underline shadow-[0_6px_16px_#0c2a2433] transition-all duration-150 hover:-translate-y-px hover:bg-[#277b69]"
            >
              <span>Join WhatsApp Group →</span>
            </a>
          )}

          {settings.ayoUrl && (
            <a
              href={settings.ayoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/12 px-4 py-3 text-xs font-extrabold text-white no-underline backdrop-blur-xs transition-all duration-150 hover:-translate-y-px hover:bg-white/20"
            >
              <span>Join on AYO →</span>
            </a>
          )}

          {!hasLinks &&
            (canEdit ? (
              <button
                type="button"
                onClick={onEditSettings}
                className="rounded-xl border border-white/25 bg-white/12 px-4 py-3 text-xs font-extrabold text-white transition-all duration-150 hover:-translate-y-px hover:bg-white/20"
              >
                ＋ Add WhatsApp / AYO links
              </button>
            ) : (
              <Link
                href="/sessions"
                className="inline-flex items-center rounded-xl bg-[#2f8f7b] px-4 py-3 text-xs font-extrabold text-white no-underline transition-all duration-150 hover:-translate-y-px hover:bg-[#277b69]"
              >
                Browse Live Sessions →
              </Link>
            ))}
        </div>
      </div>
    </section>
  );
}
