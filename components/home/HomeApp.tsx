"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { useUiStore } from "@/lib/stores/ui-store";
import { btn, card, cx, eyebrow, h1, pill } from "@/lib/ui";

export default function HomeApp() {
  const { user, loading: authLoading } = useAuth();
  const openLogin = useUiStore((s) => s.openLogin);
  const openNewSession = useUiStore((s) => s.openNewSession);
  const isSuperadmin = user?.role === "SUPERADMIN";

  return (
    <>
      <section className="mt-8 mb-6 flex flex-wrap items-end justify-between gap-4 max-[860px]:mt-6 max-[860px]:mb-4">
        <div>
          <div className={eyebrow}>Minggu Badminton Guys</div>
          <h1 className={h1}>Play fair. Play more.</h1>
          <p className="mt-1.5 max-w-[540px] text-xs leading-relaxed text-muted">
            Balanced court rotation, live queue order, and transparent games
            played across every club session.
          </p>
        </div>
        {!authLoading && user && (
          <span className={pill(isSuperadmin ? "ok" : "default")}>
            Signed in as {user.username}
          </span>
        )}
      </section>

      <section
        aria-labelledby="home-sessions-title"
        className={cx(
          card,
          "mb-5 bg-[linear-gradient(135deg,#ffffff,#f4faff)] p-7 max-[860px]:p-5",
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div className="max-w-[600px]">
            <div className="flex flex-wrap items-center gap-2">
              <span className={pill("ok")}>Live club hub</span>
              <span className={eyebrow}>Sessions directory</span>
            </div>
            <h2
              id="home-sessions-title"
              className="mt-3 font-display text-2xl font-extrabold tracking-[-0.6px] text-[#183e6b] max-[860px]:text-xl"
            >
              Browse all game sessions
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-muted">
              Head to the Sessions page to explore active and upcoming club
              sessions, follow live court assignments, check the next-up queue,
              or manage matches as an organiser.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link href="/sessions" className={btn("primary", "lg")}>
              Go to sessions →
            </Link>
            {!authLoading && isSuperadmin && (
              <button
                type="button"
                className={btn("light", "lg")}
                onClick={openNewSession}
              >
                ＋ New session
              </button>
            )}
            {!authLoading && !user && (
              <button
                type="button"
                className={btn("light", "lg")}
                onClick={openLogin}
              >
                Admin login
              </button>
            )}
          </div>
        </div>
      </section>

      <section
        aria-label="Quick navigation"
        className="grid grid-cols-2 gap-4 max-[860px]:grid-cols-1"
      >
        <Link
          href="/sessions"
          className={cx(
            card,
            "group flex flex-col justify-between p-5 no-underline transition-all duration-150 hover:-translate-y-0.5 hover:border-[#b9dbf7]",
          )}
        >
          <div>
            <span className={eyebrow}>Match day</span>
            <h3 className="mt-1.5 font-display text-lg font-extrabold text-[#183e6b] group-hover:text-[#337fc4]">
              All sessions
            </h3>
            <p className="mt-1.5 text-xs leading-relaxed text-muted">
              Open a session to view courts, queue status, player roster, and
              match history.
            </p>
          </div>
          <span className="mt-4 inline-flex items-center text-xs font-extrabold text-[#3c78aa]">
            Open sessions →
          </span>
        </Link>

        <Link
          href="/leaderboards"
          className={cx(
            card,
            "group flex flex-col justify-between p-5 no-underline transition-all duration-150 hover:-translate-y-0.5 hover:border-[#b9dbf7]",
          )}
        >
          <div>
            <span className={eyebrow}>Standings</span>
            <h3 className="mt-1.5 font-display text-lg font-extrabold text-[#183e6b] group-hover:text-[#337fc4]">
              Leaderboards
            </h3>
            <p className="mt-1.5 text-xs leading-relaxed text-muted">
              See games played rankings and participation balance across active
              sessions.
            </p>
          </div>
          <span className="mt-4 inline-flex items-center text-xs font-extrabold text-[#3c78aa]">
            View leaderboards →
          </span>
        </Link>
      </section>
    </>
  );
}
