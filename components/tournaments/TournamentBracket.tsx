"use client";

import { useMemo, useState } from "react";
import {
  swapTournamentMatchSlots,
  updateTournamentMatchOrder,
} from "@/lib/store";
import { useToast } from "@/lib/stores/ui-store";
import type { TournamentDetail, TournamentMatch } from "@/lib/types";
import { btn, card, cardHead, cardTitle, cx, sub } from "@/lib/ui";
import {
  TournamentMatchCard,
  type SlotSelection,
} from "./TournamentMatchCard";

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
  const showToast = useToast();
  const [arrangeMode, setArrangeMode] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<SlotSelection | null>(null);
  const [arrangingBusy, setArrangingBusy] = useState(false);

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

  const orderedPlayableIds = useMemo(
    () =>
      tournament.matches
        .filter((m) => m.status !== "BYE")
        .sort(
          (a, b) =>
            (a.playOrder ?? 9999) - (b.playOrder ?? 9999) ||
            a.round - b.round ||
            a.slot - b.slot,
        )
        .map((m) => m.id),
    [tournament.matches],
  );

  const nextUpMatchId = useMemo(() => {
    for (const id of orderedPlayableIds) {
      if (matchMap.get(id)?.status === "READY") return id;
    }
    return null;
  }, [orderedPlayableIds, matchMap]);

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

  const canSwapMatchR1 = (m: TournamentMatch) => {
    if (m.section !== "MAIN" || m.round !== 1) return false;
    if ((m.status !== "READY" && m.status !== "BYE") || m.gameId !== null) {
      return false;
    }
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
    return true;
  };

  async function handleSelectSlot(slot: SlotSelection) {
    if (!selectedSlot) {
      setSelectedSlot(slot);
      return;
    }
    if (selectedSlot.matchId === slot.matchId && selectedSlot.side === slot.side) {
      setSelectedSlot(null);
      return;
    }
    setArrangingBusy(true);
    try {
      await swapTournamentMatchSlots(tournament.id, {
        from: selectedSlot,
        to: slot,
      });
      setSelectedSlot(null);
      showToast("Bracket slots swapped");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not swap slots");
    } finally {
      setArrangingBusy(false);
    }
  }

  async function handleMoveOrder(matchId: string, dir: -1 | 1) {
    const idx = orderedPlayableIds.indexOf(matchId);
    const target = idx + dir;
    if (idx < 0 || target < 0 || target >= orderedPlayableIds.length) return;
    const nextIds = [...orderedPlayableIds];
    [nextIds[idx], nextIds[target]] = [nextIds[target], nextIds[idx]];
    setArrangingBusy(true);
    try {
      await updateTournamentMatchOrder(tournament.id, nextIds);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not update order");
    } finally {
      setArrangingBusy(false);
    }
  }

  const renderMatch = (m: TournamentMatch) => {
    const orderIdx = orderedPlayableIds.indexOf(m.id);
    return (
      <TournamentMatchCard
        key={m.id}
        match={m}
        teamMap={teamMap}
        isOrganiser={isOrganiser}
        arrangeMode={arrangeMode}
        isNextUp={m.id === nextUpMatchId}
        canSwapRoundOne={canSwapMatchR1(m)}
        selectedSlot={selectedSlot}
        canMoveOrderUp={orderIdx > 0}
        canMoveOrderDown={orderIdx >= 0 && orderIdx < orderedPlayableIds.length - 1}
        canUndo={canUndoMatch(m)}
        busy={arrangingBusy || busyMatchId === m.id}
        onSelectSlot={(s) => void handleSelectSlot(s)}
        onMoveOrder={(id, dir) => void handleMoveOrder(id, dir)}
        onStartCourt={onStartCourt}
        onEnterScore={onEnterScore}
        onWalkover={onWalkover}
        onUndo={onUndo}
      />
    );
  };

  return (
    <section className={card}>
      <div className={cardHead}>
        <div>
          <h2 className={cardTitle}>Tournament Bracket</h2>
          <p className={cx(sub, "mt-0.5")}>
            {arrangeMode
              ? "Click any two unstarted Round 1 slots (including BYEs) to swap matchups, or adjust match play order."
              : `Assign READY matches to any open court in ${tournament.session.name}. Losing pairs return to casual play automatically.`}
          </p>
        </div>

        {isOrganiser && tournament.status === "IN_PROGRESS" && (
          <button
            type="button"
            className={btn(arrangeMode ? "primary" : "light", "sm")}
            onClick={() => {
              setArrangeMode((v) => !v);
              setSelectedSlot(null);
            }}
          >
            {arrangeMode ? "✓ Done Arranging" : "⇄ Arrange Bracket"}
          </button>
        )}
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
              className="flex w-[275px] flex-col justify-around gap-4"
            >
              <div className="text-center font-display text-xs font-extrabold tracking-wider text-[#337fc4] uppercase">
                {r.title}
              </div>
              <div className="flex flex-1 flex-col justify-around gap-4">
                {r.matches.map(renderMatch)}
              </div>
            </div>
          ))}

          {thirdPlaceMatch && (
            <div className="flex w-[275px] flex-col justify-center gap-4 border-l border-dashed border-[#dcebf8] pl-5">
              <div className="text-center font-display text-xs font-extrabold tracking-wider text-[#5a7d9c] uppercase">
                3rd Place Playoff
              </div>
              {renderMatch(thirdPlaceMatch)}
            </div>
          )}
        </div>
      </div>

      {/* Mobile single-round stack */}
      <div className="hidden gap-3 p-[15px] max-[860px]:grid">
        {mobileRound === 999 && thirdPlaceMatch
          ? renderMatch(thirdPlaceMatch)
          : (rounds.find((r) => r.round === mobileRound) ?? rounds[0])?.matches.map(
              renderMatch,
            )}
      </div>
    </section>
  );
}
