export type Role = "SUPERADMIN" | "ADMIN";
export type SessionStatus = "OPEN" | "CLOSED";
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
  paid: boolean;
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
  /** Recorded final score for Team A when finished. */
  scoreA?: number;
  /** Recorded final score for Team B when finished. */
  scoreB?: number;
  /** Locked columns reject manual tick edits until unlocked. */
  locked: boolean;
}

export interface Session {
  id: string;
  name: string;
  /** yyyy-mm-dd */
  date: string;
  courtCount: number;
  status: SessionStatus;
  players: Player[];
  /** Ordered by creation sequence (`seq`). */
  games: Game[];
}

export interface SessionListItem {
  id: string;
  name: string;
  /** yyyy-mm-dd */
  date: string;
  courtCount: number;
  status: SessionStatus;
  playerCount: number;
  gameCount: number;
}

export interface SessionsFilterParams {
  from?: string;
  to?: string;
  status?: "ALL" | SessionStatus;
  q?: string;
  page?: number;
  pageSize?: number;
}

export interface SessionsPage {
  sessions: SessionListItem[];
  totalSessions: number;
  openCount: number;
  closedCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PublicGame {
  id: string;
  /** QUEUED = the "Queued" flag (A6). */
  status: GameStatus;
  courtNumber?: number;
  queueOrder?: number;
  createdAt?: number;
  startedAt?: number;
  finishedAt?: number;
  scoreA?: number;
  scoreB?: number;
  playerIds: string[];
  teams?: [Team, Team];
}

export interface SessionSummary {
  id: string;
  name: string;
  /** yyyy-mm-dd */
  date: string;
  courtCount: number;
  status: SessionStatus;
  /** `count` includes queued games; `queued` is how many of those are still QUEUED. */
  players: {
    id: string;
    name: string;
    count: number;
    queued: number;
    wins: number;
    losses: number;
  }[];
  courts: PublicGame[];
  queue: PublicGame[];
  /** Ordered by creation sequence (`seq`); omits internal lock metadata. */
  games: PublicGame[];
}

export interface TreasuryCategory {
  id: string;
  name: string;
  /** Null means available for both INCOME and EXPENSE (e.g. "Others"). */
  type: EntryType | null;
  isSystem: boolean;
}

export interface TreasuryCategoryBreakdown {
  categoryId: string | null;
  categoryName: string;
  type: EntryType;
  total: number;
  count: number;
}

export interface TreasuryEntry {
  id: string;
  type: EntryType;
  amount: number;
  purpose: string;
  /** yyyy-mm-dd */
  date: string;
  categoryId: string | null;
  categoryName: string;
  createdByName: string;
}

export interface TreasuryMonthlyBucket {
  /** yyyy-mm */
  month: string;
  income: number;
  expense: number;
}

export interface TreasuryWeeklyBucket {
  /** Monday start date (yyyy-mm-dd) */
  weekStart: string;
  /** Sunday end date (yyyy-mm-dd) */
  weekEnd: string;
  income: number;
  expense: number;
}

export interface TreasuryFilterParams {
  from?: string;
  to?: string;
  type?: "ALL" | EntryType;
  categoryId?: string;
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
  /** Available treasury categories. */
  categories: TreasuryCategory[];
  /** Filtered period totals grouped by category and entry type. */
  categoryBreakdown: TreasuryCategoryBreakdown[];
  /** Monthly breakdown for the dashboard chart (oldest to newest, up to 12 months). */
  monthly: TreasuryMonthlyBucket[];
  /** Weekly breakdown for the dashboard chart (oldest to newest, up to 16 weeks). */
  weekly: TreasuryWeeklyBucket[];
  /** Paginated entries matching the current filter. */
  entries: TreasuryEntry[];
  /** Pagination metadata. */
  totalEntries: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ClubSettings {
  schedule: string;
  venue: string;
  skillLevel: string;
  whatsappUrl: string | null;
  ayoUrl: string | null;
}
