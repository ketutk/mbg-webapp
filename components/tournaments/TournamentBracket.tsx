"use client";

import { useMemo, useState } from "react";
import type { TournamentDetail, TournamentMatch } from "@/lib/types";
import { card, cardHead, cardTitle, cx, sub } from "@/lib/ui";
import { TournamentMatchCard } from "./TournamentMatchCard";

export function TournamentBracket({
  tournament,
  isOrganiser,
  busyMatchId,
  onStartCourt,
  onEnterScore,
  onWalkover,
  onUndo,
}: {
  tournament: TournamentDetail;
  isOrganiser: boolean;
  busyMatchId: string | null;
  onStartCourt: (match: TournamentMatch) => void;
  onEnterScore: (match: TournamentMatch) => void;
  onWalkover: (match: TournamentMatch, winnerSide: "A" | "B") => void;
  onUndo: (match: TournamentMatch) => void;
}) {
  const teamMap = useMemo(
    () => new Map(tournament.teams.map((t) => [t.id, t])),
    [tournament.teams],
  );
  const matchMap = useMemo(
    () => new Map(tournament.matches.map((m) => [m.id, m])),
    [tournament.matches],
  );

  const mainMatches = useMemo(
    () => tournament.matches.filter((m) => m.section === "MAIN"),
    [tournament.matches],
  );
  const thirdPlaceMatch = useMemo(
    () => tournament.matches.find((m) => m.section === "THIRD_PLACE") ?? null,
    [tournament.matches],
  );

  const rounds = useMemo(() => {
    const map = new Map<number, TournamentMatch[]>();
    for (const m of mainMatches) {
      const list = map.get(m.round);
      if (list) list.push(m);
      else map.set(m.round, [m]);
    }
    return [...map.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([round, list]) => ({
        round,
        title:
          list.length === 1
            ? list[0].label
            : list[0].label.replace(/\s+\d+$/, ""),
        matches: list.sort((a, b) => a.slot - b.slot),
      }));
  }, [mainMatches]);

  const [mobileRound, setMobileRound] = useState<number>(
    () => rounds[0]?.round ?? 1,
  );

  const canUndoMatch = (m: TournamentMatch) => {
    if (m.status !== "COMPLETED") return false;
    if (m.nextMatchId) {
      const next = matchMap.get(m.nextMatchId);
      if (
        next &&
        (next.status === "IN_PROGRESS" ||
          next.status === "COMPLETED" ||
          next.gameId !== null)
      ) {
        return false;
      }
    }
    if (m.loserNextMatchId) {
      const loserNext = matchMap.get(m.loserNextMatchId);
      if (
        loserNext &&
        (loserNext.status === "IN_PROGRESS" ||
          loserNext.status === "COMPLETED" ||
          loserNext.gameId !== null)
      ) {
        return false;
      }
    }
    return true;
  };

  return (
    <section className={card}>
      <div className={cardHead}>
        <div>
          <h2 className={cardTitle}>Tournament Bracket</h2>
          <p className={cx(sub, "mt-0.5")}>
            Assign READY matches to any open court in {tournament.session.name}.
            Losing pairs return to casual play automatically.
          </p>
        </div>
      </div>

      {/* Mobile round pills */}
      <div className="hidden flex-wrap gap-1.5 border-b border-[#eef4f9] px-[15px] py-3 max-[860px]:flex">
        {rounds.map((r) => (
          <button
            key={r.round}
            type="button"
            onClick={() => setMobileRound(r.round)}
            className={cx(
              "rounded-full border px-3 py-1 text-xs font-extrabold",
              mobileRound === r.round
                ? "border-[#56a2e6] bg-[#56a2e6] text-white"
                : "border-[#dceaf6] bg-white text-[#204a74]",
            )}
          >
            {r.title}
          </button>
        ))}
        {thirdPlaceMatch && (
          <button
            type="button"
            onClick={() => setMobileRound(999)}
            className={cx(
              "rounded-full border px-3 py-1 text-xs font-extrabold",
              mobileRound === 999
                ? "border-[#56a2e6] bg-[#56a2e6] text-white"
                : "border-[#dceaf6] bg-white text-[#204a74]",
            )}
          >
            3rd Place
          </button>
        )}
      </div>

      {/* Desktop horizontal bracket */}
      <div className="overflow-x-auto p-5 max-[860px]:hidden">
        <div className="flex min-w-max items-stretch gap-5">
          {rounds.map((r) => (
            <div
              key={r.round}
              className="flex w-[270px] flex-col justify-around gap-4"
            >
              <div className="text-center font-display text-xs font-extrabold tracking-wider text-[#337fc4] uppercase">
                {r.title}
              </div>
              <div className="flex flex-1 flex-col justify-around gap-4">
                {r.matches.map((m) => (
                  <TournamentMatchCard
                    key={m.id}
                    match={m}
                    teamMap={teamMap}
                    isOrganiser={isOrganiser}
                    canUndo={canUndoMatch(m)}
                    busy={busyMatchId === m.id}
                    onStartCourt={onStartCourt}
                    onEnterScore={onEnterScore}
                    onWalkover={onWalkover}
                    onUndo={onUndo}
                  />
                ))}
              </div>
            </div>
          ))}

          {thirdPlaceMatch && (
            <div className="flex w-[270px] flex-col justify-center gap-4 border-l border-dashed border-[#dcebf8] pl-5">
              <div className="text-center font-display text-xs font-extrabold tracking-wider text-[#5a7d9c] uppercase">
                3rd Place Playoff
              </div>
              <TournamentMatchCard
                match={thirdPlaceMatch}
                teamMap={teamMap}
                isOrganiser={isOrganiser}
                canUndo={canUndoMatch(thirdPlaceMatch)}
                busy={busyMatchId === thirdPlaceMatch.id}
                onStartCourt={onStartCourt}
                onEnterScore={onEnterScore}
                onWalkover={onWalkover}
                onUndo={onUndo}
              />
            </div>
          )}
        </div>
      </div>

      {/* Mobile single-round stack */}
      <div className="hidden gap-3 p-[15px] max-[860px]:grid">
        {mobileRound === 999 && thirdPlaceMatch ? (
          <TournamentMatchCard
            match={thirdPlaceMatch}
            teamMap={teamMap}
            isOrganiser={isOrganiser}
            canUndo={canUndoMatch(thirdPlaceMatch)}
            busy={busyMatchId === thirdPlaceMatch.id}
            onStartCourt={onStartCourt}
            onEnterScore={onEnterScore}
            onWalkover={onWalkover}
            onUndo={onUndo}
          />
        ) : (
          (rounds.find((r) => r.round === mobileRound) ?? rounds[0])?.matches.map(
            (m) => (
              <TournamentMatchCard
                key={m.id}
                match={m}
                teamMap={teamMap}
                isOrganiser={isOrganiser}
                canUndo={canUndoMatch(m)}
                busy={busyMatchId === m.id}
                onStartCourt={onStartCourt}
                onEnterScore={onEnterScore}
                onWalkover={onWalkover}
                onUndo={onUndo}
              />
            ),
          )
        )}
      </div>
    </section>
  );
}
