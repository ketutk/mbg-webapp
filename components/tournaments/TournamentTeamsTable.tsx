"use client";

import type { TournamentDetail, TournamentTeamStatus } from "@/lib/types";
import { card, cardHead, cardTitle, cx, pill, sub } from "@/lib/ui";
import { TierBadge } from "./TierBadgeSelect";

const statusLabel: Record<TournamentTeamStatus, string> = {
  ACTIVE: "Active in Bracket",
  ELIMINATED: "Eliminated · Casual Ready",
  CHAMPION: "🏆 Champion",
};

const statusTone: Record<TournamentTeamStatus, "default" | "ok" | "warn"> = {
  ACTIVE: "warn",
  ELIMINATED: "default",
  CHAMPION: "ok",
};

export function TournamentTeamsTable({
  tournament,
  isOrganiser,
}: {
  tournament: TournamentDetail;
  isOrganiser: boolean;
}) {
  return (
    <section className={cx(card, "mt-5")}>
      <div className={cardHead}>
        <div>
          <h2 className={cardTitle}>Teams &amp; Casual Play Status</h2>
          <p className={cx(sub, "mt-0.5")}>
            Total games include both tournament matches and casual session
            matches.
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-[#eef4f9] bg-[#fafdff] text-[10px] font-extrabold text-[#5d7f9d] uppercase">
              <th className="px-4 py-2.5">Seed</th>
              <th className="px-4 py-2.5">Team</th>
              {isOrganiser && <th className="px-4 py-2.5">Tier</th>}
              <th className="px-4 py-2.5">Status</th>
              <th className="px-4 py-2.5 text-right">Session Games</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f0f5f9]">
            {tournament.teams.map((team) => (
              <tr key={team.id} className="hover:bg-[#f9fcff]">
                <td className="px-4 py-3 font-display font-extrabold text-[#204a74]">
                  #{team.seed}
                </td>
                <td className="px-4 py-3 font-bold text-[#183e6b]">
                  {team.displayName}
                </td>
                {isOrganiser && (
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-1">
                      <TierBadge tier={team.player1.tier} />
                      <TierBadge tier={team.player2.tier} />
                      {team.tierSum != null && (
                        <span className="ml-1 font-extrabold text-[#337fc4]">
                          ({team.tierSum})
                        </span>
                      )}
                    </div>
                  </td>
                )}
                <td className="px-4 py-3">
                  <span className={pill(statusTone[team.status])}>
                    {statusLabel[team.status]}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-semibold text-[#204a74]">
                  {team.player1.name.split(" ")[0]}:{" "}
                  {team.player1.sessionGamesCount} ·{" "}
                  {team.player2.name.split(" ")[0]}:{" "}
                  {team.player2.sessionGamesCount}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
