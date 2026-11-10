export type Role = "SUPERADMIN" | "ADMIN";
export type GameStatus = "QUEUED" | "ON_COURT" | "DONE";
export type EntryType = "INCOME" | "EXPENSE";

export interface AuthUser {
  id: string;
  username: string;
  role: Role;
}

export interface AdminUser {
  id: string;
  username: string;
  role: Role;
  createdAt: string;
  deletedAt: string | null;
}

export interface Player {
  id: string;
  name: string;
}

export type Team = [string, string];

export interface Game {
  id: string;
  /** Players who played (checked) in this game. */
  playerIds: string[];
  /** Only set when the game has a reliable 2v2 team split; cleared on manual tick edits. */
  teams?: [Team, Team];
  /** Epoch ms when the game was added. */
  createdAt?: number;
  /** Epoch ms when the game went onto a court. */
  startedAt?: number;
  /** Epoch ms when the game finished. */
  finishedAt?: number;
  status: GameStatus;
  /** Set only while status is ON_COURT. */
  courtNumber?: number;
  /** Set only while status is QUEUED. */
  queueOrder?: number;
  /** Locked columns reject manual tick edits until unlocked. */
  locked: boolean;
}

export interface Session {
  id: string;
  name: string;
  /** yyyy-mm-dd */
  date: string;
  courtCount: number;
  players: Player[];
  /** Ordered by creation sequence (`seq`). */
  games: Game[];
}

export interface SessionListItem {
  id: string;
  name: string;
  /** yyyy-mm-dd */
  date: string;
}

export interface PublicGame {
  id: string;
  /** QUEUED = the "Queued" flag (A6). */
  status: "ON_COURT" | "QUEUED";
  courtNumber?: number;
  queueOrder?: number;
  playerIds: string[];
  teams?: [Team, Team];
}

export interface SessionSummary extends SessionListItem {
  courtCount: number;
  /** `count` includes queued games; `queued` is how many of those are still QUEUED. */
  players: { id: string; name: string; count: number; queued: number }[];
  courts: PublicGame[];
  queue: PublicGame[];
}

export interface TreasuryEntry {
  id: string;
  type: EntryType;
  amount: number;
  purpose: string;
  /** yyyy-mm-dd */
  date: string;
  createdByName: string;
}

export interface TreasuryMonthlyBucket {
  /** yyyy-mm */
  month: string;
  income: number;
  expense: number;
}

export interface TreasuryFilterParams {
  from?: string;
  to?: string;
  type?: "ALL" | EntryType;
  q?: string;
  page?: number;
  pageSize?: number;
}

export interface TreasurySummary {
  /** All-time club balance (income - expense). */
  balance: number;
  /** All-time club income. */
  income: number;
  /** All-time club expense. */
  expense: number;
  /** Filtered period income. */
  periodIncome: number;
  /** Filtered period expense. */
  periodExpense: number;
  /** Filtered period net (periodIncome - periodExpense). */
  periodNet: number;
  /** Filtered income transaction count. */
  periodIncomeCount: number;
  /** Filtered expense transaction count. */
  periodExpenseCount: number;
  /** Monthly breakdown for the dashboard chart (oldest to newest, up to 6 months). */
  monthly: TreasuryMonthlyBucket[];
  /** Paginated entries matching the current filter. */
  entries: TreasuryEntry[];
  /** Pagination metadata. */
  totalEntries: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
