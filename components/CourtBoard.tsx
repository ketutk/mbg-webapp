"use client";

import { courtsOf, queueOf } from "@/lib/match";
import type { Game, Session } from "@/lib/types";
import { CourtCard } from "./CourtCard";
import { cardTitle, pill, sub } from "@/lib/ui";

export function CourtBoard({
  session,
  promotingCourt,
  finishingGameId,
  onAssignCourt,
  onPromoteNext,
  onEditGame,
  onFinishGame,
}: {
  session: Session;
  promotingCourt: number | null;
  finishingGameId: string | null;
  onAssignCourt: (courtNumber: number) => void;
  onPromoteNext: (courtNumber: number) => void;
  onEditGame: (game: Game) => void;
  onFinishGame: (game: Game) => void;
}) {
  const courts = courtsOf(session);
  const queue = queueOf(session);
  const activeCount = courts.filter((c) => c.game).length;
  const nameOf = new Map(session.players.map((p) => [p.id, p.name]));

  return (
    <section className="mb-5" aria-labelledby="courts-title">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className={cardTitle} id="courts-title">
            Courts
          </h2>
          <div className={sub}>
            Assign matches directly to an open court or promote the next match from the queue.
          </div>
        </div>
        <span className={pill(activeCount > 0 ? "ok" : "default")}>
          {activeCount}/{courts.length} occupied
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3.5 max-[860px]:grid-cols-1">
        {courts.map(({ courtNumber, game }) => (
          <CourtCard
            key={courtNumber}
            courtNumber={courtNumber}
            game={game}
            nameOf={nameOf}
            hasQueue={queue.length > 0}
            promoting={promotingCourt === courtNumber}
            finishing={Boolean(game && finishingGameId === game.id)}
            onAssign={onAssignCourt}
            onPromote={onPromoteNext}
            onEdit={onEditGame}
            onFinish={onFinishGame}
          />
        ))}
      </div>
    </section>
  );
}
