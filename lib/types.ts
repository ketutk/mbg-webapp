export interface Player {
  id: string;
  name: string;
}

export type Team = [string, string];

export interface Game {
  id: string;
  /** Players who played (checked) in this game. */
  playerIds: string[];
  /** Only set when the game was started from a recommendation. Used to avoid repeating partners. */
  teams?: [Team, Team];
  /** Epoch ms when the game was added. Optional for games saved before this existed. */
  createdAt?: number;
}

export interface Session {
  id: string;
  name: string;
  /** yyyy-mm-dd */
  date: string;
  players: Player[];
  games: Game[];
}

export interface DB {
  sessions: Session[];
  currentId: string | null;
}
