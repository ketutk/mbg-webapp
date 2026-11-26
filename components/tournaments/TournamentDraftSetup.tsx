"use client";

import { useMemo, useState } from "react";
import {
  addTournamentTeam,
  randomizeTournamentTeams,
  removeTournamentTeam,
  reorderTournamentTeams,
  setPlayerTier,
  startTournament,
  updateTournament,
  updateTournamentTeam,
} from "@/lib/store";
import { useToast } from "@/lib/stores/ui-store";
import type { PlayerTierLevel, TournamentDetail } from "@/lib/types";
import {
  btn,
  card,
  cardHead,
  cardTitle,
  cx,
  empty,
  errorNotice,
  fieldInput,
  pill,
  spinner,
  sub,
} from "@/lib/ui";
import { TierBadge, TierBadgeSelect, TierGuideButton } from "./TierBadgeSelect";

export function TournamentDraftSetup({
  tournament,
}: {
  tournament: TournamentDetail;
}) {
  const showToast = useToast();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(tournament.sessionPlayers.map((p) => p.id)),
  );
  const [tierBusyId, setTierBusyId] = useState<string | null>(null);
  const [manualP1, setManualP1] = useState("");
  const [manualP2, setManualP2] = useState("");
  const [manualName, setManualName] = useState("");
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editP1, setEditP1] = useState("");
  const [editP2, setEditP2] = useState("");
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [error, setError] = useState("");

  const assignedIds = useMemo(() => {
    const s = new Set<string>();
    for (const team of tournament.teams) {
      s.add(team.player1.id);
      s.add(team.player2.id);
    }
    return s;
  }, [tournament.teams]);

  const unassignedPlayers = useMemo(
    () => tournament.sessionPlayers.filter((p) => !assignedIds.has(p.id)),
    [tournament.sessionPlayers, assignedIds],
  );

  const selectedArray = useMemo(
    () =>
      tournament.sessionPlayers
        .filter((p) => selectedIds.has(p.id))
        .map((p) => p.id),
    [tournament.sessionPlayers, selectedIds],
  );

  const remainingSelectedArray = useMemo(
    () =>
      tournament.sessionPlayers
        .filter((p) => selectedIds.has(p.id) && !assignedIds.has(p.id))
        .map((p) => p.id),
    [tournament.sessionPlayers, selectedIds, assignedIds],
  );

  const unratedSelectedCount = useMemo(
    () =>
      tournament.sessionPlayers.filter(
        (p) => selectedIds.has(p.id) && p.tier == null,
      ).length,
    [tournament.sessionPlayers, selectedIds],
  );

  async function handleTierChange(
    playerId: string,
    tier: PlayerTierLevel | null,
  ) {
    setTierBusyId(playerId);
    try {
      await setPlayerTier(tournament.session.id, playerId, tier);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not update tier");
    } finally {
      setTierBusyId(null);
    }
  }

  async function handleRandomize(replaceExisting: boolean) {
    setError("");
    const targetIds = replaceExisting ? selectedArray : remainingSelectedArray;
    if (
      (replaceExisting && targetIds.length < 4) ||
      (!replaceExisting && targetIds.length < 2) ||
      targetIds.length % 2 !== 0
    ) {
      setError(
        replaceExisting
          ? "Select an even number of players (at least 4) to randomize all."
          : "Select an even number of unassigned players (at least 2) to auto-pair remaining.",
      );
      return;
    }
    setBusyAction(replaceExisting ? "randomize-all" : "randomize-remaining");
    try {
      await randomizeTournamentTeams(tournament.id, {
        playerIds: targetIds,
        replaceExisting,
      });
      showToast(
        replaceExisting
          ? "Generated Balanced Pairs (High + Low)!"
          : "Auto-paired remaining players!",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not randomize teams");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleAddManual(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!manualP1 || !manualP2 || manualP1 === manualP2) {
      setError("Pick two different unassigned players.");
      return;
    }
    setBusyAction("add");
    try {
      await addTournamentTeam(tournament.id, {
        player1Id: manualP1,
        player2Id: manualP2,
        name: manualName.trim() || null,
      });
      setManualP1("");
      setManualP2("");
      setManualName("");
      showToast("Pair created");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add team");
    } finally {
      setBusyAction(null);
    }
  }

  function startEditTeam(teamId: string) {
    const t = tournament.teams.find((tm) => tm.id === teamId);
    if (!t) return;
    setEditingTeamId(teamId);
    setEditName(t.name ?? "");
    setEditP1(t.player1.id);
    setEditP2(t.player2.id);
    setError("");
  }

  async function handleSaveEditTeam(e: React.FormEvent) {
    e.preventDefault();
    if (!editingTeamId) return;
    setError("");
    if (editP1 === editP2) {
      setError("Pick two different players.");
      return;
    }
    setBusyAction(`edit:${editingTeamId}`);
    try {
      await updateTournamentTeam(tournament.id, editingTeamId, {
        name: editName.trim() || null,
        player1Id: editP1,
        player2Id: editP2,
      });
      setEditingTeamId(null);
      showToast("Pair updated");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update team");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleReorder(
    action: "shuffle" | "seedByTier" | "move",
    index?: number,
    dir?: -1 | 1,
  ) {
    setError("");
    setBusyAction(action);
    try {
      if (action === "move" && index != null && dir != null) {
        const target = index + dir;
        if (target < 0 || target >= tournament.teams.length) return;
        const ids = tournament.teams.map((t) => t.id);
        [ids[index], ids[target]] = [ids[target], ids[index]];
        await reorderTournamentTeams(tournament.id, {
          action: "reorder",
          teamIds: ids,
        });
      } else if (action === "shuffle" || action === "seedByTier") {
        await reorderTournamentTeams(tournament.id, { action });
        showToast(
          action === "shuffle" ? "Seeds shuffled" : "Teams seeded by tier",
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reorder teams");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleRemoveTeam(teamId: string) {
    setError("");
    setBusyAction(teamId);
    try {
      await removeTournamentTeam(tournament.id, teamId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove team");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleToggleThirdPlace() {
    setBusyAction("settings");
    try {
      await updateTournament(tournament.id, {
        hasThirdPlace: !tournament.hasThirdPlace,
      });
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not update setting");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleTogglePreferredCourt(courtNumber: number) {
    const next = tournament.preferredCourts.includes(courtNumber)
      ? tournament.preferredCourts.filter((c) => c !== courtNumber)
      : [...tournament.preferredCourts, courtNumber].sort((a, b) => a - b);
    setBusyAction("settings");
    try {
      await updateTournament(tournament.id, { preferredCourts: next });
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not update courts");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleStart() {
    setError("");
    setBusyAction("start");
    try {
      await startTournament(tournament.id);
      showToast("Bracket generated — tournament is live!");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not start tournament",
      );
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] items-start gap-5 max-[920px]:grid-cols-1">
      {/* Left: Session Players & Tiers */}
      <section className={card}>
        <div className={cardHead}>
          <div>
            <div className="flex items-center gap-2">
              <h2 className={cardTitle}>Session Players &amp; Tiers</h2>
              <TierGuideButton />
            </div>
            <p className={cx(sub, "mt-0.5")}>
              Admin-only tiers (1–5) persist across sessions and power Balanced
              Pairs draws.
            </p>
          </div>
          <span className={pill("default")}>
            {selectedArray.length} selected
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#eef4f9] px-[22px] py-2.5 text-xs">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="font-extrabold text-[#337fc4] hover:underline"
              onClick={() =>
                setSelectedIds(
                  new Set(tournament.sessionPlayers.map((p) => p.id)),
                )
              }
            >
              Select all
            </button>
            <button
              type="button"
              className="font-bold text-muted hover:text-[#204a74]"
              onClick={() => setSelectedIds(new Set())}
            >
              Clear
            </button>
          </div>
          {unratedSelectedCount > 0 && (
            <span className="font-bold text-[#b45309]">
              {unratedSelectedCount} unrated (defaults to T3)
            </span>
          )}
        </div>

        {tournament.sessionPlayers.length === 0 ? (
          <div className={empty}>
            No players in the linked session yet. Add players on the session
            page first.
          </div>
        ) : (
          <ul className="max-h-[460px] divide-y divide-[#f0f5f9] overflow-auto">
            {tournament.sessionPlayers.map((p) => {
              const checked = selectedIds.has(p.id);
              const isTeamed = assignedIds.has(p.id);
              return (
                <li
                  key={p.id}
                  className="flex items-center justify-between gap-2 px-[22px] py-2.5 max-[860px]:px-[15px]"
                >
                  <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        const next = new Set(selectedIds);
                        if (e.target.checked) next.add(p.id);
                        else next.delete(p.id);
                        setSelectedIds(next);
                      }}
                      className="size-4 flex-none accent-[#337fc4]"
                    />
                    <span className="truncate text-sm font-bold text-[#183e6b]">
                      {p.name}
                    </span>
                    {isTeamed && (
                      <span className="rounded-full bg-[#eaf5ff] px-2 py-0.5 text-[10px] font-extrabold text-[#337fc4]">
                        Teamed
                      </span>
                    )}
                  </label>
                  <TierBadgeSelect
                    tier={p.tier}
                    disabled={tierBusyId === p.id}
                    onChange={(next) => void handleTierChange(p.id, next)}
                  />
                </li>
              );
            })}
          </ul>
        )}

        <div className="grid gap-2 border-t border-[#eef4f9] bg-[#fafdff] px-[22px] py-3.5 max-[860px]:px-[15px]">
          {tournament.teams.length > 0 &&
            remainingSelectedArray.length >= 2 &&
            remainingSelectedArray.length % 2 === 0 && (
              <button
                type="button"
                className={cx(btn("primary"), "w-full")}
                disabled={busyAction !== null}
                onClick={() => void handleRandomize(false)}
              >
                {busyAction === "randomize-remaining" ? (
                  <>
                    <span className={cx(spinner, "mr-1.5")} />
                    Auto-pairing remaining…
                  </>
                ) : (
                  `🎲 Auto-Pair Remaining (${remainingSelectedArray.length} players → ${remainingSelectedArray.length / 2} teams)`
                )}
              </button>
            )}

          <button
            type="button"
            className={cx(
              btn(tournament.teams.length > 0 ? "light" : "primary"),
              "w-full",
            )}
            disabled={
              busyAction !== null ||
              selectedArray.length < 4 ||
              selectedArray.length % 2 !== 0
            }
            onClick={() => void handleRandomize(true)}
          >
            {busyAction === "randomize-all" ? (
              <>
                <span className={cx(spinner, "mr-1.5")} />
                Generating Balanced Pairs…
              </>
            ) : tournament.teams.length > 0 ? (
              `↻ Re-randomize All (${selectedArray.length} players)`
            ) : (
              `🎲 Randomize Balanced Pairs (${selectedArray.length} players → ${Math.floor(selectedArray.length / 2)} teams)`
            )}
          </button>
          <p className="text-center text-[11px] text-muted">
            Pairs strongest with weakest (High + Low) within shuffled tier
            groups.
          </p>
        </div>
      </section>

      {/* Right: Seeded Teams & Start Controls */}
      <section className={card}>
        <div className={cardHead}>
          <div>
            <h2 className={cardTitle}>
              Teams &amp; Seeding ({tournament.teams.length})
            </h2>
            <p className={cx(sub, "mt-0.5")}>
              Create fixed pairs manually, edit/swap players, or auto-pair
              remaining players.
            </p>
          </div>
          {tournament.teams.length >= 2 && (
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                className={btn("light", "sm")}
                disabled={busyAction !== null}
                onClick={() => void handleReorder("seedByTier")}
              >
                ⚡ Seed by Tier
              </button>
              <button
                type="button"
                className={btn("light", "sm")}
                disabled={busyAction !== null}
                onClick={() => void handleReorder("shuffle")}
              >
                🔀 Shuffle
              </button>
            </div>
          )}
        </div>

        {/* Manual pair creator */}
        {unassignedPlayers.length >= 2 && (
          <form
            onSubmit={handleAddManual}
            className="grid gap-2 border-b border-[#eef4f9] bg-[#fafdff] px-[22px] py-3 max-[860px]:px-[15px]"
          >
            <div className="grid grid-cols-2 gap-2 max-[520px]:grid-cols-1">
              <select
                className={fieldInput}
                value={manualP1}
                onChange={(e) => setManualP1(e.target.value)}
                aria-label="Player 1"
              >
                <option value="">Player 1…</option>
                {unassignedPlayers
                  .filter((p) => p.id !== manualP2)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.tier ? `(T${p.tier})` : ""}
                    </option>
                  ))}
              </select>
              <select
                className={fieldInput}
                value={manualP2}
                onChange={(e) => setManualP2(e.target.value)}
                aria-label="Player 2"
              >
                <option value="">Player 2…</option>
                {unassignedPlayers
                  .filter((p) => p.id !== manualP1)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.tier ? `(T${p.tier})` : ""}
                    </option>
                  ))}
              </select>
            </div>
            <div className="flex gap-2 max-[520px]:flex-col">
              <input
                type="text"
                className={cx(fieldInput, "flex-1")}
                placeholder="Optional team name (e.g. Smash Bros)"
                maxLength={50}
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
              />
              <button
                type="submit"
                className={btn("light", "sm")}
                disabled={busyAction !== null || !manualP1 || !manualP2}
              >
                {busyAction === "add" ? "Creating…" : "＋ Create Pair"}
              </button>
            </div>
          </form>
        )}

        {tournament.teams.length === 0 ? (
          <div className={empty}>
            No teams yet. Create pairs manually above or use Balanced Pairs on
            the left.
          </div>
        ) : (
          <ol className="divide-y divide-[#f0f5f9]">
            {tournament.teams.map((team, idx) => {
              const isEditing = editingTeamId === team.id;
              return (
                <li
                  key={team.id}
                  className="px-[22px] py-3 max-[860px]:px-[15px]"
                >
                  {isEditing ? (
                    <form onSubmit={handleSaveEditTeam} className="grid gap-2">
                      <div className="flex items-center gap-2">
                        <span className="grid size-7 flex-none place-items-center rounded-lg bg-[#eaf5ff] font-display text-xs font-extrabold text-[#204a74]">
                          #{team.seed}
                        </span>
                        <input
                          type="text"
                          className={cx(fieldInput, "flex-1")}
                          placeholder="Custom team name (optional)"
                          maxLength={50}
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2 max-[520px]:grid-cols-1">
                        <select
                          className={fieldInput}
                          value={editP1}
                          onChange={(e) => setEditP1(e.target.value)}
                          aria-label="Edit Player 1"
                        >
                          {tournament.sessionPlayers
                            .filter((p) => p.id !== editP2)
                            .map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} {p.tier ? `(T${p.tier})` : ""}
                                {assignedIds.has(p.id) &&
                                p.id !== team.player1.id &&
                                p.id !== team.player2.id
                                  ? " · Swap"
                                  : ""}
                              </option>
                            ))}
                        </select>
                        <select
                          className={fieldInput}
                          value={editP2}
                          onChange={(e) => setEditP2(e.target.value)}
                          aria-label="Edit Player 2"
                        >
                          {tournament.sessionPlayers
                            .filter((p) => p.id !== editP1)
                            .map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} {p.tier ? `(T${p.tier})` : ""}
                                {assignedIds.has(p.id) &&
                                p.id !== team.player1.id &&
                                p.id !== team.player2.id
                                  ? " · Swap"
                                  : ""}
                              </option>
                            ))}
                        </select>
                      </div>
                      <div className="flex justify-end gap-1.5">
                        <button
                          type="button"
                          className={btn("light", "sm")}
                          onClick={() => setEditingTeamId(null)}
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className={btn("primary", "sm")}
                          disabled={busyAction !== null}
                        >
                          {busyAction === `edit:${team.id}`
                            ? "Saving…"
                            : "Save pair"}
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="grid size-7 flex-none place-items-center rounded-lg bg-[#eaf5ff] font-display text-xs font-extrabold text-[#204a74]">
                          #{team.seed}
                        </span>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-extrabold text-[#183e6b]">
                            {team.displayName}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            <TierBadge tier={team.player1.tier} />
                            <TierBadge tier={team.player2.tier} />
                            {team.tierSum != null && (
                              <span className="text-[11px] font-extrabold text-[#337fc4]">
                                · Sum {team.tierSum}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          className={btn("light", "sm")}
                          disabled={busyAction !== null}
                          onClick={() => startEditTeam(team.id)}
                          aria-label="Edit team"
                          title="Rename or swap players"
                        >
                          ✎
                        </button>
                        <button
                          type="button"
                          className={btn("light", "sm")}
                          disabled={idx === 0 || busyAction !== null}
                          onClick={() => void handleReorder("move", idx, -1)}
                          aria-label="Move seed up"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          className={btn("light", "sm")}
                          disabled={
                            idx === tournament.teams.length - 1 ||
                            busyAction !== null
                          }
                          onClick={() => void handleReorder("move", idx, 1)}
                          aria-label="Move seed down"
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          className={btn("danger", "sm")}
                          disabled={busyAction !== null}
                          onClick={() => void handleRemoveTeam(team.id)}
                          aria-label="Remove team"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        )}

        {/* Tournament options & Start CTA */}
        <div className="grid gap-3 border-t border-[#eef4f9] bg-[#fafdff] px-[22px] py-4 max-[860px]:px-[15px]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="flex cursor-pointer items-center gap-2 text-xs font-bold text-[#204a74]">
              <input
                type="checkbox"
                checked={tournament.hasThirdPlace}
                disabled={busyAction !== null}
                onChange={() => void handleToggleThirdPlace()}
                className="size-4 accent-[#337fc4]"
              />
              <span>3rd-place playoff match</span>
            </label>

            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-bold text-muted">
                Preferred courts:
              </span>
              {Array.from(
                { length: tournament.session.courtCount },
                (_, i) => i + 1,
              ).map((c) => {
                const active = tournament.preferredCourts.includes(c);
                return (
                  <button
                    key={c}
                    type="button"
                    disabled={busyAction !== null}
                    onClick={() => void handleTogglePreferredCourt(c)}
                    className={cx(
                      "rounded-full border px-2.5 py-0.5 text-[11px] font-extrabold transition-colors",
                      active
                        ? "border-[#56a2e6] bg-[#56a2e6] text-white"
                        : "border-[#dceaf6] bg-white text-[#204a74]",
                    )}
                  >
                    C{c}
                  </button>
                );
              })}
            </div>
          </div>

          {error && <div className={errorNotice}>{error}</div>}

          <button
            type="button"
            className={cx(btn("primary"), "w-full")}
            disabled={busyAction !== null || tournament.teams.length < 2}
            onClick={() => void handleStart()}
          >
            {busyAction === "start" ? (
              <>
                <span className={cx(spinner, "mr-1.5")} />
                Generating Bracket…
              </>
            ) : (
              `🏆 Generate Bracket & Start (${tournament.teams.length} teams)`
            )}
          </button>
        </div>
      </section>
    </div>
  );
}
