"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { useClubSettings } from "@/lib/store";
import { useToast, useUiStore } from "@/lib/stores/ui-store";
import { btn, cx, eyebrow, h1, pill } from "@/lib/ui";
import { HomeCommunityPillars } from "./HomeCommunityPillars";
import { HomeHowItWorks } from "./HomeHowItWorks";
import { HomeJoinBanner } from "./HomeJoinBanner";
import { HomeLiveHub } from "./HomeLiveHub";

const ClubSettingsDialog = dynamic(() =>
  import("./ClubSettingsDialog").then((m) => m.ClubSettingsDialog),
);

export default function HomeApp() {
  const { user, loading: authLoading } = useAuth();
  const { data: settings } = useClubSettings();
  const openNewSession = useUiStore((s) => s.openNewSession);
  const showToast = useToast();
  const [editingSettings, setEditingSettings] = useState(false);

  const isOrganiser = Boolean(user);
  const isSuperadmin = user?.role === "SUPERADMIN";

  return (
    <>
      {/* Split Hero: Left Intro & CTAs, Right Community Pillars */}
      <section className="mt-8 mb-6 grid grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] items-center gap-6 max-[960px]:grid-cols-1 max-[860px]:mt-6 max-[860px]:mb-5">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={eyebrow}>Minggu Badminton Guys</span>
            {!authLoading && user && (
              <span className={pill(isSuperadmin ? "ok" : "default")}>
                Signed in as {user.username}
              </span>
            )}
          </div>

          <h1 className={h1}>Play fair. Play more.</h1>

          <p className="mt-2 max-w-[490px] text-[13px] leading-relaxed text-muted">
            A Sunday badminton community built on balanced court rotations, live
            queues, and zero sitting out.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-2.5">
            <Link href="/sessions" className={btn("primary", "lg")}>
              Go to Live Sessions →
            </Link>

            {settings.whatsappUrl && (
              <a
                href={settings.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-[14px] border border-[#bde8dd] bg-ok-bg px-[18px] py-3.5 text-sm font-extrabold text-ok no-underline transition-all duration-150 hover:-translate-y-px hover:bg-[#d5f1e9]"
              >
                <span>Join WhatsApp Group</span>
              </a>
            )}

            {settings.ayoUrl && (
              <a
                href={settings.ayoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={cx(btn("light", "lg"), "no-underline")}
              >
                Join on AYO
              </a>
            )}

            {!authLoading && isOrganiser && (
              <button
                type="button"
                className={btn("light", "lg")}
                onClick={openNewSession}
              >
                ＋ New session
              </button>
            )}
          </div>
        </div>

        <HomeCommunityPillars
          settings={settings}
          canEdit={!authLoading && isOrganiser}
          onEdit={() => setEditingSettings(true)}
        />
      </section>

      <HomeLiveHub isOrganiser={!authLoading && isOrganiser} />

      <HomeHowItWorks />

      <HomeJoinBanner
        settings={settings}
        canEdit={!authLoading && isOrganiser}
        onEditSettings={() => setEditingSettings(true)}
      />

      {editingSettings && isOrganiser && (
        <ClubSettingsDialog
          settings={settings}
          onClose={() => setEditingSettings(false)}
          onSaved={showToast}
        />
      )}
    </>
  );
}
