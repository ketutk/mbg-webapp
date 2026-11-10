# MBG v2 — SRD, Coding Rules & Implementation Plan

Project: **MBG · Minggu Badminton Guys — Fair Match Planner**
Baseline: Next.js 16.4.3 (App Router, `cacheComponents`, `partialPrefetching`), React 19.3, Tailwind v4, localStorage store.
Target: Admin/Superadmin authentication, courts + queue, locked checklist, treasury, backed by PostgreSQL via Prisma, validated with Zod.

This document has three parts:

1. **Part A — Software Requirements Document (SRD)**
2. **Part B — Coding Rules** (derived from the existing code, plus rules for the new layers)
3. **Part C — Implementation Plan**

---

## 0. Decisions (confirmed by review)

Your original request had a few places where two readings were possible. I proposed a default for each; the review comments confirmed most of them and changed A1, A2, A6 and A9. The table below is the **final, agreed** state and everything in this document follows it.

| # | Topic | What you said | Default used in this document |
|---|-------|---------------|-------------------------------|
| A1 | Who can manage sessions | Item 2: admin has full access on session and match. Review: *"admin can't do anything with session, only superadmin"*. | **Session management is Superadmin-only**: create, edit (name, date, court count), edit roster, delete. **Admin** can open any session and fully manage its **matches** (assign to court/queue, edit, finish, reorder, delete, tick, lock/unlock). |
| A2 | What a visitor sees | "Visitor can only see how much they play." Review: default OK, **but visitors can also see the queue and the players on courts.** | Visitor sees the session list and, per session: **games played per player**, **who is on each court** (Team A vs Team B), and **the queue** in order. No checklist grid, history, recommendation, lock state or treasury. The public API returns only that data. |
| A3 | Treasury "cash left" | Admin can add a *spent*; also wants to see cash left. | A balance needs money coming in, so entries have a **type: `INCOME` or `EXPENSE`**. "Add a spent" = an `EXPENSE` entry. `INCOME` is the minimal addition needed to compute a balance (contributions, opening balance). |
| A4 | "Move it after admin assigns…" | Recommendation + checklist stay; the match moves there after assignment. | Reading: **assigning a match (court or queue) is what creates a checklist column** with its 4 players ticked. The recommendation card becomes a *shortcut feeding the two assignment actions* instead of "Start match". Page order becomes Courts → Queue → Next match → Games played. |
| A5 | Blank "＋ Add game" | "Just 2 ways of assigning a match." | The blank **Add game button is removed**. Columns only come from court assignment or queue. The checklist remains editable (tick/untick) to correct mistakes. |
| A6 | Queued matches and fairness | Default OK, **but flag queued matches so users can tell.** | A queued match **counts as played immediately** (its 4 players are ticked when queued), but it is **always flagged as "Queued"** everywhere a count or column is shown (checklist column header, per-player count hint, visitor list, waiting list), and the API exposes a separate `queued` number per player. The flag disappears when the match is moved onto a court. |
| A7 | Treasury delete | Superadmin can edit/delete treasury data. | **Soft delete** (`deletedAt`) for treasury entries, because it is financial data. Deleted entries are excluded from the balance. Hard delete can be swapped in with one line. |
| A8 | Currency | Confirmed: **IDR**. | **IDR**, whole rupiah stored as `Int` (no decimals). |
| A9 | Tooling | Review: **bcrypt for hashing, Prisma 6.** | **Prisma 6 (pin `~6.19`)** with the classic `prisma-client-js` generator, `datasource url = env("DATABASE_URL")`, no driver adapter, `.env` read automatically by the CLI. **`bcrypt`** (+ `@types/bcrypt`) for password hashing, cost 12. Only extra dev tool: `tsx` to run the TypeScript seed. No auth library, no data-fetching library. |

---

# PART A — SOFTWARE REQUIREMENTS DOCUMENT

## A.1 Purpose & scope

MBG v1 is a single-device planner: sessions, a roster, a "games played" checklist, and a fairness-based next-match recommendation, all in `localStorage`.

MBG v2 turns it into a shared, multi-user system:

- A **public read-only view** so players can check how many games they have played.
- **Superadmin** accounts who manage sessions, admins and the treasury, and **Admin** accounts who run matches (courts, queue, checklist) and add treasury entries.
- Persistent storage in **PostgreSQL**.

Out of scope for v2: player accounts, payments/online money, notifications, multi-club tenancy, i18n (UI stays English), file uploads, real-time websockets (polling is used).

## A.2 Users & roles

| Role | Who | How created |
|------|-----|-------------|
| **Visitor** | Anyone, not logged in | — |
| **Admin** | Trusted organiser | Created by a Superadmin |
| **Superadmin** | Owner | Created by seed script only (never via the UI/API) |

### Permission matrix

| Capability | Visitor | Admin | Superadmin |
|------------|:------:|:-----:|:----------:|
| See session list; per-player games-played counts; courts and queue | ✅ | ✅ | ✅ |
| See checklist grid, history, recommendation | ❌ | ✅ | ✅ |
| **Create / edit session** (name, date, court count, roster) | ❌ | ❌ | ✅ |
| **Delete session** | ❌ | ❌ | ✅ |
| Assign match to court / queue; edit; finish; reorder queue | ❌ | ✅ | ✅ |
| Tick/untick checklist; lock/unlock a column | ❌ | ✅ | ✅ |
| Delete a match; clear all matches of a session | ❌ | ✅ | ✅ |
| View treasury (balance + entries) | ❌ | ✅ | ✅ |
| Add treasury entry (spent / income) | ❌ | ✅ | ✅ |
| **Edit / delete treasury entry** | ❌ | ❌ | ✅ |
| **Add admin / soft-delete admin / reset admin password** | ❌ | ❌ | ✅ |
| Log in / log out / change own password | — | ✅ | ✅ |

Authorization is **always enforced on the server**. Hiding buttons in the UI is a convenience only.

## A.3 Functional requirements

### A.3.1 Authentication & accounts (`FR-AUTH`)

| ID | Requirement |
|----|-------------|
| FR-AUTH-1 | Admins log in with **username + password**. |
| FR-AUTH-2 | On success the server sets an **opaque random token** in a cookie that is `HttpOnly`, `SameSite=Strict`, `Path=/`, `Secure` in production, `Max-Age` 7 days. The token is never readable by JavaScript and never returned in a response body. |
| FR-AUTH-3 | The server stores only the **SHA-256 hash** of the token (`AuthToken` table). Logout deletes the row and clears the cookie. |
| FR-AUTH-4 | The client learns who is logged in through `GET /api/auth/me` (`{ user: { id, username, role } \| null }`). The client never decodes the token. |
| FR-AUTH-5 | Passwords are hashed with **bcrypt** (cost 12). Plain passwords are never stored or logged. Because bcrypt only uses the first **72 bytes**, passwords are limited to 72 bytes (validated by Zod on create, reset and login). |
| FR-AUTH-6 | Wrong credentials return one generic message ("Invalid username or password") for unknown user, wrong password, and deleted user. |
| FR-AUTH-7 | **Brute-force protection:** after 5 consecutive failures an account is locked for 15 minutes (`failedAttempts`, `lockedUntil`); a successful login resets the counter. |
| FR-AUTH-8 | Soft-deleting an admin **immediately revokes all their tokens** and blocks login. |
| FR-AUTH-9 | A user can change their own password (requires current password); this revokes their other tokens. |
| FR-AUTH-10 | Superadmin accounts are created only by the seed script from env vars. The API can only create `ADMIN`. |
| FR-AUTH-11 | Every state-changing request (`POST/PUT/PATCH/DELETE`) must pass a CSRF guard: `Origin` host must equal `Host`, and `Content-Type` must be `application/json` (when a body exists). |

### A.3.2 Admin management — Superadmin only (`FR-ADM`)

| ID | Requirement |
|----|-------------|
| FR-ADM-1 | List admins (active and soft-deleted, with a visible "Deleted" state). |
| FR-ADM-2 | Create an admin: username (3–32, `[a-z0-9_.-]`, stored lowercase, unique) + initial password (min 10 chars). |
| FR-ADM-3 | **Soft delete** an admin → sets `deletedAt`. The username stays reserved. A superadmin can never delete themselves or another superadmin. |
| FR-ADM-4 | Reset an admin's password (revokes that admin's tokens). |
| FR-ADM-5 | Data created by a soft-deleted admin (`createdById`) is untouched. |

### A.3.3 Sessions (`FR-SES`)

| ID | Requirement |
|----|-------------|
| FR-SES-1 | **Superadmin only.** Create session: name (1–60, defaults to `Game day <date>` as today), date (`yyyy-mm-dd`, no time), **court count** (1–8, default 1), initial roster (one name per line, same `parseNames` rules as today). |
| FR-SES-2 | **Superadmin only.** Edit session name, date, court count. **Court count cannot be lowered below the highest occupied court number** (409 `COURT_OCCUPIED`). |
| FR-SES-3 | **Superadmin only.** Edit roster keeps today's behaviour: same name (case-insensitive) keeps its id and games; removed players lose their ticks and are removed from any match. Affected columns are unlocked. Max 60 players, names 1–40 chars, unique per session. |
| FR-SES-4 | Delete session — **Superadmin only**; cascades to players, matches, ticks. |
| FR-SES-6 | Admins never see session create/edit/delete/roster controls; the API returns 403. |
| FR-SES-5 | The session list is public (id, name, date only). The selected session is remembered per device (as today). |

### A.3.4 Courts, queue & assignment (`FR-MAT`)

A "match" is the existing `Game`. Terminology in UI: **match**; in code/DB: `Game`.

| ID | Requirement |
|----|-------------|
| FR-MAT-1 | A session has `courtCount` courts, numbered 1…N. A court is **empty** or holds exactly one match with status `ON_COURT`. |
| FR-MAT-2 | There are **exactly two ways** to create a match: **(a) assign directly to an empty court**, **(b) add to the queue** ("set the next match"). |
| FR-MAT-3 | An assignment requires **4 distinct players** from the roster split into **Team A (2) and Team B (2)**. |
| FR-MAT-4 | The assignment dialog can be **prefilled from the recommendation** (teams included) and then adjusted, or filled manually. |
| FR-MAT-5 | A player cannot be placed on a court while already `ON_COURT` in another court (409 `PLAYER_BUSY`). Adding a busy player to the **queue** is allowed (they are "next") but the dialog shows a "currently on court N" hint. |
| FR-MAT-6 | The queue is ordered. Admin can **reorder** (move up/down), **edit players**, or **remove** a queued match. |
| FR-MAT-7 | **Finish match**: an `ON_COURT` match becomes `DONE`, its court becomes empty. An empty court offers **Assign players** and, if the queue is not empty, **Play next in queue** (moves the first queued match onto that court). No auto-promotion. |
| FR-MAT-8 | Admin can **edit players/teams** of a queued or on-court match (e.g. substitution after injury). |
| FR-MAT-9 | Admin can delete any match (any status) and clear all matches of a session. |
| FR-MAT-10 | Every match belongs to the checklist, ordered by creation (`seq`). A player's **games played** = number of the session's matches they are ticked in, **regardless of status** (A6). |
| FR-MAT-11 | **Queued flag (A6):** a match in `QUEUED` status is shown with a **"Queued"** pill wherever it appears in the checklist/history, each player's count shows a small `+N queued` hint when `N > 0`, and the public summary exposes `queued` per player. |

### A.3.5 Recommendation (kept) (`FR-REC`)

| ID | Requirement |
|----|-------------|
| FR-REC-1 | Keep the current algorithm in `lib/match.ts` (fewest games → longest rest → seeded tie-break → partner-repeat avoidance → Shuffle). It stays **pure and client-side**, computed from the fetched session. |
| FR-REC-2 | **New:** players currently `ON_COURT` are excluded from the recommended four **when at least 4 other players remain**; otherwise fall back to the full ranking. Implemented as an optional `busy` set argument. |
| FR-REC-3 | The Next match card replaces "Start match · tick 4 players" with two actions: **Assign to court** (opens the dialog on the court picker, prefilled) and **Add to queue** (prefilled). Shuffle and the waiting list stay. |
| FR-REC-4 | Admin only. Visitors never receive the data needed to compute it. |

### A.3.6 Checklist table & column locking (`FR-CHK`)

| ID | Requirement |
|----|-------------|
| FR-CHK-1 | The "Games played" table stays: rows = players, columns = matches (G1…Gn), checkbox per cell, count per player, header shows `ticked/total`. |
| FR-CHK-2 | Each column has a persisted **`locked`** flag. A column is **locked automatically** when it is created by assignment (4 ticks) and **whenever a tick/untick leaves it with exactly 4 ticks**. |
| FR-CHK-3 | A locked column's checkboxes are **disabled** and the header shows a lock icon button. Clicking it **unlocks** (a lock button also exists to re-lock any column manually). |
| FR-CHK-4 | The **server rejects** tick changes on a locked column (409 `GAME_LOCKED`); the UI state is only a convenience. |
| FR-CHK-5 | Tick requests are **idempotent** (`PUT … { checked: true \| false }`, not "toggle") so double-taps and two admins cannot invert each other. |
| FR-CHK-6 | Any manual tick change sets every player's `team` in that match to null (team split no longer reliable) — same as v1. |
| FR-CHK-7 | Editing a match through the assignment dialog is an explicit action and is allowed on a locked column; the column re-locks if it ends with 4 ticks. |
| FR-CHK-8 | Remove-column "×" stays (admin). Confirm with `window.confirm` as in History today. |
| FR-CHK-9 | Columns of `QUEUED` matches show a **"Queued"** pill in the header and tinted cells; the player's count badge shows `+N queued` when relevant. Once the match goes on court the flag is removed. |

### A.3.7 Treasury (`FR-TRS`)

Treasury is **club-wide** (not per session). Admin and superadmin only.

| ID | Requirement |
|----|-------------|
| FR-TRS-1 | Screen shows **cash left** (balance = Σ income − Σ expense of non-deleted entries), plus total income and total expense. |
| FR-TRS-2 | Admin/superadmin can **add an entry**: **type** (`EXPENSE` default / `INCOME`), **amount** (whole IDR, 1 … 1,000,000,000), **purpose/information** (1–200 chars), **date** (`yyyy-mm-dd`, no time; defaults to today). |
| FR-TRS-3 | List entries newest date first (ties: newest created first), with type, date, purpose, amount, and who added it. |
| FR-TRS-4 | **Superadmin only:** edit any field of an entry; soft-delete an entry. The UI hides these controls for admins; the API returns 403. |
| FR-TRS-5 | Amounts display with `Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 })`. |
| FR-TRS-6 | Balance is always computed on the server (aggregate query), never trusted from the client. |

### A.3.8 Visitor view (`FR-VIS`)

| ID | Requirement |
|----|-------------|
| FR-VIS-1 | Without login, the app shows the session picker and three read-only blocks: **Courts** (each court: empty, or Team A vs Team B), **Queue** (ordered next matches, flagged "Queued"), and **Games played** (avatar, name, count, `+N queued` hint, sorted by count then name). |
| FR-VIS-2 | Data comes from `GET /api/sessions/:id/summary` only (shape in A.6). It contains player names and ids, counts, and court/queue assignments — never `locked`, never history of finished matches, never roster internals beyond that. |
| FR-VIS-3 | The header offers an unobtrusive **Admin login** button. |

### A.3.9 Rendering & SEO (`FR-RND`)

| ID | Requirement |
|----|-------------|
| FR-RND-1 | All UI is **client-rendered**: `page.tsx` files are thin server components that export metadata and render one `"use client"` root component, exactly as `app/page.tsx` → `MatchApp` does today. |
| FR-RND-2 | Server code is limited to Route Handlers under `app/api/**` and `lib/server/**`. No Server Actions, no server-rendered data. |
| FR-RND-3 | SEO stays on `/`: metadata, JSON-LD, `robots.ts`, `sitemap.ts`, `manifest.ts` unchanged. `/treasury` and `/admins` are `noindex`; `robots.ts` disallows `/api`, `/treasury`, `/admins`. |
| FR-RND-4 | The loading state keeps the existing shimmer skeleton (`aria-busy`). |

## A.4 Non-functional requirements

| ID | Area | Requirement |
|----|------|-------------|
| NFR-1 | Security | All inputs validated with Zod on the server; the same schemas validate forms on the client. Prisma parameterised queries only (no raw SQL with string interpolation). |
| NFR-2 | Security | Cookie flags per FR-AUTH-2; `Cache-Control: no-store` on every `/api` response; generic auth errors; no stack traces to clients. |
| NFR-3 | Security | Public endpoints return the minimum data (A2). Role is re-checked on **every** request from the DB (token → user, `deletedAt` null). |
| NFR-4 | Freshness | Client polls the active session every **5 s** (admin) / **10 s** (visitor) while the tab is visible, and refetches on window focus and after every mutation. |
| NFR-5 | Responsiveness | Checkbox ticks and court actions use **optimistic updates** with rollback + toast on failure. |
| NFR-6 | Integrity | Multi-row changes (assignment, finish, promote, reorder, roster edit) run in **one Prisma transaction**. Unique constraints back the rules (`(sessionId, courtNumber)`, `(sessionId, seq)`). |
| NFR-7 | Mobile | Same breakpoints as today (`max-[860px]`); tap targets ≥ 20 px for checkboxes; designed for phones at the court. |
| NFR-8 | Accessibility | Keep existing patterns: `aria-label` on icon buttons, `sr-only` labels, `role="status"` toast, `aria-busy` skeletons, modal Esc-to-close. |
| NFR-9 | Quality | `npm run lint` and `tsc --noEmit` clean; no `any`. |
| NFR-10 | Deployability | Config only through env vars (`DATABASE_URL`, `SUPERADMIN_USERNAME`, `SUPERADMIN_PASSWORD`). Works on Node runtime (required by `cacheComponents` and Prisma). |

## A.5 Data model (Prisma, PostgreSQL)

Naming mirrors the existing TypeScript types (`Session`, `Player`, `Game`). The login-token table is called `AuthToken` to avoid confusion with a badminton `Session`.

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role       { SUPERADMIN ADMIN }
enum GameStatus { QUEUED ON_COURT DONE }
enum TeamSide   { A B }
enum EntryType  { INCOME EXPENSE }

model User {
  id             String      @id @default(cuid())
  username       String      @unique            // lowercase
  passwordHash   String
  role           Role        @default(ADMIN)
  failedAttempts Int         @default(0)
  lockedUntil    DateTime?
  deletedAt      DateTime?                      // soft delete
  createdById    String?                        // audit only, intentionally not an FK
  createdAt      DateTime    @default(now())
  updatedAt      DateTime    @updatedAt
  tokens         AuthToken[]
}

model AuthToken {
  id        String   @id @default(cuid())
  userId    String
  tokenHash String   @unique                    // sha-256 hex of the cookie value
  expiresAt DateTime
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([userId])
}

model Session {
  id          String   @id @default(cuid())
  name        String
  date        DateTime @db.Date
  courtCount  Int      @default(1)
  createdById String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  players     Player[]
  games       Game[]
  @@index([date])
}

model Player {
  id        String       @id @default(cuid())
  sessionId String
  name      String
  nameKey   String                               // lowercased name, for uniqueness
  position  Int                                  // roster order
  session   Session      @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  games     GamePlayer[]
  @@unique([sessionId, nameKey])
}

model Game {
  id          String       @id @default(cuid())
  sessionId   String
  seq         Int                                // creation order within the session
  status      GameStatus
  courtNumber Int?                               // set only while ON_COURT
  queueOrder  Int?                               // set only while QUEUED
  locked      Boolean      @default(false)
  createdAt   DateTime     @default(now())
  startedAt   DateTime?
  finishedAt  DateTime?
  session     Session      @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  players     GamePlayer[]
  @@unique([sessionId, seq])
  @@unique([sessionId, courtNumber])             // NULLs are distinct in PostgreSQL → one match per court
  @@index([sessionId, status])
}

model GamePlayer {                               // a row = "ticked" in the checklist
  gameId   String
  playerId String
  team     TeamSide?                             // null once ticks are edited by hand
  game     Game   @relation(fields: [gameId], references: [id], onDelete: Cascade)
  player   Player @relation(fields: [playerId], references: [id], onDelete: Cascade)
  @@id([gameId, playerId])
}

model TreasuryEntry {
  id          String    @id @default(cuid())
  type        EntryType @default(EXPENSE)
  amount      Int                                // whole IDR, > 0
  purpose     String
  date        DateTime  @db.Date
  createdById String
  updatedById String?
  deletedById String?
  deletedAt   DateTime?                          // soft delete
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  @@index([date])
}
```

> Prisma **6** is used (classic generator, `@prisma/client`, no driver adapter, the CLI reads `.env` itself). Pin `prisma` and `@prisma/client` to the same `~6.19` version. Prisma 7 is intentionally not used.

### Derived rules the schema relies on

- **Played count** = `COUNT(GamePlayer)` per player within the session.
- **Teams** of a game = `GamePlayer.team` grouped; if any row has `team = null`, the game has no team info (same meaning as `teams?: undefined` in v1).
- **Court occupancy** = a `Game` with `status = ON_COURT` and `courtNumber = n`. On finish, `courtNumber` is set to `null` (that is what keeps the unique constraint simple).
- **Balance** = `SUM(amount) WHERE type=INCOME AND deletedAt IS NULL` − same for `EXPENSE`.

## A.6 Shared TypeScript contracts

`lib/types.ts` keeps today's shapes and **adds** fields, so `lib/match.ts` and most components keep compiling.

```ts
export type Role = "SUPERADMIN" | "ADMIN";
export type GameStatus = "QUEUED" | "ON_COURT" | "DONE";

export interface AuthUser { id: string; username: string; role: Role }
export interface AdminUser { id: string; username: string; role: Role; createdAt: string; deletedAt: string | null }

export interface Game {
  id: string;
  playerIds: string[];                 // ticked players (unchanged)
  teams?: [Team, Team];                // unchanged
  createdAt?: number;                  // epoch ms (unchanged)
  status: GameStatus;                  // new
  courtNumber?: number;                // new — only when ON_COURT
  queueOrder?: number;                 // new — only when QUEUED
  locked: boolean;                     // new
}

export interface Session {             // admin payload
  id: string; name: string; date: string;   // yyyy-mm-dd
  courtCount: number;                  // new
  players: Player[]; games: Game[];    // games ordered by seq
}

export interface SessionListItem { id: string; name: string; date: string }
export interface PublicGame {                                  // court or queue entry, public
  id: string;
  status: "ON_COURT" | "QUEUED";                               // QUEUED = the "Queued" flag (A6)
  courtNumber?: number;
  queueOrder?: number;
  playerIds: string[];
  teams?: [Team, Team];
}
export interface SessionSummary extends SessionListItem {      // public payload
  courtCount: number;
  players: { id: string; name: string; count: number; queued: number }[]; // count includes queued
  courts: PublicGame[];                                        // status ON_COURT
  queue: PublicGame[];                                         // status QUEUED, ordered
}

export interface TreasuryEntry {
  id: string; type: "INCOME" | "EXPENSE"; amount: number;
  purpose: string; date: string; createdByName: string;
}
export interface TreasurySummary { balance: number; income: number; expense: number; entries: TreasuryEntry[] }
```

`lib/schemas.ts` (Zod, **imported by both client and server**, no server-only imports):

```ts
export const usernameSchema = z.string().trim().toLowerCase().regex(/^[a-z0-9_.-]{3,32}$/);
export const passwordSchema = z.string().min(10)
  .refine((v) => new TextEncoder().encode(v).length <= 72, "Max 72 bytes (bcrypt limit)");
export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);     // yyyy-mm-dd
export const loginSchema = z.object({ username: usernameSchema, password: z.string().min(1).max(72) });
export const sessionInput = z.object({
  name: z.string().trim().min(1).max(60), date: isoDate,
  courtCount: z.number().int().min(1).max(8), names: z.array(z.string().trim().min(1).max(40)).max(60),
});
export const rosterInput = z.object({ names: sessionInput.shape.names });
export const teamsSchema = z.tuple([z.tuple([z.string(), z.string()]), z.tuple([z.string(), z.string()])])
  .refine((t) => new Set(t.flat()).size === 4, "Pick 4 different players");
export const assignInput = z.object({
  target: z.discriminatedUnion("type", [
    z.object({ type: z.literal("court"), courtNumber: z.number().int().min(1).max(8) }),
    z.object({ type: z.literal("queue") }),
  ]),
  teams: teamsSchema,
});
export const tickInput = z.object({ checked: z.boolean() });
export const lockInput = z.object({ locked: z.boolean() });
export const startInput = z.object({ courtNumber: z.number().int().min(1).max(8) });
export const queueOrderInput = z.object({ gameIds: z.array(z.string()) });
export const treasuryInput = z.object({
  type: z.enum(["INCOME", "EXPENSE"]).default("EXPENSE"),
  amount: z.number().int().min(1).max(1_000_000_000),
  purpose: z.string().trim().min(1).max(200),
  date: isoDate,
});
```

## A.7 API specification

Base: `/api`. JSON in/out. All responses `Cache-Control: no-store`.
Roles: **P** public, **A** admin or superadmin, **S** superadmin. `GET /sessions/:id` stays **A** so admins can run matches in any session.

**Error format** (always):

```json
{ "error": { "code": "GAME_LOCKED", "message": "This match is locked. Unlock it first.", "fields": { "name": "Required" } } }
```

| HTTP | Meaning | Example codes |
|------|---------|---------------|
| 400 | Zod validation failed | `VALIDATION` |
| 401 | Not logged in / session expired | `UNAUTHENTICATED` |
| 403 | Logged in, role too low / CSRF guard | `FORBIDDEN` |
| 404 | Not found (or not visible) | `NOT_FOUND` |
| 409 | Rule conflict | `GAME_LOCKED`, `PLAYER_BUSY`, `COURT_OCCUPIED`, `NAME_TAKEN` |
| 429 | Login throttled | `TOO_MANY_ATTEMPTS` |

| Method & path | Role | Purpose / body → result |
|---------------|:----:|-------------------------|
| `POST /auth/login` | P | `loginSchema` → sets cookie, `{ user }` |
| `POST /auth/logout` | P | Deletes token, clears cookie |
| `GET /auth/me` | P | `{ user \| null }` |
| `POST /auth/password` | A | `{ currentPassword, newPassword }` |
| `GET /admins` | S | List admins incl. deleted |
| `POST /admins` | S | `{ username, password }` → new `ADMIN` |
| `DELETE /admins/:id` | S | Soft delete + revoke tokens |
| `PUT /admins/:id/password` | S | `{ password }` reset |
| `GET /sessions` | P | `SessionListItem[]`, newest date first |
| `GET /sessions/:id/summary` | P | `SessionSummary` (counts + courts + queue, see A.6) |
| `GET /sessions/:id` | A | Full `Session` |
| `POST /sessions` | S | `sessionInput` → `Session` |
| `PATCH /sessions/:id` | S | `{ name?, date?, courtCount? }` |
| `DELETE /sessions/:id` | S | Cascade delete |
| `PUT /sessions/:id/players` | S | `rosterInput` (diff by name, one transaction) |
| `POST /sessions/:id/games` | A | `assignInput` → `Game`; creates ticks + `locked=true` |
| `DELETE /sessions/:id/games` | A | Clear all matches |
| `PUT /sessions/:id/queue` | A | `queueOrderInput` reorder |
| `PATCH /games/:id` | A | `{ teams }` replace players (court/queue matches) |
| `DELETE /games/:id` | A | Delete match |
| `POST /games/:id/start` | A | `startInput` — QUEUED → ON_COURT |
| `POST /games/:id/finish` | A | ON_COURT → DONE, free court |
| `PUT /games/:id/players/:playerId` | A | `tickInput`; 409 if locked; auto-lock at 4 |
| `PUT /games/:id/lock` | A | `lockInput` |
| `GET /treasury` | A | `TreasurySummary` |
| `POST /treasury/entries` | A | `treasuryInput` → entry |
| `PATCH /treasury/entries/:id` | S | Partial `treasuryInput` |
| `DELETE /treasury/entries/:id` | S | Soft delete |

Route Handlers use Next 16 conventions: `params` is a `Promise` (`await ctx.params`, typed with the global `RouteContext<"/api/games/[id]">`), no `runtime`/`dynamic` exports (not supported with `cacheComponents`).

## A.8 UI specification

### Screens

| Route | Component | Audience |
|-------|-----------|----------|
| `/` | `MatchApp` | Everyone; content depends on role |
| `/treasury` | `TreasuryApp` | Admin/Superadmin (others see a "Please log in" card) |
| `/admins` | `AdminsApp` | Superadmin (others see "Not allowed") |

### Header (`AppHeader`)
Shared across `/`, `/treasury`, and `/admins`. Logo + title on the left.
- **Desktop (`> 860px`)**: *Visitor* → **Admin login** button. *Admin* → nav links (**Matches**, **Treasury**), username + role pill, **Password**, **Log out**. *Superadmin* → same plus **＋ New session** and **Admins**. "Live" dot indicates active polling.
- **Tablet & phone (`max-[860px]`)**: Compact single-row top bar with a **☰ Menu** button that opens a slide-over **sidebar drawer** containing the user profile card, navigation links (**Matches**, **Treasury**, **Admins**), quick actions (**＋ New session**, **Change password**), and **Log out** (supports backdrop click and `Esc` to close).

### Admin session page (top to bottom)
1. **Title row** — date eyebrow, session name, session switcher, History. **Superadmin only:** Edit players, **Session settings** (name/date/courts), Delete.
2. **Courts** — grid of `CourtCard`s (1 col mobile, 2 cols desktop). Occupied card: Court N, Team A vs Team B with avatars, "Playing since hh:mm", buttons *Edit players*, *Finish*. Empty card: dashed border, *Assign players*, and *Play next in queue* when the queue is not empty.
3. **Queue ("Next matches")** — ordered list of queued matches (Team A vs Team B), per-item ▲ ▼ Edit ✕, and **＋ Add to queue**.
4. **Next match** (recommendation, existing card) — actions: *Shuffle*, *Assign to court*, *Add to queue*, plus the waiting list.
5. **Games played** (checklist) — as today, with locked columns (lock icon in the header, disabled checkboxes, subtle tinted header). No "Add game" button.

### Dialogs (all use the existing `Modal`)
`LoginDialog`, `SessionDialog` (+ court count, superadmin), `SessionSettingsDialog` (superadmin), `RosterDialog` (superadmin), `HistoryDialog` (adds status pill, court, lock), `AssignDialog` (court picker or "queue", Team A/B player selects, "Use recommendation" button, busy hints), `TreasuryEntryDialog`, `AdminDialog`, `PasswordDialog`.

### Treasury page
Balance card (large number, income/expense sub-totals), **＋ Add spent** primary button (and secondary **＋ Add income**), entries table (date, purpose, type pill, amount, added by; superadmin gets Edit/Delete links). Empty state card in the existing `empty` style.

### Visitor page
Session switcher, then three read-only cards: **Courts** (same card layout as admin but no buttons), **Queue** (ordered, each item with a "Queued" pill), and **Games played** (player list, counts, `+N queued` hint). No controls, no checklist grid.

## A.9 Business rules & edge cases

| Situation | Rule |
|-----------|------|
| Assign to a court that is occupied | 409 `COURT_OCCUPIED` |
| Player already on a court assigned to another court | 409 `PLAYER_BUSY` |
| Edit players of an on-court match | Allowed; busy check excludes the match being edited |
| Tick change on locked column | 409 `GAME_LOCKED` |
| Untick makes a column 3/4 | Allowed (column was unlocked); `locked` stays false until it reaches exactly 4 again, then auto-locks |
| Roster edit removes a player | Their ticks vanish; any game they were in is **unlocked** and `teams` cleared |
| Court count lowered below an occupied court | 409 `COURT_OCCUPIED` |
| Delete an on-court or queued match | Allowed; court/queue slot frees; queue order compacts |
| Finish match | Sets `DONE`, `finishedAt`, `courtNumber = null`; ticks and lock unchanged |
| Promote queued match to court | Same busy/occupied checks as direct assignment |
| Soft-deleted admin with a live cookie | Next request fails (`deletedAt` checked on every request) → 401 |
| Last superadmin | Cannot be deleted (also guarded in UI) |
| Treasury entry soft-deleted | Hidden from list and balance; kept in DB |
| Two admins act at once | Ticks are idempotent; assignments are validated inside a transaction; the loser gets a 409 and the UI refetches |

## A.10 Acceptance criteria (summary)

1. A visitor opening `/` sees names, counts, who is on each court and the queue (queued items flagged), and nothing else; calling `GET /api/sessions/:id` without a cookie returns 401.
2. Logging in sets an `HttpOnly` cookie (verifiable in dev tools: not readable from `document.cookie`); logout removes it.
3. A superadmin creates a session; an admin can then run it: assign 2 matches to 2 courts → queue a third (flagged "Queued") → finish one → promote the queued match (flag disappears) → tick/untick and see lock behaviour → visitors see courts, queue and counts update within ~10 s.
4. A column with exactly 4 ticks is locked after reload; unlocking persists; the server rejects ticks while locked.
5. An admin gets 403 on **any session create/edit/roster/delete**, treasury edit/delete, and admin management; a superadmin succeeds.
6. Soft-deleting an admin logs them out on their next request and blocks re-login.
7. Treasury balance equals income minus expense for non-deleted entries; adding an entry updates it immediately.
8. `/` keeps its metadata, JSON-LD, sitemap entry; `/treasury` and `/admins` are `noindex`.
9. `npm run lint`, `npx tsc --noEmit` and `npm run build` pass.

---

# PART B — CODING RULES

These rules are **extracted from the existing code** (Section B.1–B.8) so new files look like the old ones, followed by rules for the layers that do not exist yet (B.9–B.12). Anything not listed: copy the nearest existing file.

## B.0 First rule for this repo

`AGENTS.md` states this is **not the Next.js you know**. Before writing Next-specific code, read the matching page in `node_modules/next/dist/docs/` (e.g. `route.md`, `proxy.md`, `cacheComponents.md`, `cookies.md`, `connection.md`). Facts verified and applied in this codebase: `middleware` is renamed **`proxy`**; Route Handler `params` is a **Promise**; `runtime`/`dynamic` route-segment exports are unsupported with `cacheComponents`; `LayoutProps<"/">` and `RouteContext<"…">` are global typed helpers; with `cacheComponents: true`, `GET` Route Handlers that do not read request-time APIs (`cookies()`, `headers()`) must call `await connection()` from `next/server` so Next.js does not attempt to prerender them at build time.

## B.1 Formatting & syntax

- Double quotes, semicolons, 2-space indent, trailing commas in multi-line literals, ~90–100 column soft limit (prettier-style wrapping as seen in current files).
- `const` by default; no `var`; no `any` (ESLint `next/typescript` is on).
- Function **declarations** for components and exported actions (`function SessionView`, `export function createSession`); **arrow functions** only for tiny pure helpers and constants (`const fmtDate = …`, `const cx = …`).
- Early returns over nested `if`. Optional chaining / nullish coalescing as in current code (`?? null`, `.at(-1)?.id`).
- Section dividers in long files use `/* ---------------------------------- actions --------------------------------- */`.

## B.2 Files, folders, naming

```
app/                 routes, metadata, route handlers (thin)
components/          PascalCase.tsx, one main component per file
lib/                 lowercase single-word files: types.ts store.ts match.ts ui.ts site.ts
lib/server/          server-only code (new)
prisma/              schema, migrations, seed (new)
```

- Components: `components/PascalCase.tsx`, **named export** (`export function Modal`). Only the root screen of a route uses `export default` (like `MatchApp`). Helper components used by one file stay in that file (`Slot` in `NextMatch.tsx`, `SessionView` in `MatchApp.tsx`); promote to its own file when reused (as `Modal`).
- Lib files: lowercase, single word where possible (`match.ts`, `store.ts`). New ones follow: `schemas.ts`, `api.ts`, `query.ts`, `auth.ts` (client hook), `format.ts` (currency/date helpers).
- Hooks start with `use`; actions are verbs (`createSession`, `removeGame`); booleans read as state (`creating`, `editing`, `showHistory`); callbacks are `onX` (`onClose`, `onShuffle`, `onStarted`).
- Import alias `@/` for everything outside the same folder; `./Name` for sibling components.
- Import order: `react` → `next/*` → `@/lib/*` (values) → `@/lib/types` (`import type`) → sibling components → `@/lib/ui`. Use `import type` for type-only imports.

## B.3 Components

- Every client component file starts with `"use client";` (current convention, even for leaf components). `app/**/page.tsx`, `layout.tsx`, `route.ts` do **not**.
- Props are typed **inline in the signature**, destructured:
  `export function RosterDialog({ session, onClose }: { session: Session; onClose: () => void })`.
- Keep state local and minimal (`useState`); derive instead of storing (`useMemo` for `rec`, `nextUp` as in `SessionView`).
- Dialogs: wrap in `Modal` (`title`, `description`, `onClose`); footer uses `modalActions` with **Cancel** `btn("light")` then the primary action `btn("primary")`. Forms use `<form onSubmit>` with `e.preventDefault()`; simple confirm dialogs use `window.confirm`.
- Give key buttons/inputs a kebab-case `id` (`new-session`, `start-match`, `roster-text`). Continue the pattern (`assign-court`, `add-to-queue`, `login-submit`, `treasury-add`).
- Toasts: one local `toast` state + `showToast()` in the screen component, rendered in the existing `role="status"` div. Do not add a toast library.
- Loading: `useHydrated()`/query status → render the shimmer skeleton card (`animate-shimmer`, `aria-busy="true"`), never a blank screen.
- Icon-only buttons need `aria-label` (and `title` when hover help helps). Inputs use `<label>` wrapping with `fieldLabel`, or `sr-only` text.
- Text copy: English, sentence case, `＋` (full-width plus) for add actions, `·` as separator, curly quotes `“ ”`, escape apostrophes in JSX with `&apos;`.

## B.4 Styling

- **Tailwind utility classes only**, in `className`. No CSS modules, no new global CSS. `globals.css` stays "element-level defaults + `@theme` tokens only".
- Reusable class strings live in **`lib/ui.ts`** and are exported as constants or small functions (`btn(variant, size)`, `pill(variant)`, `card`, `fieldInput`). If a class string appears a 3rd time, move it to `lib/ui.ts`. New additions follow the same shape (e.g. `courtCard`, `lockedHead`, `moneyText`).
- Conditional classes via `cx(...)`, never string concatenation.
- Colours: use the existing palette (`#204a74`, `#5da5e4`, `#eaf5ff`, `#b5524f` for danger, theme tokens `text-muted`, `warn`, `ok`). Introduce a new colour only as a `@theme` token.
- Responsive: single breakpoint `max-[860px]:`; spacing literals like `px-[22px]` / `max-[860px]:px-[15px]` follow the card pattern.
- Fonts: `font-display` for headings/numbers, default sans for body.
- Locked state styling: tinted header (`bg-[#f4f7fa]`), `🔒`/lock glyph, disabled checkbox (`disabled:cursor-not-allowed`), no new colour families.

## B.5 State, data & logic separation

- **Pure logic in `lib/*.ts`** (no React, no `window`, deterministic). `lib/match.ts` stays pure; new helpers (e.g. `courtsOf(session)`, `queueOf(session)`, `busyPlayers(session)`) are added there and take a `Session`.
- **UI never calls `fetch` directly.** It calls action functions exported from `lib/store.ts` (same names as today: `createSession`, `removeGame`, `togglePlayed` → now `setPlayed`, …) and reads data via hooks (`useDB`/`useSession`/`useAuth`).
- Keep `useSyncExternalStore` as the subscription primitive (as in the current store) for the tiny query cache in `lib/query.ts`.
- Dates are **`yyyy-mm-dd` strings** end-to-end on the client (`todayISO()`, `fmtDate` with the `T12:00:00` trick). Time-of-day only where a timestamp is shown (epoch ms → `en-GB` time).
- IDs are opaque strings from the server; the client no longer generates ids (remove `uid()` from the client once the API owns ids).

## B.6 Types

- `interface` for object shapes, `type` for unions/tuples/aliases (`Team`), matching `lib/types.ts`.
- Doc-comment **why** on non-obvious fields with `/** … */` (see `Game.teams`, `Game.createdAt`).
- Types shared by client and server live in `lib/types.ts`; inferred Zod types (`z.infer`) live next to the schema in `lib/schemas.ts`.

## B.7 Comments

- Short, explain **why** not what, in plain English; block comment above a function when behaviour is non-obvious (see `setRoster`, `recommend`). No commented-out code. No TODO without an owner/issue.

## B.8 Lint & checks

- `npm run lint` must pass (`next/core-web-vitals` + `next/typescript`). Empty `catch {}` is tolerated only where failure is truly ignorable (as in `parse`); anywhere else handle or rethrow.
- Run `npx tsc --noEmit` before every commit.

## B.9 Server code (new)

- All server-only modules live in **`lib/server/`** and start with `import "server-only";`. Never import them from a `"use client"` file.
- Layers: **route handler (thin)** → **service function** (`lib/server/sessions.ts`, `games.ts`, `treasury.ts`, `admins.ts`) → **Prisma**. Handlers only: authenticate/authorize, parse with Zod, call one service, map to DTO, return JSON. Business rules live in services, not in handlers and not in components.
- Single Prisma client in `lib/server/db.ts` using the `globalThis` singleton pattern so dev hot-reload does not exhaust connections.
- `lib/server/http.ts` exposes one wrapper used by **every** handler:

```ts
// sketch — keeps every handler 5–15 lines
export const POST = route({ roles: ["ADMIN", "SUPERADMIN"], body: assignInput },
  async ({ body, params, user }) => {
    const { id } = await params;
    return created(await assignGame(id, body, user));
  });
```

  The wrapper: awaits `connection()` from `next/server` before the `try/catch` block (so Next.js prerendering handles `HANGING_PROMISE_REJECTION` cleanly under `cacheComponents`), runs the CSRF guard for non-GET, resolves the user from the cookie (DB lookup of `tokenHash`, joins `User`, requires `deletedAt = null` and unexpired token), checks the role, parses the body with Zod (400 on failure), catches `HttpError`/Prisma errors into the standard error JSON, and sets `Cache-Control: no-store`.
- Throw `new HttpError(409, "GAME_LOCKED", "…")` from services; never return ad-hoc error shapes.
- Authorization is **deny-by-default**: a handler without a `roles` option is a compile error (`roles: "public"` must be explicit).
- DTO mapping (Prisma row → `Session`/`Game`/…) lives in `lib/server/dto.ts`; never return Prisma models directly (avoids leaking `passwordHash`, audit ids).
- Multi-step writes use `prisma.$transaction`. Retry once on `(sessionId, seq)` unique violation when allocating `seq`.
- No raw SQL unless a constraint cannot be expressed in Prisma; if used, parameterised (`Prisma.sql`).
- Secrets only from `process.env`; `.env*` stays git-ignored; commit a `.env.example` (add `!.env.example` to `.gitignore`).
- Passwords: `bcrypt.hash(password, 12)` / `bcrypt.compare` (async); limit input to 72 bytes in Zod. Tokens: `crypto.randomBytes(32).toString("base64url")`; store SHA-256 hex. If the host cannot load the native `bcrypt` binary, swap to `bcryptjs` (same API) — nothing else changes.
- Do not log request bodies, passwords, or tokens.

## B.10 Validation (Zod)

- One schema = one source of truth in `lib/schemas.ts`, used by **both** the form (`schema.safeParse` → inline error text under the field, existing `notice` style) and the route handler.
- Trim and normalise in the schema (`.trim()`, `.toLowerCase()`), not scattered in components.
- Never trust client-derived values: counts, balances, roles, `locked`, `status` are computed server-side.
- Error `fields` in API responses come from `error.flatten().fieldErrors`.

## B.11 Client data layer (`@tanstack/react-query`)

- `lib/api.ts`: `api<T>(path, { method, body })` wrapper around `fetch` (`credentials: "same-origin"`, JSON headers, throws `ApiError { status, code, message, fields }`).
- `lib/query.ts` & `components/QueryProvider.tsx`: exports the shared TanStack `queryClient` (`QueryClient`) and typed `queryKeys`, provided at the root in `app/layout.tsx` via `QueryProvider`. Every data fetch (`useAuth`, `useSessionsList`, `useSessionSummary`, `useSessionDetail`, `useTreasury`, `useAdmins`) uses TanStack `useQuery` (`refetchInterval` with `refetchIntervalInBackground: false`, `refetchOnWindowFocus: true`).
- Mutations & Loading States: call API → `queryClient.invalidateQueries`; for ticks/court/queue actions apply optimistic `queryClient.setQueryData` with rollback on error, and show inline `spinner` loading states on every action button so interactions never feel laggy.
- `lib/auth.ts` (client): `useAuth()` returns `{ user, loading }` from `/api/auth/me` via TanStack `useQuery`; `login()`, `logout()` actions update/invalidate `queryClient`. UI gates with `user?.role`, never with anything stored in the browser.
- Selected-session id stays in `localStorage` (key `mbg-current-v2`) as a per-device preference only; no data is stored there anymore.

## B.12 Routing, SEO & security checklist for every new route

- `app/<route>/page.tsx` = server component exporting `metadata` and rendering one client root. Private pages: `robots: { index: false, follow: false }`.
- Update `robots.ts` (disallow `/api`, `/treasury`, `/admins`); `sitemap.ts` stays `/` only.
- Every new API route: has `roles`, a Zod schema for any input, a test through `curl` for 401/403/400/409, and returns a DTO.
- Never put tokens, passwords, or role decisions in `localStorage`, URLs, or response bodies.

## B.13 Git hygiene

- Small commits per task in Part C; message format `feat(courts): assign match to court`, `fix(auth): …`, `chore(db): …`.
- Commit `prisma/migrations/**`, `AGENTS.md`, `.env.example`; do **not** commit `.env*` or `*.tsbuildinfo` (already ignored). Add `!.env.example` to `.gitignore` so the example file can be committed.

---

# PART C — IMPLEMENTATION PLAN

Sizing: **S** ≤ half day, **M** ≈ 1 day, **L** 2–3 days. Phases are **vertical and shippable**: after each phase the app runs and can be demoed. Do not start a phase before the previous "Done when" passes.

## File impact map

| File | Action | Notes |
|------|--------|-------|
| `lib/types.ts` | **Modify** | Add fields from A.6 (backwards-compatible) |
| `lib/schemas.ts` | **New** | Zod schemas (A.6) |
| `lib/store.ts` | **Rewrite internals** | Same exported action names where possible; localStorage → API |
| `lib/api.ts`, `lib/query.ts`, `lib/auth.ts`, `lib/format.ts` | **New** | Client data layer, auth hook, `formatIDR`, date helpers |
| `lib/match.ts` | **Modify (small)** | `busy` option; court/queue helpers |
| `lib/ui.ts` | **Extend** | New shared class strings only |
| `lib/site.ts` | Unchanged | |
| `lib/server/*` | **New** | `db.ts`, `http.ts`, `auth.ts`, `password.ts`, `dto.ts`, `sessions.ts`, `games.ts`, `treasury.ts`, `admins.ts` |
| `prisma/schema.prisma`, `prisma/seed.ts` | **New** | Seed command registered in `package.json` (`"prisma": { "seed": "tsx prisma/seed.ts" }`) |
| `app/api/**/route.ts` | **New** | Per A.7 |
| `app/treasury/page.tsx`, `app/admins/page.tsx` | **New** | Server shell + client root |
| `app/layout.tsx`, `app/manifest.ts`, `app/sitemap.ts` | Unchanged | |
| `app/robots.ts` | **Modify** | Disallow private paths |
| `components/MatchApp.tsx` | **Modify** | Header auth, role gating, new layout order, visitor branch |
| `components/NextMatch.tsx` | **Modify** | Replace *Start match* with *Assign to court* / *Add to queue* |
| `components/PlayerGrid.tsx` | **Modify** | Lock UI, remove *Add game*, optimistic tick |
| `components/HistoryDialog.tsx` | **Modify** | Status, court, lock info |
| `components/SessionDialog.tsx` | **Modify** | Court count field; superadmin only |
| `components/RosterDialog.tsx`, `Modal.tsx` | Minimal / unchanged | Roster becomes async with error handling; superadmin only |
| `components/AppHeader.tsx`, `components/CourtBoard.tsx`, `CourtCard.tsx`, `QueuePanel.tsx`, `AssignDialog.tsx`, `SessionSettingsDialog.tsx`, `VisitorView.tsx`, `LoginDialog.tsx`, `PasswordDialog.tsx`, `TreasuryApp.tsx`, `TreasuryEntryDialog.tsx`, `AdminsApp.tsx`, `AdminDialog.tsx` | **New** | `AppHeader` provides the desktop header and responsive tablet/phone sidebar drawer |
| `.gitignore`, `.env.example`, `package.json` | **Modify/New** | |

## Phase 0 — Confirm & prepare (S)

1. Section 0 decisions (A1–A9) are already agreed; re-open only if something changes.
2. Read the relevant Next 16 docs listed in B.0 (the plan already verified the key points).
3. Provision PostgreSQL (local Docker or a hosted instance; if serverless, use the provider's pooled connection string).
4. Create a git branch `feat/v2`.

**Done when:** a Postgres URL exists and the branch is created.

## Phase 1 — Foundation: database & tooling (M)

1. Install: `prisma@~6.19` (dev), `@prisma/client@~6.19`, `zod`, `bcrypt`; dev: `@types/bcrypt`, `tsx`. No `dotenv` and no driver adapter are needed with Prisma 6.
2. Create `prisma/schema.prisma` from A.5 and register the seed command in `package.json`.
3. Run first migration `init` (`prisma migrate dev --name init`). Add `!.env.example` to `.gitignore`; create `.env.example` (`DATABASE_URL`, `SUPERADMIN_USERNAME`, `SUPERADMIN_PASSWORD`).
4. `lib/server/db.ts` (`globalThis` singleton `new PrismaClient()`).
5. `lib/server/password.ts` (bcrypt hash/verify, cost 12) and `prisma/seed.ts` (upsert the superadmin from env; idempotent).
6. Add scripts: `db:migrate`, `db:seed`, `db:studio`.

**Done when:** `npm run build` still passes; seed creates a superadmin row; `studio` shows all tables.

## Phase 2 — Server core & authentication (L)

1. `lib/schemas.ts` (auth + all schemas from A.6).
2. `lib/server/http.ts`: `HttpError`, `route()` wrapper (CSRF guard, auth lookup, role check, Zod parse, error mapping, `no-store`).
3. `lib/server/auth.ts`: create/verify/revoke token, cookie helpers (`cookies()` from `next/headers`, awaited), lockout logic (FR-AUTH-7).
4. Routes: `auth/login`, `auth/logout`, `auth/me`, `auth/password`.
5. Verify with `curl`: login sets `HttpOnly` cookie; `me` works; wrong password ×5 → 429; logout revokes; foreign `Origin` → 403.

**Done when:** acceptance #2 and the lockout and CSRF behaviour pass via curl.

## Phase 3 — Sessions, roster & match backend (L)

1. `lib/server/dto.ts` + `lib/types.ts` additions.
2. `lib/server/sessions.ts`: list, summary (public: counts + `queued` + courts + queue), detail, create (with roster), patch (court-count guard), delete, roster diff (keep ids by name; unlock affected games).
3. `lib/server/games.ts`:
   - `assignGame` (court or queue; busy/occupied checks; allocate `seq`; create ticks with teams; `locked = true`; queue order = max+1),
   - `updateGame` (replace players/teams, re-lock at 4),
   - `startGame` (queue → court), `finishGame`, `reorderQueue`, `deleteGame` (+ queue compaction), `clearGames`,
   - `setPlayed` (idempotent; reject if locked; clear teams; auto-lock at exactly 4), `setLocked`.
4. Routes for every `sessions/*` and `games/*` entry in A.7.
5. Curl matrix: each rule in A.9 (`COURT_OCCUPIED`, `PLAYER_BUSY`, `GAME_LOCKED`, role 403s, visitor 401 on detail but 200 on summary).

**Done when:** every row in A.9 behaves as specified through the API alone; summary endpoint exposes only names, counts, `queued`, courts and queue.

## Phase 4 — Client data layer, role-aware shell, parity (L)

Goal: the app works again on the new backend with **v1 feature parity** for admins, plus the visitor view.

1. `lib/api.ts`, `lib/query.ts`, `lib/auth.ts`, `lib/format.ts`.
2. Rewrite `lib/store.ts` internals to call the API; keep exported names (`createSession`, `deleteSession`, `setRoster`, `removeGame`, `clearGames`, `selectSession`, `parseNames`, `todayISO`); `togglePlayed` → `setPlayed(sessionId, gameId, playerId, checked)`. Current-session id stored under `mbg-current-v2`.
3. `LoginDialog`, header changes in `MatchApp` (login/logout, role pill), skeleton while loading.
4. `VisitorView` bound to `/summary` (10 s polling): courts, queue (flagged), counts.
5. Admin path: `SessionView` uses `GET /sessions/:id` (5 s polling); gate buttons by role (session create/edit/roster/delete only for superadmin); `SessionDialog` gets the court count; add `SessionSettingsDialog`.
6. Keep `NextMatch`/`PlayerGrid` working temporarily (blank add-game stays until Phase 5 so parity can be tested).

**Done when:** a visitor sees counts, courts and queue; a superadmin can create sessions and edit rosters; an admin can open a session, tick and view history, and gets 403 on session management; data survives reload and is shared across two browsers.

## Phase 5 — Courts, queue, recommendation hook-up & locked checklist (L)

1. `lib/match.ts`: `busy` option in `recommend` (FR-REC-2); helpers `courtsOf`, `queueOf`, `busyPlayers`.
2. `AssignDialog` (court picker / queue mode, Team A/B selects excluding already-picked players, "Use recommendation" prefill, busy hints, Zod-validated submit).
3. `CourtBoard` + `CourtCard` (occupied/empty states, Edit, Finish, Play next in queue).
4. `QueuePanel` (list, ▲ ▼, Edit, ✕, Add to queue).
5. `NextMatch`: replace the start button with **Assign to court** / **Add to queue** (prefilled); keep Shuffle and waiting list; toast copy updated.
6. `PlayerGrid`: remove *Add game*; lock icon per column, disabled checkboxes when locked, optimistic ticks with rollback; header shows `ticked/total`.
7. Reorder `SessionView` sections: Courts → Queue → Next match → Games played. Update `HistoryDialog` (status pill, court, lock).
8. Implement the **Queued flag** (FR-MAT-11, FR-CHK-9): pill on queued columns/items, `+N queued` count hint, shared `pill("warn")`-style class; reuse in the visitor view.
9. Add shared class strings to `lib/ui.ts` as needed.

**Done when:** acceptance #3 and #4 pass end-to-end on a phone-width viewport.

## Phase 6 — Treasury (M)

1. `lib/server/treasury.ts`: list + aggregate balance, create (admin), update/soft-delete (superadmin).
2. Routes `treasury`, `treasury/entries`, `treasury/entries/[id]`.
3. `lib/format.ts` `formatIDR`; `app/treasury/page.tsx` (noindex) + `TreasuryApp` + `TreasuryEntryDialog` (Zod-validated, date defaults to today, no time input).
4. Superadmin-only Edit/Delete controls; confirm with `window.confirm`.

**Done when:** acceptance #5 (treasury part) and #7 pass; admin gets 403 on edit/delete via curl.

## Phase 7 — Admin management (M)

1. `lib/server/admins.ts`: list, create (`ADMIN` only), soft delete (guard self/superadmin; revoke tokens), reset password.
2. Routes `admins`, `admins/[id]`, `admins/[id]/password`.
3. `app/admins/page.tsx` (noindex) + `AdminsApp` + `AdminDialog`; `PasswordDialog` for own password (header menu).

**Done when:** acceptance #6 passes (deleted admin is kicked on next request and cannot log in).

## Phase 8 — Hardening, SEO, legacy import, release (M)

1. Update `robots.ts` (disallow private paths); verify `/treasury` and `/admins` metadata `noindex`.
2. Review every route for `roles`, Zod schema, DTO-only responses, `no-store`.
3. **Optional legacy import:** **superadmin-only** "Import from this device" button reads `mbg-match-v1` once and POSTs to a one-off `POST /api/import` (sessions → `DONE` games, locked when exactly 4 ticks). Remove the endpoint after migration.
4. Manual QA script (below), `npm run lint`, `npx tsc --noEmit`, `npm run build`.
5. Deploy: set env vars, `prisma migrate deploy`, run the seed once, change the seeded superadmin password immediately.

**Done when:** all acceptance criteria A.10 pass on the production build.

## Manual QA script (use after Phases 5–8)

1. Visitor: open `/` logged out → counts, courts and queue (queued items flagged) only; try `/treasury` and `/admins` → blocked message; `GET /api/sessions/:id` → 401.
2. Superadmin: create session (2 courts, 8 players). Admin: assign recommended match to court 1 → assign manual match to court 2 → add third match to queue (flagged "Queued") → try assigning a player who is on court 1 to court 2 (expect `PLAYER_BUSY`) → finish court 1 → *Play next in queue* (flag disappears). Admin attempts session edit/roster/delete → 403.
3. Checklist: columns with 4 ticks are locked after reload; tick attempt on locked column fails; unlock → untick one → tick another → auto-locks again.
4. Two browsers (two admins): tick the same cell at the same time → no inversion; assign to the same court → one gets `COURT_OCCUPIED` and refreshes.
5. Superadmin roster edit removes a player → their ticks gone, affected columns unlocked.
6. Court count (superadmin): lower below an occupied court → blocked.
7. Treasury: add expense and income → balance correct; superadmin edits and deletes → balance updates; admin cannot.
8. Superadmin: create admin → admin logs in → soft delete → admin's next request is 401 and login fails → superadmin cannot delete self.
9. Cookie: `document.cookie` does not show the token; cookie is `HttpOnly`, `SameSite=Strict`, `Secure` on production.

## Risks & mitigations

| Risk | Mitigation |
|------|------------|
| Next 16 conventions differ from memory | Read the local docs before each Next-specific task (B.0); small steps with build after each phase. |
| Prisma 6 is not the newest major | Pin `~6.19`; the schema is portable if you upgrade later (adapter + config changes only). |
| Native `bcrypt` binary missing on host | Swap to `bcryptjs` (same API); no other change. |
| Serverless DB connection limits | Use a pooled connection URL and the single-client singleton. |
| Polling cost / staleness | 5 s admin / 10 s visitor, paused when tab hidden; revisit SSE only if needed. |
| Two admins editing simultaneously | Idempotent ticks, transactions, unique constraints, 409 → refetch. |
| Unlocked-by-mistake columns | Auto re-lock at exactly 4 ticks; server enforces the lock. |
| Sensitive treasury data | Admin+ only, soft delete, audit columns (`createdById`, `updatedById`, `deletedById`). |

## Suggested order of delivery (summary)

`Phase 1 DB` → `Phase 2 Auth` → `Phase 3 Backend rules` → `Phase 4 Client layer + visitor + parity` → `Phase 5 Courts/queue/locks` → `Phase 6 Treasury` → `Phase 7 Admin management` → `Phase 8 Hardening & release`.

Rough total: **≈ 12–16 working days** for one developer, dominated by Phases 2, 3, 4 and 5.

---

## Implementation Status (Updated)

All phases (**Phase 1 through Phase 8**) have been implemented in the codebase:

- **Phase 1 — Foundation (`prisma/schema.prisma`, `prisma/seed.ts`, `lib/server/db.ts`, `lib/server/password.ts`, `.env.example`, `.gitignore`)**: ✅ Implemented (`@prisma/client@~6.19`, `prisma@~6.19`, `zod`, `bcrypt`, `server-only`, `tsx`).
- **Phase 2 — Server Core & Auth (`lib/schemas.ts`, `lib/server/http.ts`, `lib/server/auth.ts`, `app/api/auth/**`)**: ✅ Implemented (`HttpOnly` `SameSite=Strict` cookie, SHA-256 token hashing, 5-attempt / 15-minute lockout, CSRF origin & content-type guard, `await connection()` for `cacheComponents` compatibility).
- **Phase 3 — Sessions, Roster & Match Backend (`lib/types.ts`, `lib/server/dto.ts`, `lib/server/sessions.ts`, `lib/server/games.ts`, `app/api/sessions/**`, `app/api/games/**`)**: ✅ Implemented (court assignment, queue ordering & compaction, `COURT_OCCUPIED` / `PLAYER_BUSY` / `GAME_LOCKED` guards, `SessionStatus` `OPEN`/`CLOSED` visibility where `CLOSED` sessions are restricted to `ADMIN`/`SUPERADMIN`, paginated & filterable `GET /api/sessions`, roster diff with automatic unlock of affected games, idempotent ticks with auto-lock at 4 players).
- **Phase 4 — Client Data Layer & Visitor View (`lib/api.ts`, `lib/query.ts`, `lib/auth.ts`, `lib/format.ts`, `lib/store.ts`, `components/Dialog.tsx`, `components/VisitorView.tsx`, `components/LoginDialog.tsx`, `components/SessionDialog.tsx`, `components/SessionSettingsDialog.tsx`)**: ✅ Implemented (5 s admin / 10 s visitor polling paused when hidden, focus refetch, role-gated session controls, reusable `Dialog` and `ConfirmDialog` components replacing all native `window.confirm` / `window.alert` / `window.prompt` calls, separated external visitor card grid vs. internal organiser paginated & filterable sessions table).
- **Phase 5 — Courts, Queue, Recommendation & Locked Checklist (`lib/match.ts`, `components/AssignDialog.tsx`, `components/CourtBoard.tsx`, `components/CourtCard.tsx`, `components/QueuePanel.tsx`, `components/NextMatch.tsx`, `components/PlayerGrid.tsx`, `components/HistoryDialog.tsx`, `components/MatchApp.tsx`)**: ✅ Implemented (`busy` filter in `recommend()`, Courts → Queue → Next match → Games played layout, `Queued` pills and `+N queued` player badges, column lock/unlock UI & optimistic ticks).
- **Phase 6 — Treasury (`lib/server/treasury.ts`, `app/api/treasury/**`, `app/treasury/page.tsx`, `components/TreasuryApp.tsx`, `components/TreasuryEntryDialog.tsx`)**: ✅ Implemented (server-side IDR balance aggregation, 4-card dashboard with all-time cash left & period income/spent/net flow, 6-month interactive cashflow chart, periodical & month/date-range/type/search filters, server-side pagination with `@tanstack/react-query` `keepPreviousData`, `INCOME`/`EXPENSE` entries, superadmin edit & soft-delete).
- **Phase 7 — Admin Management (`lib/server/admins.ts`, `app/api/admins/**`, `app/admins/page.tsx`, `components/AdminsApp.tsx`, `components/AdminDialog.tsx`, `components/PasswordDialog.tsx`)**: ✅ Implemented (admin creation, password reset, soft-delete with immediate token revocation, self-password change).
- **Phase 8 — SEO & Hardening (`app/robots.ts`, `app/treasury/page.tsx`, `app/admins/page.tsx`)**: ✅ Implemented (`/api/`, `/treasury`, `/admins` disallowed in `robots.ts` and marked `noindex`).

### Database Setup Quickstart

1. Copy `.env.example` to `.env` and set `DATABASE_URL`, `SUPERADMIN_USERNAME`, and `SUPERADMIN_PASSWORD`.
2. Run `npm run db:migrate -- --name init` to apply the schema to your PostgreSQL instance.
3. Run `npm run db:seed` to create/update the initial Superadmin account.
