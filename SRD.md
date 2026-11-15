# MBG — Software Requirements Document (as-built)

**Product:** MBG · Minggu Badminton Guys — Fair Match Planner
**Document status:** Updated to match the repository snapshot `mbg-webapp-main` (verified 2026-11-12). This replaces the earlier "SRD, Coding Rules & Implementation Plan" that described the v2 *plan*. All eight implementation phases of that plan are done, so this document describes the system **as it is built**, plus the coding rules the code actually follows.

Related documents in the repo:

| File | Purpose |
|------|---------|
| `SRD.md` (this file) | Requirements, architecture, folder structure, coding rules |
| `PERFORMANCE_PLAN.md` | Plan to improve load performance (frame-first loading); written from the 2026-11-12 Lighthouse runs |
| `AGENTS.md` | Auto-managed agent rules from `next dev`. Says this Next.js version differs from older versions: read `node_modules/next/dist/docs/` first |
| `REFACTOR_PLAN.md`, `REFACTOR_NOTES.md` | History of the modularization + Zustand refactor and the oddities it deliberately preserved (summarised in §15) |

## Contents

1. Purpose & scope
2. Users & roles
3. Functional requirements
4. Non-functional requirements
5. Tech stack
6. Project folder structure
7. Data model
8. Shared types & validation schemas
9. API specification
10. Client architecture & data flow
11. UI specification
12. Business rules & edge cases
13. Coding rules
14. Environment, scripts & deployment
15. Known deviations, tech debt & open items
16. Acceptance criteria
17. Decision log
18. Changes from the previous SRD

---

## 1. Purpose & scope

MBG is a shared planner for a weekly badminton group. Organisers create **sessions** (a game day) with a roster, run **matches** on numbered **courts** with a **queue**, track a **games-played checklist** so everyone gets equal court time, and keep a **club treasury**. Players (visitors) can open a session read-only to see who is on court, what is queued next, and how many games each person has played.

In scope: public read-only view, organiser accounts (Admin / Superadmin), sessions + roster, courts + queue + locked checklist, fairness-based recommendation, treasury, admin-account management, PostgreSQL persistence.

Out of scope: player accounts, online payments, notifications, multi-club tenancy, i18n (UI is English), file uploads, websockets (the client polls).

---

## 2. Users & roles

| Role | Who | How created |
|------|-----|-------------|
| **Visitor** | Anyone, not logged in | — |
| **Admin** | Trusted organiser | Created by a Superadmin in the UI (`/admins`) |
| **Superadmin** | Owner | Seed script only (`npm run db:seed`); never via UI/API |

### Permission matrix

| Capability | Visitor | Admin | Superadmin |
|------------|:------:|:-----:|:----------:|
| List **open** sessions; per-session public summary (courts, queue, games played) | ✅ | ✅ | ✅ |
| See **closed** sessions (list + summary) | ❌ | ✅ | ✅ |
| **Open / close** a session (status toggle) | ❌ | ✅ | ✅ |
| Create session; edit name, date, court count; edit roster; delete session | ❌ | ❌ | ✅ |
| Open the full session (detail, checklist, history, recommendation) | ❌ | ✅ | ✅ |
| Assign match to court/queue; edit players; finish; promote; reorder; delete; clear all matches | ❌ | ✅ | ✅ |
| Tick/untick checklist; lock/unlock a column | ❌ | ✅ | ✅ |
| View treasury; add entry (income / spent) | ❌ | ✅ | ✅ |
| Edit / soft-delete treasury entry | ❌ | ❌ | ✅ |
| Add admin; soft-delete admin; reset admin password | ❌ | ❌ | ✅ |
| Log in / log out / change own password | — | ✅ | ✅ |

Authorization is **always enforced on the server** (`route({ roles })`). Hiding a button in the UI is a convenience only.

---

## 3. Functional requirements

Requirement IDs are kept stable from the earlier SRD so old references still work.

### 3.1 Authentication & accounts (`FR-AUTH`)

| ID | Requirement |
|----|-------------|
| FR-AUTH-1 | Admins log in with **username + password** (`POST /api/auth/login`). |
| FR-AUTH-2 | Success sets an opaque random token in the cookie **`mbg_session`**: `HttpOnly`, `SameSite=Strict`, `Path=/`, `Secure` in production, `Max-Age` 7 days. The token is never readable by JavaScript and never returned in a body. Token = `crypto.randomBytes(32)` as base64url. |
| FR-AUTH-3 | Only the **SHA-256 hash** of the token is stored (`AuthToken.tokenHash`). Logout deletes the row and clears the cookie. Expired tokens are deleted when seen. |
| FR-AUTH-4 | The client learns the current user from `GET /api/auth/me` → `{ user: { id, username, role } \| null }`. |
| FR-AUTH-5 | Passwords are hashed with **bcrypt, cost 12**. Max **72 bytes** (bcrypt limit) enforced by Zod; minimum 10 characters for new passwords. |
| FR-AUTH-6 | Unknown user, wrong password and soft-deleted user all return the same `401 UNAUTHENTICATED` "Invalid username or password". A dummy bcrypt compare keeps timing similar. |
| FR-AUTH-7 | **Lockout:** 5 consecutive failures lock an existing, active account for 15 minutes (`failedAttempts`, `lockedUntil`, HTTP 429 `TOO_MANY_ATTEMPTS`). A successful login resets the counter. If a lock has expired the next failure counts as attempt 1. |
| FR-AUTH-8 | Soft-deleting an admin deletes all their tokens at once; the user is also re-checked (`deletedAt`) on every request. |
| FR-AUTH-9 | A user can change their own password (`POST /api/auth/password`, needs current password). All **other** tokens of that user are revoked; the current one stays. |
| FR-AUTH-10 | The API can only create `ADMIN`. `SUPERADMIN` exists only through the seed script (env vars). |
| FR-AUTH-11 | **CSRF guard** on every non-GET request: an `Origin` header must be present and its host must equal `x-forwarded-host` (or `host`); routes that declare a body schema also require `Content-Type: application/json`. Failures → 403 `FORBIDDEN`. |

### 3.2 Admin management — Superadmin only (`FR-ADM`)

| ID | Requirement |
|----|-------------|
| FR-ADM-1 | List all accounts (active and soft-deleted), ordered by role then creation date. |
| FR-ADM-2 | Create an admin: username (3–32 chars, `[a-z0-9_.-]`, trimmed + lowercased, unique) and password (10–72 bytes). Duplicate username → 409 `NAME_TAKEN` (soft-deleted names stay reserved). |
| FR-ADM-3 | **Soft delete** (`deletedAt`) and revoke tokens in one transaction. Deleting yourself or a superadmin → 403. Deleting an already-deleted admin is a no-op. |
| FR-ADM-4 | Reset an active account's password (also clears `failedAttempts`/`lockedUntil` and revokes that account's tokens). |
| FR-ADM-5 | Data created by a soft-deleted admin is untouched. |

### 3.3 Sessions (`FR-SES`)

| ID | Requirement |
|----|-------------|
| FR-SES-1 | **Superadmin** creates a session: name (1–60, defaults to `Game day <yyyy-mm-dd>` in the dialog), date (`yyyy-mm-dd`, no time), court count (1–8, default 1), status (`OPEN` default / `CLOSED`), roster (one name per line, max 60 names, 1–40 chars, de-duplicated case-insensitively). |
| FR-SES-2 | **Superadmin** edits name, date, court count. Court count cannot go below the highest occupied court (409 `COURT_OCCUPIED`). |
| FR-SES-3 | **Superadmin** edits the roster. Same name (case-insensitive) keeps its player id and games. Removed players lose their ticks; every game they were in is **unlocked** and its team split cleared. New players are appended; order follows the pasted order. |
| FR-SES-4 | **Superadmin** deletes a session (cascade to players, matches, ticks). |
| FR-SES-5 | **Any organiser** (Admin or Superadmin) can toggle the session **status** (`OPEN` ↔ `CLOSED`). Any other field in the same PATCH from an Admin → 403. |
| FR-SES-6 | **Visibility:** `CLOSED` sessions are hidden from visitors. The list excludes them (visitors always get `status = OPEN`, counts exclude closed) and `GET /summary` returns 403 `SESSION_CLOSED`. |
| FR-SES-7 | **Session list** (`GET /api/sessions`): filters `from`, `to` (`yyyy-mm-dd`), `status` (`ALL`/`OPEN`/`CLOSED`, organisers only), `q` (name contains, case-insensitive); pagination `page`, `pageSize` (clamped 5–100, default 10); ordered by date desc then creation desc; returns `openCount` / `closedCount` for the current date+name filter. Each item has `courtCount`, `playerCount`, `gameCount`. |
| FR-SES-8 | The selected session id is a **per-device preference** stored in `localStorage` key `mbg-current-v2` and synced across tabs through the `storage` event. A non-authoritative UI boot hint (`{ role: "organiser" \| "visitor" }`) is stored in `localStorage` key `mbg-boot-v1` strictly to pick which queries `QueryProvider` prefetches in parallel on initial load; never used for access control or server trust. |

### 3.4 Courts, queue & assignment (`FR-MAT`)

A "match" is a `Game` in code and DB.

| ID | Requirement |
|----|-------------|
| FR-MAT-1 | A session has `courtCount` courts numbered 1…N. A court is empty or holds exactly one `ON_COURT` match (DB unique `(sessionId, courtNumber)`). |
| FR-MAT-2 | Exactly **two ways** to create a match: **assign to an empty court** or **add to the queue** (`POST /sessions/:id/games`, `target: { type: "court" \| "queue" }`). There is no blank "add game". |
| FR-MAT-3 | A match has **4 distinct roster players** split into Team A (2) and Team B (2). Validated by Zod and by roster membership on the server. |
| FR-MAT-4 | The assign dialog can be prefilled from the recommendation and adjusted. The same dialog edits an existing match. |
| FR-MAT-5 | Court assignment checks: court exists (≤ `courtCount`, else 400), court free (409 `COURT_OCCUPIED`), no player already `ON_COURT` elsewhere (409 `PLAYER_BUSY`). **Queue** assignment skips the busy check; the dialog still shows a "currently on court N" hint. |
| FR-MAT-6 | The queue is ordered by `queueOrder` (1…n, compacted after every removal/promotion). Organisers can reorder (▲ ▼ → `PUT /sessions/:id/queue`, must list every queued id exactly once), edit players, or remove a queued match. |
| FR-MAT-7 | **Promote** (`POST /games/:id/start`, body `{ courtNumber }`): `QUEUED → ON_COURT` with the same court/busy checks; non-queued → 409 `INVALID_STATE`. No auto-promotion. An empty court card shows **Play next in queue** when the queue is not empty. |
| FR-MAT-8 | **Finish** (`POST /games/:id/finish`): `ON_COURT → DONE`, `courtNumber = null`, `finishedAt` set; ticks and lock unchanged; otherwise 409 `INVALID_STATE`. |
| FR-MAT-9 | **Edit players** (`PATCH /games/:id`, `{ teams }`) replaces the match's player rows and locks it. For an `ON_COURT` match the busy check ignores the match being edited. |
| FR-MAT-10 | Delete a match in any status; clear all matches of a session. Queue order compacts after deleting a queued match. |
| FR-MAT-11 | **Games played** for a player = number of the session's matches they are ticked in, **regardless of status** (queued matches count immediately). A separate `queued` number says how many of those are still `QUEUED`. |
| FR-MAT-12 | **Queued flag:** a queued match always shows a **"Queued"** pill (queue list, checklist column header, visitor queue) and each player's count shows `(+N queued)` when N > 0. |
| FR-MAT-13 | Match numbering in the UI ("Game n") follows creation order (`seq`, unique per session; allocation retries once on a unique-constraint race). |

### 3.5 Recommendation (`FR-REC`)

Pure, client-side, in `lib/match.ts`; computed from the fetched session.

| ID | Requirement |
|----|-------------|
| FR-REC-1 | Needs ≥ 4 players, otherwise no recommendation. Ranking: fewest games → longest rest (smallest "last played" index) → seeded tie-break. |
| FR-REC-2 | Players currently `ON_COURT` are excluded when at least 4 other players remain; otherwise the full ranking is used. |
| FR-REC-3 | The four picked players are split into the pairing (of 3 possible) that repeats past partners the least; the seed also nudges this choice. **Shuffle** changes the seed (only tied players can change). |
| FR-REC-4 | The Next match card offers **Assign to court** and **Add to queue** (prefilled via `prefillFromRec`), plus a waiting list ordered by who plays next, and a "level" state when everyone has the same count. |
| FR-REC-5 | Organisers only. Visitors never receive the data needed to compute it. |

### 3.6 Checklist & column locking (`FR-CHK`)

| ID | Requirement |
|----|-------------|
| FR-CHK-1 | "Games played" table: rows = players (sticky first column), columns = matches (G1…Gn), a checkbox per cell, per-player count. |
| FR-CHK-2 | Each match has a persisted `locked` flag. It is **locked on creation** (assign / edit) and **auto-locked whenever a manual tick leaves exactly 4 ticks**; any other tick count leaves it unlocked. |
| FR-CHK-3 | A locked column's checkboxes are disabled and the header shows a lock button that unlocks it (and a button to re-lock). |
| FR-CHK-4 | The **server rejects** tick changes on a locked match (409 `GAME_LOCKED`). |
| FR-CHK-5 | Ticks are **idempotent**: `PUT /games/:id/players/:playerId` with `{ checked: boolean }`, not a toggle. |
| FR-CHK-6 | Any manual tick change sets every player's `team` in that match to null (team split no longer reliable). |
| FR-CHK-7 | Columns can be removed (confirm dialog) and all matches can be cleared (confirm dialog). |
| FR-CHK-8 | Ticks, lock/unlock, finish, promote, reorder, remove and clear are **optimistic** with rollback and a toast on failure (§10.3). |

### 3.7 Treasury (`FR-TRS`)

Treasury is **club-wide** (not per session). Admin and Superadmin only.

| ID | Requirement |
|----|-------------|
| FR-TRS-1 | Dashboard shows **all-time cash left** (Σ income − Σ expense of non-deleted entries) with an in/out ratio bar, **period income**, **period spent** (each with a transaction count) and **period net flow** for the current filter. |
| FR-TRS-2 | A **6-month cashflow chart** (income vs expense per month, oldest → newest, anchored on the month of the newest entry). Clicking a month filters the list to it; clicking it again clears the filter. |
| FR-TRS-3 | Filters: period preset (*All time, This month, Last month, Last 30d, Last 90d, This year, By month, Custom range*), type (*All / Income / Expense*), text search on purpose. Entries are **server-paginated** (page sizes 10 / 25 / 50, default 10), newest date first, ties by newest created. |
| FR-TRS-4 | Add entry (Admin + Superadmin): type (`EXPENSE` default / `INCOME`), amount (whole IDR, 1 – 1,000,000,000), purpose (1–200), date (`yyyy-mm-dd`, defaults to today). Buttons: **＋ Add spent**, **＋ Add income**. |
| FR-TRS-5 | **Superadmin only:** edit any field; **soft-delete** (`deletedAt`, `deletedById`). Deleted entries are excluded from every total and list. Edits record `updatedById`. |
| FR-TRS-6 | Amounts display with `Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 })` (`formatIDR`). |
| FR-TRS-7 | All sums are computed on the server (aggregate queries); the client never computes the balance. |

### 3.8 Visitor view (`FR-VIS`)

| ID | Requirement |
|----|-------------|
| FR-VIS-1 | Logged-out `/` shows a hero ("Play fair. Play more."), a card grid of **open** sessions (3 columns → 2 → 1; page size 9; a name search appears when there are more than 3 open sessions or a search is active), and an "Admin login" action in the empty state. |
| FR-VIS-2 | Opening a session shows three read-only blocks: **Courts** (each court empty or Team A vs Team B), **Queue** (ordered, "Queued" pills), **Games played** (avatar, name, count, `(+N queued)`; sorted by fewest games first, then name; players who are behind the leader are highlighted). |
| FR-VIS-3 | Data comes only from `GET /api/sessions/:id/summary` (names, ids, counts, courts, queue). Never `locked`, finished-match history or treasury. |
| FR-VIS-4 | If the session was closed or removed, a "Session unavailable" card offers "← Back to all sessions". |

### 3.9 Rendering & SEO (`FR-RND`)

| ID | Requirement |
|----|-------------|
| FR-RND-1 | UI is **client-rendered**: `app/(shell)/**/page.tsx` are thin server components that render one `"use client"` root (`MatchApp`, `TreasuryApp`, `AdminsApp`). Data is fetched in the browser with TanStack Query (§10). |
| FR-RND-2 | Server code lives in Route Handlers (`app/api/**`) and `lib/server/**`. No Server Actions; no server-rendered data. |
| FR-RND-3 | SEO is for `/` only: root metadata, Open Graph/Twitter, JSON-LD (`WebApplication`), `robots.ts`, `sitemap.ts` (only `/`), `manifest.ts`. `/treasury` and `/admins` export `robots: { index: false, follow: false }`; `robots.ts` disallows `/api/`, `/treasury`, `/admins`. |
| FR-RND-4 | While data loads, frame-first shaped skeletons (`SkeletonRegion` with `aria-busy="true"` and `SkeletonBar` / `skelCircle` inside static titles and card headers) are rendered immediately, including in `AppHeader` auth slots. |

---
## 4. Non-functional requirements

| ID | Area | Requirement |
|----|------|-------------|
| NFR-1 | Security | All server input is validated with Zod; the same schemas validate the forms in the browser. Prisma parameterised queries only; no raw SQL. |
| NFR-2 | Security | `Cache-Control: no-store` on every `/api` response; generic auth errors; unexpected errors return a generic `INTERNAL_ERROR` (details only in the server log). |
| NFR-3 | Security | Public endpoints return the minimum data. The role is re-checked from the database on **every** request (token → user, `deletedAt` null, not expired). |
| NFR-4 | Freshness | The client polls while the tab is visible: session detail every **5 s**, session summary every **10 s**, session list every **10 s**; it also refetches on window focus (`staleTime` 2 s) and after every mutation. |
| NFR-5 | Responsiveness | Court/queue/tick/lock actions are **optimistic** with rollback and a toast on failure; every action button shows an inline spinner while busy. |
| NFR-6 | Integrity | Multi-row changes (assign, edit, promote, finish, reorder, delete + queue compaction, roster replace, tick, password change, admin delete) run in **one Prisma transaction**. Unique constraints back the rules: `(sessionId, courtNumber)`, `(sessionId, seq)`, `(sessionId, nameKey)`. |
| NFR-7 | Mobile | Designed for phones at the court. Primary breakpoint `max-[860px]`; secondary `max-[960px]`, `max-[600px]`, `max-[420px]`. |
| NFR-8 | Accessibility | `aria-label` on icon buttons, `sr-only` labels, `role="status"` toast, `aria-busy` placeholders, `role="dialog"` + `aria-modal` + Esc-to-close dialogs, `aria-labelledby` ↔ heading `id` pairs on sections. |
| NFR-9 | Quality | `npm run lint`, `npx tsc --noEmit`, `npm run build` must pass; no `any`. There is **no automated test suite**; verification is manual (§16). |
| NFR-10 | Deployability | Configuration only through env vars (§14). Node runtime (required by Prisma and `cacheComponents`). Built for Vercel (`vercel-build`). |
| NFR-11 | Performance | Mobile Lighthouse (Moto G Power, Slow 4G) targets: Performance ≥ 90 on `/` and `/treasury`, CLS < 0.1, LCP ≤ 2.5 s, TBT < 200 ms. **Baseline on 2026-11-12:** `/` = 62 (CLS 0.931, LCP 3.3 s, TBT 210 ms), `/treasury` = 89 (CLS 0.009, LCP 3.3 s, TBT 130 ms). The plan to close the gap is `PERFORMANCE_PLAN.md`. |

---

## 5. Tech stack

| Layer | Choice (as in `package.json`) |
|-------|-------------------------------|
| Framework | **Next.js 16.4.3** (App Router, Turbopack, `cacheComponents: true`, `partialPrefetching: true`, `experimental.agentFeedback: true`) |
| UI | **React 19.3.0**, **Tailwind CSS v4** (via `@tailwindcss/turbopack` rule in `next.config.ts`; tokens in `@theme`) |
| Language | **TypeScript 5**, `strict`, path alias `@/*` → repo root |
| Server state | **@tanstack/react-query ^5.107** |
| UI state | **zustand ^5.1** (toast + overlay flags only) |
| Validation | **zod ^4.6** (shared client + server) |
| Database | **PostgreSQL** via **Prisma ~6.19** (`prisma-client-js`, `directUrl` set) |
| Auth | Own implementation: opaque token cookie + SHA-256 hash in DB, **bcrypt ^6** (cost 12) |
| Fonts | `next/font/google`: **DM Sans** (body), **Manrope 600/700/800** (display) |
| Analytics | `@vercel/analytics`, `@vercel/speed-insights` (mounted in root layout) |
| Tooling | ESLint 9 + `eslint-config-next` (core-web-vitals + typescript), `tsx` (seed), `server-only` |
| Hosting | Vercel (`vercel.json` disables deployments for `beta` and `feature-*` branches) |

---

## 6. Project folder structure

```
mbg-webapp-main/
├─ app/                              Routing, metadata, route handlers. Thin: no business logic.
│  ├─ layout.tsx                     Root: fonts, metadata, JSON-LD, <Analytics/>, <SpeedInsights/>, <QueryProvider>
│  ├─ globals.css                    `@import "tailwindcss"`, `@theme` tokens, element-level base styles only
│  ├─ favicon.ico · manifest.ts · robots.ts · sitemap.ts
│  ├─ (shell)/                       Route group = shared chrome (no URL segment)
│  │  ├─ layout.tsx                  Server layout: <AppHeader/>, <main>, <GlobalDialogs/>, <Toast/>, <RouteOverlayReset/>
│  │  ├─ page.tsx                    "/"          → <MatchApp/>   (indexed)
│  │  ├─ treasury/page.tsx           "/treasury"  → <TreasuryApp/> (noindex)
│  │  └─ admins/page.tsx             "/admins"    → <AdminsApp/>   (noindex)
│  └─ api/                           Route Handlers (each file = `route({ roles, body }, handler)`)
│     ├─ auth/{login,logout,me,password}/route.ts
│     ├─ admins/route.ts · admins/[id]/route.ts · admins/[id]/password/route.ts
│     ├─ sessions/route.ts
│     ├─ sessions/[id]/route.ts · …/summary · …/players · …/games · …/queue  (each /route.ts)
│     ├─ games/[id]/route.ts · …/start · …/finish · …/lock · …/players/[playerId]  (each /route.ts)
│     └─ treasury/route.ts · treasury/entries/route.ts · treasury/entries/[id]/route.ts
│
├─ components/                       "use client" UI, grouped by feature. PascalCase.tsx, named exports.
│  ├─ providers/QueryProvider.tsx    Wraps children in the shared QueryClient
│  ├─ layout/                        AppHeader · MobileDrawer · SyncStatus · GlobalDialogs · RouteOverlayReset · nav-items.ts
│  ├─ ui/                            Dialog (Dialog + ConfirmDialog) · Modal (alias re-export) · Skeleton · Toast · TablePagination
│  ├─ auth/                          LoginDialog · PasswordDialog
│  ├─ matches/                       Match feature
│  │  ├─ MatchApp.tsx                Route root (default export): chooses Internal vs External view
│  │  ├─ InternalMatchesWorkspace.tsx  Organiser view: selected session + sessions directory
│  │  ├─ ExternalMatchesView.tsx     Visitor view: open-session card grid → VisitorView
│  │  ├─ VisitorView · VisitorQueueSection · VisitorPlayersSection
│  │  ├─ CourtBoard · CourtCard (read-only variant for visitors) · QueuePanel · NextMatch · PlayerGrid
│  │  ├─ AssignDialog · HistoryDialog · RosterDialog · SessionDialog · SessionSettingsDialog
│  │  └─ admin/                      Organiser-only pieces
│  │     ├─ AdminSessionContainer · SessionView · SessionHeaderBar
│  │     ├─ SessionsDirectory · SessionsHero · SessionsTable · SessionsFilterToolbar
│  │     └─ useSessionFilters.ts · session-date-range.ts
│  ├─ treasury/                      TreasuryApp (route root) · TreasuryContent · TreasuryHero · TreasuryKpiCards ·
│  │                                 MonthlyCashflowCard · TransactionsCard · TransactionsTable · TreasuryFilterToolbar ·
│  │                                 TreasuryEntryDialog · useTreasuryFilters.ts · period.ts
│  └─ admins/                        AdminsApp (route root) · AdminsContent · AdminsTable · AdminDialog
│
├─ lib/                              Logic. Client-safe files at top level; server-only code in lib/server.
│  ├─ types.ts                       Shared TypeScript contracts (client + server)
│  ├─ schemas.ts                     Zod schemas + inferred input types (client + server, no server-only imports)
│  ├─ match.ts                       Pure fairness/court/queue logic (no React, no window)
│  ├─ api.ts                         fetch wrapper + ApiError
│  ├─ query.ts                       Shared QueryClient + typed `queryKeys`
│  ├─ auth.ts                        Client: useAuth(), login(), logout(), changePassword()
│  ├─ store.ts                       Barrel: re-exports hooks + actions from lib/data/* (+ todayISO)
│  ├─ data/                          queries.ts (useQuery hooks) · query-options.ts (shared prefetch options + mbg-boot-v1) ·
│  │                                 session-actions · match-actions · treasury-actions · admin-actions ·
│  │                                 current-session (localStorage id) · parse-names
│  ├─ stores/ui-store.ts             Zustand: toast, drawer, login/password/new-session dialog flags
│  ├─ ui.ts                          Shared Tailwind class strings (btn, pill, card, field…, cx)
│  ├─ format.ts · date.ts · initials.ts · site.ts
│  └─ server/                        `import "server-only"` — never imported by client files
│     ├─ db.ts                       Prisma singleton (globalThis)
│     ├─ http.ts                     route() wrapper, ok()/created(), CSRF guard, Zod parsing, error mapping
│     ├─ auth.ts                     Cookie/token/lockout logic + HttpError
│     ├─ password.ts                 bcrypt hash/verify
│     ├─ dto.ts                      Prisma row → DTO mappers (never return Prisma models)
│     └─ sessions.ts · games.ts · treasury.ts · admins.ts    Business rules (services)
│
├─ prisma/                           schema.prisma · seed.ts · migrations/ (init, init2 = SessionStatus) · migration_lock.toml
├─ public/                           logo.jpg (header, icons, OG image); default create-next-app SVGs (unused)
├─ AGENTS.md · README.md (create-next-app boilerplate) · SRD.md · PERFORMANCE_PLAN.md · REFACTOR_PLAN.md · REFACTOR_NOTES.md
└─ next.config.ts · tsconfig.json · eslint.config.mjs · package.json · vercel.json · .env.example · .gitignore
```

**Dependency direction** (never import against the arrows):

```
app/**/page.tsx ──► components/<feature> ──► lib/store.ts, lib/auth.ts, lib/stores/*, lib/ui.ts, lib/match.ts
                                                  │
                                                  ▼
                                           lib/data/* ──► lib/api.ts, lib/query.ts ──► (HTTP) ──► app/api/**/route.ts
                                                                                                    │
                                                                           lib/server/http.ts ◄─────┘ (route wrapper)
                                                                                    │
                                                              lib/server/{sessions,games,treasury,admins,auth}.ts
                                                                                    │
                                                                      lib/server/dto.ts + lib/server/db.ts (Prisma)
```

`lib/types.ts` and `lib/schemas.ts` are imported from both sides.

---

## 7. Data model (Prisma, PostgreSQL)

Names mirror the TypeScript types (`Session`, `Player`, `Game`). The login-token table is `AuthToken` to avoid confusion with a badminton `Session`.

```prisma
generator client { provider = "prisma-client-js" }

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")     // pooled URL used at runtime
  directUrl = env("DIRECT_URL")       // direct URL used by migrations
}

enum Role          { SUPERADMIN ADMIN }
enum SessionStatus { OPEN CLOSED }
enum GameStatus    { QUEUED ON_COURT DONE }
enum TeamSide      { A B }
enum EntryType     { INCOME EXPENSE }

model User {
  id             String      @id @default(cuid())
  username       String      @unique                 // stored lowercase
  passwordHash   String
  role           Role        @default(ADMIN)
  failedAttempts Int         @default(0)
  lockedUntil    DateTime?
  deletedAt      DateTime?                            // soft delete
  createdById    String?                              // audit only, not an FK
  createdAt      DateTime    @default(now())
  updatedAt      DateTime    @updatedAt
  tokens         AuthToken[]
}

model AuthToken {
  id        String   @id @default(cuid())
  userId    String
  tokenHash String   @unique                          // sha-256 hex of the cookie value
  expiresAt DateTime
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([userId])
}

model Session {
  id          String        @id @default(cuid())
  name        String
  date        DateTime      @db.Date
  courtCount  Int           @default(1)
  status      SessionStatus @default(OPEN)            // CLOSED = organisers only
  createdById String?
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt
  players     Player[]
  games       Game[]
  @@index([date])
  @@index([status, date])
}

model Player {
  id        String       @id @default(cuid())
  sessionId String
  name      String
  nameKey   String                                    // lowercased name → uniqueness
  position  Int                                       // roster order
  session   Session      @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  games     GamePlayer[]
  @@unique([sessionId, nameKey])
}

model Game {
  id          String       @id @default(cuid())
  sessionId   String
  seq         Int                                     // creation order within the session
  status      GameStatus
  courtNumber Int?                                    // only while ON_COURT
  queueOrder  Int?                                    // only while QUEUED
  locked      Boolean      @default(false)
  createdAt   DateTime     @default(now())
  startedAt   DateTime?
  finishedAt  DateTime?
  session     Session      @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  players     GamePlayer[]
  @@unique([sessionId, seq])
  @@unique([sessionId, courtNumber])                  // NULLs are distinct in PostgreSQL → one match per court
  @@index([sessionId, status])
}

model GamePlayer {                                    // one row = "ticked" in the checklist
  gameId   String
  playerId String
  team     TeamSide?                                  // null once ticks are edited by hand
  game     Game   @relation(fields: [gameId], references: [id], onDelete: Cascade)
  player   Player @relation(fields: [playerId], references: [id], onDelete: Cascade)
  @@id([gameId, playerId])
}

model TreasuryEntry {
  id          String    @id @default(cuid())
  type        EntryType @default(EXPENSE)
  amount      Int                                     // whole IDR, > 0
  purpose     String
  date        DateTime  @db.Date
  createdById String
  updatedById String?
  deletedById String?
  deletedAt   DateTime?                               // soft delete
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  @@index([date])
}
```

Migrations: `20261108151400_init` (full schema) and `20261110022640_init2` (adds `SessionStatus`, `Session.status`, index `(status, date)`).

### Derived rules the schema relies on

- **Games played** = `COUNT(GamePlayer)` per player in the session (any game status). **Queued** = those whose game is `QUEUED`.
- **Teams** of a game come from `GamePlayer.team`; if any row has `team = null` the match has no team info (`teams` is omitted in the DTO).
- **Court occupancy** = a `Game` with `status = ON_COURT` and `courtNumber = n`. On finish `courtNumber` becomes `null`, which keeps the unique constraint simple.
- **Balance** = Σ `amount` of `INCOME` − Σ of `EXPENSE`, both with `deletedAt IS NULL`.

---

## 8. Shared types & validation schemas

### 8.1 Types (`lib/types.ts`)

| Type | Notes |
|------|-------|
| `Role`, `SessionStatus`, `GameStatus`, `EntryType` | String unions matching the Prisma enums |
| `AuthUser { id, username, role }` · `AdminUser { …, createdAt, deletedAt }` | Dates are ISO strings |
| `Player { id, name }` · `Team = [string, string]` | Team = two player ids |
| `Game` | `playerIds`, optional `teams: [Team, Team]`, `createdAt/startedAt/finishedAt` (epoch ms), `status`, `courtNumber?` (ON_COURT only), `queueOrder?` (QUEUED only), `locked` |
| `Session` | Organiser payload: `id, name, date (yyyy-mm-dd), courtCount, status, players, games` (games ordered by `seq`) |
| `SessionListItem` · `SessionsFilterParams` · `SessionsPage` | List row (+ `playerCount`, `gameCount`), filters, and `{ sessions, totalSessions, openCount, closedCount, page, pageSize, totalPages }` |
| `PublicGame` · `SessionSummary` | Visitor payload: courts + queue + `players[{ id, name, count, queued }]` (`count` includes queued) |
| `TreasuryEntry` · `TreasuryMonthlyBucket` · `TreasuryFilterParams` · `TreasurySummary` | Summary holds all-time and period totals, `monthly[]`, the page of `entries`, and pagination |

### 8.2 Zod schemas (`lib/schemas.ts`)

| Schema | Rules |
|--------|-------|
| `usernameSchema` | trim, lowercase, `/^[a-z0-9_.-]{3,32}$/` |
| `passwordSchema` | min 10 chars, ≤ 72 bytes (UTF-8) |
| `isoDate` | `/^\d{4}-\d{2}-\d{2}$/` |
| `loginSchema` | `username`, `password` (1–72) |
| `changePasswordInput` | `currentPassword` (1–72), `newPassword` (`passwordSchema`) |
| `adminCreateInput` · `adminPasswordInput` | username + password · password |
| `sessionInput` | `name` 1–60, `date`, `courtCount` int 1–8, `status` (`OPEN` default), `names[]` ≤ 60 items of 1–40 chars |
| `sessionPatchInput` | all of name/date/courtCount/status optional, at least one required |
| `rosterInput` | `{ names }` (same rule as `sessionInput.names`) |
| `teamsSchema` | `[[id,id],[id,id]]`, all four distinct |
| `assignInput` | `target` = `{ type: "court", courtNumber 1–8 }` \| `{ type: "queue" }`, plus `teams` |
| `gameUpdateInput` | `{ teams }` |
| `tickInput` · `lockInput` | `{ checked }` · `{ locked }` |
| `startInput` | `{ courtNumber 1–8 }` |
| `queueOrderInput` | `{ gameIds: string[] }` |
| `treasuryInput` | `type` (`EXPENSE` default), `amount` int 1–1,000,000,000, `purpose` 1–200, `date` |
| `treasuryPatchInput` | all optional, at least one required |

Every schema has an exported `z.infer` type (`LoginInput`, `SessionInput`, `AssignInput`, …) next to it.

---

## 9. API specification

Base `/api`. JSON in and out. Every response carries `Cache-Control: no-store`. Roles: **P** public, **A** Admin or Superadmin, **S** Superadmin only.

**Success shapes are wrapped objects**, not bare values: `{ user }`, `{ session }`, `{ summary }`, `{ game }`, `{ entry }`, `{ admins }`, `{ admin }`, `{ ok: true }`; list endpoints `GET /sessions` and `GET /treasury` return their page objects directly.

**Error shape (always):**

```json
{ "error": { "code": "GAME_LOCKED", "message": "This match is locked. Unlock it first.", "fields": { "name": "Required" } } }
```

| HTTP | Codes |
|------|-------|
| 400 | `VALIDATION` (Zod failure or rule such as "player not in roster", "court does not exist"; `fields` from the first issue per path) |
| 401 | `UNAUTHENTICATED` |
| 403 | `FORBIDDEN` (role, CSRF guard, deleting self/superadmin), `SESSION_CLOSED` |
| 404 | `NOT_FOUND` |
| 409 | `GAME_LOCKED`, `PLAYER_BUSY`, `COURT_OCCUPIED`, `NAME_TAKEN`, `INVALID_STATE` |
| 429 | `TOO_MANY_ATTEMPTS` |
| 500 | `INTERNAL_ERROR` (generic message) |

| Method & path | Role | Body / query → response |
|---------------|:----:|-------------------------|
| `POST /auth/login` | P | `loginSchema` → sets cookie, `{ user }` |
| `POST /auth/logout` | P | → `{ ok }`; deletes token, clears cookie |
| `GET /auth/me` | P | → `{ user \| null }` |
| `POST /auth/password` | A | `changePasswordInput` → `{ ok }` |
| `GET /admins` | S | → `{ admins }` (incl. soft-deleted) |
| `POST /admins` | S | `adminCreateInput` → 201 `{ admin }` |
| `DELETE /admins/:id` | S | soft delete + revoke tokens → `{ ok }` |
| `PUT /admins/:id/password` | S | `adminPasswordInput` → `{ ok }` |
| `GET /sessions` | P | query `from,to,status,q,page,pageSize` → `SessionsPage` (visitors: open only) |
| `POST /sessions` | S | `sessionInput` → 201 `{ session }` |
| `GET /sessions/:id` | A | → `{ session }` (full) |
| `PATCH /sessions/:id` | A | `sessionPatchInput` → `{ session }`; non-status fields need S (else 403) |
| `DELETE /sessions/:id` | S | cascade → `{ ok }` |
| `GET /sessions/:id/summary` | P | → `{ summary }`; closed + visitor → 403 `SESSION_CLOSED` |
| `PUT /sessions/:id/players` | S | `rosterInput` (diff by name, one transaction) → `{ session }` |
| `POST /sessions/:id/games` | A | `assignInput` → 201 `{ game }` (locked on creation) |
| `DELETE /sessions/:id/games` | A | clear all matches → `{ ok }` |
| `PUT /sessions/:id/queue` | A | `queueOrderInput` → `{ session }` |
| `PATCH /games/:id` | A | `gameUpdateInput` → `{ game }` |
| `DELETE /games/:id` | A | → `{ ok }` (queue compacts) |
| `POST /games/:id/start` | A | `startInput` → `{ game }` (QUEUED → ON_COURT) |
| `POST /games/:id/finish` | A | → `{ game }` (ON_COURT → DONE) |
| `PUT /games/:id/players/:playerId` | A | `tickInput` → `{ game }`; 409 if locked; locks at exactly 4 |
| `PUT /games/:id/lock` | A | `lockInput` → `{ game }` |
| `GET /treasury` | A | query `from,to,type,q,page,pageSize` → `TreasurySummary` |
| `POST /treasury/entries` | A | `treasuryInput` → 201 `{ entry }` |
| `PATCH /treasury/entries/:id` | S | `treasuryPatchInput` → `{ entry }` |
| `DELETE /treasury/entries/:id` | S | soft delete → `{ ok }` |

**How `route()` runs (`lib/server/http.ts`):** `await connection()` (so Next never tries to prerender the handler under `cacheComponents`) → CSRF guard → resolve user from cookie → role check (`roles` is mandatory; `"public"` must be explicit) → parse body with Zod (400 on failure) → handler → map `HttpError` / unknown errors to the error shape.

---
## 10. Client architecture & data flow

### 10.1 Render pipeline

```
app/layout.tsx (server)            html, fonts, metadata, JSON-LD, Analytics, SpeedInsights
 └─ <QueryProvider>                shared QueryClient (lib/query.ts)
     └─ app/(shell)/layout.tsx     server layout
         ├─ <AppHeader/>           client; reads useAuth(), pathname, Zustand drawer state
         ├─ <main>{page}</main>    page → one "use client" root (MatchApp | TreasuryApp | AdminsApp)
         ├─ <GlobalDialogs/>       Login / Password / New-session dialogs (Zustand flags)
         ├─ <Toast/>               role="status"; text from Zustand
         └─ <RouteOverlayReset/>   closes drawer/dialogs on route change
```

Because screens render static hero frames and shaped skeletons (`SkeletonRegion`) immediately during `authLoading`, users see meaningful layout and headings in initial SSR HTML while `QueryProvider` prefetches `/api/auth/me` and the likely home query in parallel on client module load.

### 10.2 Loading gates

| Screen | Gate sequence |
|--------|---------------|
| `MatchApp`, `TreasuryApp`, `AdminsApp` | `authLoading` → frame-first screen skeleton (`MatchesSkeleton`, `TreasuryHero` + `TreasurySkeleton`, Admins hero + `AdminsSkeleton`). No top-level `useHydrated()` block; `useCurrentSessionId()` reads `localStorage` via `useSyncExternalStore` with server snapshot `""`. |
| `ExternalMatchesView` | `useSessionsList` runs first, then `currentSessionId` → `VisitorView`. Renders hero frame immediately and `ExternalMatchesSkeleton` below while `loading && !data`. |
| `VisitorView` | `loading` → `VisitorViewSkeleton`; `error \|\| !summary` → "Session unavailable" card. |
| `InternalMatchesWorkspace` | Mounts `AdminSessionContainer` (if a session is selected) **and** `SessionsDirectory` at the same time; each renders its own shaped skeleton (`SessionViewSkeleton`, `SessionsDirectorySkeleton`). |
| `AdminSessionContainer` | `loading` → `SessionViewSkeleton`; `error \|\| !session` → "Session not found" card. |
| `SessionsDirectory` | `loading && !data` → `SessionsDirectorySkeleton`. |
| `TreasuryContent` | Renders `TreasuryHero` continuously; `loading && !treasury` → `TreasurySkeleton`. |
| `AdminsContent` | Renders Admin accounts hero continuously; `loading \|\| !admins` → `AdminsSkeleton`. |
| `AppHeader` | While `loading`, renders fixed-size skeleton pills (`data-skeleton`) in desktop and mobile auth control slots to prevent header pop / CLS. |

Hooks always stay above early returns in the same component; filter state is owned by the component that calls the query hook.

### 10.3 Server state (TanStack Query)

`queryClient` defaults: `retry: 1`, `staleTime: 2_000`, `refetchOnWindowFocus: true`. Keys come from `queryKeys` in `lib/query.ts`.

| Hook (in `lib/data/queries.ts` / `lib/auth.ts`) | Key | Endpoint | Polling | Notes |
|------|-----|----------|---------|-------|
| `useAuth()` | `["auth","me"]` | `GET /auth/me` | none | `loading = isPending` |
| `useSessionsList(params, pollMs = 10s)` | `["sessions","list",params]` | `GET /sessions` | 10 s | `keepPreviousData` |
| `useSessionSummary(id)` | `["sessions","summary",id]` | `GET /sessions/:id/summary` | 10 s | enabled when `id` set |
| `useSessionDetail(id)` | `["sessions","detail",id]` | `GET /sessions/:id` | 5 s | organisers only |
| `useTreasury(params)` | `["treasury","summary",params]` | `GET /treasury` | none | `keepPreviousData` |
| `useAdmins()` | `["admins","list"]` | `GET /admins` | none | superadmin |

All polling uses `refetchIntervalInBackground: false` (paused when the tab is hidden).

### 10.4 Mutations

Actions live in `lib/data/*-actions.ts` and are re-exported by the `lib/store.ts` barrel. Components call actions, never `fetch`.

- **Optimistic with rollback** (`match-actions.ts`): `startQueuedMatch`, `finishMatch`, `reorderQueue`, `removeGame`, `clearGames`, `setPlayed`, `setGameLocked`. Pattern: `cancelQueries` → snapshot `prevSession` → `setQueryData` optimistic → `api()` → write server result → `invalidateQueries` (detail/summary) → on error restore snapshot, invalidate, **rethrow** (the component shows a toast).
- **Server-result writes** (not optimistic): `assignMatch`, `updateMatchPlayers`, session create/update/roster, treasury and admin actions. Pattern: `api()` → `setQueryData` or `invalidateQueries`.
- `login()` sets `["auth","me"]` and invalidates `["sessions"]`; `logout()` clears auth, removes session-detail/treasury/admins queries and invalidates `["sessions"]`.
- The five busy/loading flags in a screen (`finishingGameId`, `movingGameId`, …) are local `useState`; buttons show the `spinner` class while busy.

### 10.5 UI state ownership

| State | Where |
|-------|-------|
| Server data (sessions, games, treasury, admins, auth user) | TanStack Query only |
| Toast text, mobile drawer, login / password / new-session dialog flags | Zustand `lib/stores/ui-store.ts` (`useUiStore`, `useToast()`); toast clears after 2600 ms |
| Selected session id | `localStorage["mbg-current-v2"]` via `lib/data/current-session.ts` (`useSyncExternalStore`, cross-tab `storage` event, server snapshot `""`) |
| Boot prefetch hint | `localStorage["mbg-boot-v1"]` via `lib/data/query-options.ts` (`{ role: "organiser" \| "visitor" }`, updated on auth settle/login, cleared on logout) |
| Filters, pagination, page size | `useSessionFilters`, `useTreasuryFilters`, and local `useState` in `ExternalMatchesView` |
| Screen-local dialogs and busy flags | `useState` in the screen (`SessionView`, `PlayerGrid`, …) |

Zustand is for UI state only. Server data never goes into Zustand.

---

## 11. UI specification

### 11.1 Routes

| Route | Root component | Audience | Indexing |
|-------|----------------|----------|----------|
| `/` | `MatchApp` | Everyone; content depends on role | indexed |
| `/treasury` | `TreasuryApp` | Organisers (visitors see "Please log in to view treasury" + Admin login button) | `noindex` |
| `/admins` | `AdminsApp` | Superadmin (others see "Not allowed" + Back to matches) | `noindex` |

### 11.2 Header and navigation (`AppHeader`, `MobileDrawer`)

- Left: logo (`next/image`, priority) + "Minggu Badminton Guys / FAIR MATCH PLANNER", linking to `/`.
- **Desktop (> 860 px):** sync status ("Live" dot / "Syncing…" spinner from `useIsFetching`). Logged out → "Admin login" (and "← Back to matches" outside `/`). Logged in → nav links *Matches, Treasury, Admins (superadmin)*, username + role pill, **Password**, **＋ New session** (superadmin, on `/` only), **Log out**.
- **Tablet/phone (≤ 860 px):** compact bar with **＋ New** (superadmin on `/`) and **☰ Menu**, which opens a right-side drawer (`MobileDrawer`) with sync status, profile card, nav links, quick actions and Log out. Closes on backdrop click, `Esc`, or route change.

### 11.3 `/` for visitors

1. Hero ("Live match day" / "Play fair. Play more.") with open-session count pill and "Syncing…" indicator.
2. Optional name search (shown when > 3 open sessions or a search is active).
3. Card grid of open sessions (date, name, courts/players/matches counters, "View session →"); pager when > 9.
4. Selecting a card shows `VisitorView`: header (date, Open/Closed pill, name, "← All sessions"), **Courts**, **Queue**, **Games played** (§3.8).

### 11.4 `/` for organisers (`InternalMatchesWorkspace`)

Top to bottom:

1. **Selected session** (if any) — `SessionView`:
   1. `SessionHeaderBar`: date + status pill, session name (h1), *← All sessions*, *Close/Reopen session*, *History · n*; **superadmin only:** *Edit players*, *Session settings*, *Delete*.
   2. **Courts** (`CourtBoard`): `CourtCard` grid (2 cols, 1 on mobile). Occupied: Court N, Team A vs Team B, "Playing since hh:mm", *Edit players*, *✓ Finish match*. Empty (dashed): *＋ Assign players* and *▶ Play next in queue* when the queue has items.
   2. **Queue** (`QueuePanel`): ordered list with "Queued" pill, ▲ ▼, Edit, ✕ (confirm), *＋ Add to queue*.
   3. Two-column area (1.7fr / 1fr; stacked on mobile): **Games played** (`PlayerGrid`, left) and **Next match** (`NextMatch`, right, sticky on desktop; first on mobile) with *Shuffle*, *Assign to court*, *Add to queue*, and the waiting list.
2. **Sessions directory** (`SessionsDirectory`): hero (only when no session is selected), card with open/closed pills, filter toolbar (period: all / this month / last 30 days / this year / custom; status; name search), table (open, close/reopen, delete for superadmin), pagination (5 / 10 / 25 / 50 rows).

### 11.5 `/treasury`

`TreasuryHero` (eyebrow "Club treasury", all-time cash left, **＋ Add income**, **＋ Add spent**) → `TreasuryKpiCards` (all-time cash left with In/Out ratio bar; period income; period spent; period net) → `MonthlyCashflowCard` (6-month chart, click a month to filter) → `TransactionsCard` (filter toolbar, `TransactionsTable` with date, purpose, type, amount, added by, and superadmin Edit/Delete; pagination 10 / 25 / 50). Soft delete asks for confirmation.

### 11.6 `/admins`

Hero ("Superadmin" / "Admin accounts", **＋ Add admin**) and an "Organisers" card with `AdminsTable` (username, role, status, created, reset password / delete). Dialog for create and for password reset. Self and superadmin rows cannot be deleted.

### 11.7 Dialogs

All use `components/ui/Dialog.tsx` (`Dialog`, `ConfirmDialog`; `Modal` is an unused alias). Footer = **Cancel** (`btn("light")`) then primary action (`btn("primary")`), both inside `modalActions`. Esc and backdrop close.

| Dialog | Opened from | Roles |
|--------|-------------|-------|
| `LoginDialog` ("Admin login") | header, visitor empty state, treasury gate | everyone |
| `PasswordDialog` ("Change password") | header / drawer | organisers |
| `SessionDialog` ("New game session": name, date, courts, status, players text) | header "＋ New session" via `GlobalDialogs` | superadmin |
| `SessionSettingsDialog` (name, date, courts, open/closed) | `SessionHeaderBar` | superadmin |
| `RosterDialog` ("Edit players") | `SessionHeaderBar` | superadmin |
| `AssignDialog` (court picker or queue, Team A/B selects, "use recommendation", busy hints; also edits a match) | CourtBoard, QueuePanel, NextMatch | organisers |
| `HistoryDialog` ("Match history", newest first; status pill, court, lock info, remove) | `SessionHeaderBar` | organisers |
| `TreasuryEntryDialog` (type, amount, purpose, date; add or edit) | Treasury hero / table | add: organisers; edit: superadmin |
| `AdminDialog` (create admin / reset password) | `/admins` | superadmin |
| `ConfirmDialog` (remove queued match, delete session, remove game, clear all, delete treasury entry, delete admin) | various | as the action |

---

## 12. Business rules & edge cases

| Situation | Rule |
|-----------|------|
| Assign to an occupied court | 409 `COURT_OCCUPIED` |
| Assign / promote / edit-on-court with a player already on another court | 409 `PLAYER_BUSY` (not checked when adding to the queue) |
| Court number above the session's `courtCount` | 400 `VALIDATION` |
| Edit players of an on-court match | Allowed; busy check ignores the match being edited; match re-locks |
| Tick change on a locked match | 409 `GAME_LOCKED` |
| Manual tick leaves 4 ticks / any other count | Auto-locks / stays or becomes unlocked |
| Promote a match that is not queued | 409 `INVALID_STATE` |
| Finish a match that is not on court | 409 `INVALID_STATE` |
| Reorder queue without all queued ids exactly once | 400 `VALIDATION` |
| Roster edit removes a player | Ticks vanish; every game they were in is unlocked and its `team` cleared |
| Court count lowered below an occupied court | 409 `COURT_OCCUPIED` |
| Delete a queued match | Queue order compacts to 1…n |
| Finish match | `DONE`, `finishedAt`, `courtNumber = null`; ticks and lock unchanged |
| Visitor opens a closed session by id | 403 `SESSION_CLOSED`; UI shows "Session unavailable" |
| Soft-deleted admin with a live cookie | Next request fails (`deletedAt` checked each request) → treated as logged out |
| Delete yourself or a superadmin | 403 `FORBIDDEN` |
| Treasury entry soft-deleted | Hidden from list, chart and all totals; kept in DB |
| Two organisers act at once | Ticks are idempotent; assignments are validated inside a transaction; the loser gets a 409 and the UI refetches |

---
## 13. Coding rules

These rules describe what the code **actually does today**. When in doubt, copy the nearest existing file.

### 13.0 First rule for this repo

`AGENTS.md` says this is **not the Next.js you know**. Before writing Next-specific code, read the matching page in `node_modules/next/dist/docs/`. Facts already applied here:

- Route Handler `params` is a **Promise** (`await params`). `LayoutProps<"/">` is a global typed helper.
- With `cacheComponents: true`, `runtime` / `dynamic` route-segment exports are not used, and Route Handlers that do not read request-time APIs must `await connection()`. `route()` does this for every handler.
- Reading `cookies()` or other request data in a Server Component requires a `<Suspense>` boundary (build error otherwise).
- `middleware` is now called `proxy` (none exists in this repo).
- Do not remove the auto-managed blocks in `AGENTS.md`; commit the file as it is.

### 13.1 Formatting & syntax

- Double quotes, semicolons, 2-space indent, trailing commas in multi-line literals, ~90–100 column soft wrap. Prettier is **not installed**; match the surrounding file.
- `const` by default, no `var`, **no `any`** (`eslint-config-next/typescript`).
- Function **declarations** for components and exported actions; arrow functions only for tiny pure helpers/constants (`const cx = …`, `const fmtDate = …`).
- Early returns over nested `if`. Section dividers in long files: `/* ---- buttons ---- */`.
- Empty `catch {}` only where failure is truly ignorable (e.g. `JSON.parse` of an error body in `api.ts`).

### 13.2 Files, folders, naming, imports

- Components: `components/<feature>/PascalCase.tsx`, one main component per file, **named export**. `export default` only for route roots (`MatchApp`, `TreasuryApp`, `AdminsApp`) and Next special files.
- A helper used by one file stays in that file; promote it to its own file when reused. Feature-only hooks sit next to the feature (`useSessionFilters.ts`, `useTreasuryFilters.ts`); pure feature helpers likewise (`period.ts`, `session-date-range.ts`).
- Lib files are lowercase, short (`match.ts`, `format.ts`); domain code goes in `lib/data/<domain>-actions.ts`. Server-only code goes in `lib/server/` and starts with `import "server-only";`.
- Hooks start with `use`; actions are verbs (`assignMatch`, `finishMatch`); booleans read as state (`creating`, `showHistory`); callbacks are `onX` (`onClose`, `onSaved`).
- Use the `@/` alias for anything outside the same folder; `./Name` for siblings in the same folder, `../Name` for the parent feature folder. Use `import type` for type-only imports.
- Typical import order: `react` → `next/*` → `@/components/*` → `@/lib/*` values → `import type` from `@/lib/types` → relative siblings.
- New query → `lib/data/queries.ts` + a key in `lib/query.ts`. New action → `lib/data/<domain>-actions.ts` and re-export through `lib/store.ts`.

### 13.3 Components

- Every client component file starts with `"use client";`. `app/**/page.tsx`, `layout.tsx`, `route.ts` do **not**.
- Props are typed **inline in the signature** and destructured.
- Keep state local and minimal; derive instead of store (`useMemo` for `rec`, `queue`).
- Hooks stay above any early return; filter state lives in the component that calls the query hook.
- Dialogs use `Dialog` / `ConfirmDialog` from `components/ui/Dialog.tsx`; never `window.confirm`, `alert` or `prompt`. Forms use `<form onSubmit>` with `e.preventDefault()` and validate with the shared Zod schema (`safeParse` → inline `errorNotice`).
- Toasts: call `useToast()` and `showToast(msg)`. No local toast state, no toast library.
- Async actions: set a busy flag, `try { await action() } catch (err) { showToast(err instanceof Error ? err.message : "…") } finally { clear busy }`, and show the `spinner` class on the button.
- Give key buttons/inputs a kebab-case DOM `id` and **never rename existing ones**: `new-session`, `logout-btn`, `admin-login-btn`, `mobile-menu-btn`, `match-history`, `edit-players`, `session-settings`, `session-status`, `shuffle`, `add-to-queue`, `assign-court`, `confirm-assign`, `queue-add-btn`, `treasury-add`, `treasury-add-income`, `treasury-submit`, `add-admin-btn`, `login-submit`, `save-roster`, `save-settings`, `save-password`, and the matching `aria-labelledby` ↔ title-`id` pairs (`courts-title`, `queue-title`, `grid-title`, `entries-title`, …).
- Icon-only buttons need `aria-label`. Inputs use a wrapping `<label>` with `fieldLabel`, or `sr-only` text.
- Copy: English, sentence case; `＋` (full-width plus) for add actions, `·` as separator, `…` for in-progress, curly quotes “ ”, `&apos;` in JSX, arrows `←` `→`, `▶` `✓` `▲` `▼` as in existing buttons.
- Loading placeholders: use `aria-busy="true"` and never leave a screen blank. Today this is `shimmerCard`; new loading UI should follow the frame-first approach in `PERFORMANCE_PLAN.md` (skeleton shaped like the final layout, same dimensions, so nothing shifts when data arrives).

### 13.4 Styling

- **Tailwind utility classes only**, in `className`. No CSS modules, no new global CSS. `globals.css` stays "element-level defaults + `@theme` tokens + keyframes".
- Reusable class strings live in **`lib/ui.ts`** (`btn(variant, size)`, `pill(variant)`, `card`, `cardHead`, `fieldInput`, `courtCard`, `lockedHead`, `shimmerCard`, …). If a class string appears a third time, move it there. Conditional classes use `cx(...)`.
- Colours: existing palette (`#204a74` ink, `#5da5e4` accent, `#eaf5ff` surface, `#b5524f` danger) or theme tokens (`text-ink`, `text-muted`, `warn`, `ok`, `shadow-card`, `animate-shimmer`). A new colour is introduced as a `@theme` token, not a one-off hex, unless it matches an existing literal.
- Responsive: primary breakpoint `max-[860px]:`; secondary `max-[960px]`, `max-[600px]`, `max-[420px]`. Card spacing literals follow the pattern `px-[22px] max-[860px]:px-[15px]`.
- Fonts: `font-display` (Manrope) for headings and numbers, default sans (DM Sans) for body.
- Locked column: `lockedHead` tint, lock glyph, `disabled:cursor-not-allowed` checkboxes.

### 13.5 State, data & logic separation

- **Pure logic in `lib/*.ts`** (no React, no `window`, deterministic): `lib/match.ts`, `lib/format.ts`, `lib/date.ts`. New court/queue/fairness helpers go in `lib/match.ts` and take a `Session`.
- **UI never calls `fetch`.** It calls actions/hooks from `@/lib/store` (data) and `@/lib/auth` (auth). `fetch` exists only in `lib/api.ts`.
- Server data → TanStack Query. UI-only state → Zustand `ui-store`. Per-device preference → the `current-session` module. Never mirror server data into Zustand or `useState`.
- Dates are **`yyyy-mm-dd` strings** end to end on the client (`todayISO()`, `fmtDate` with the `T12:00:00` trick); timestamps are epoch ms only where a time is displayed. IDs are opaque server strings.
- Polling intervals, query keys and optimistic updates are centralised (`lib/data/queries.ts`, `lib/query.ts`, `lib/data/match-actions.ts`); do not scatter them into components.

### 13.6 Types & comments

- `interface` for object shapes, `type` for unions/tuples/aliases. Types shared by client and server live in `lib/types.ts`; inferred Zod types live next to the schema in `lib/schemas.ts`.
- Doc-comment **why**, not what, on non-obvious fields (`/** Only set when … */`). Short plain-English block comment above non-obvious functions (`recommend`, `replaceSessionRoster`). No commented-out code; no TODO without an owner or issue.

### 13.7 Server code

- Layers: **route handler (thin)** → **service** (`lib/server/{sessions,games,treasury,admins,auth}.ts`) → **Prisma**. Handlers only declare `route({ roles, body }, handler)`, call one service, and return `ok()` / `created()`. Business rules live in services.
- Every handler uses `route()` from `lib/server/http.ts`. `roles` is mandatory (`"public"` must be explicit). Throw `new HttpError(status, "CODE", "message", fields?)`; never hand-build error JSON.
- One Prisma client (`lib/server/db.ts`, `globalThis` singleton). Multi-step writes use `prisma.$transaction`; retry once on a `P2002` unique race when allocating `seq`.
- Map Prisma rows to DTOs in `lib/server/dto.ts`; never return Prisma models (no `passwordHash`, audit ids).
- No raw SQL. Secrets only from `process.env`; never log bodies, passwords or tokens.
- Passwords: `bcrypt` cost 12, ≤ 72 bytes. Tokens: random 32 bytes base64url, store only SHA-256.
- Soft delete (`deletedAt`) for users and treasury entries; filter `deletedAt: null` in every read.

### 13.8 Validation (Zod)

- One schema = one source of truth in `lib/schemas.ts`, used by the form and the route handler. Trim/normalise in the schema, not in components.
- Never trust client-derived values: counts, balances, roles, `locked`, `status` are computed server-side.
- Error `fields` in API responses are the first message per issue path.

### 13.9 Checklist for every new route

1. `app/(shell)/<route>/page.tsx` is a server component that renders one client root. Private pages export `robots: { index: false, follow: false }` and are added to `robots.ts` `disallow`.
2. Add the nav entry in `components/layout/nav-items.ts` (`superadminOnly` if needed).
3. Every new API route has `roles`, a Zod schema for any input, returns a DTO, and has been exercised for 401 / 403 / 400 / 409 (curl or the UI).
4. Never put tokens, passwords or role decisions in `localStorage`, URLs or response bodies.

### 13.10 Quality gates & git

- Before every commit run, in order: `npx tsc --noEmit`, `npm run lint`, `npm run build`. There is no test suite, so also click through the manual checks in §16 for the area you touched.
- Small commits, format `feat(courts): assign match to court`, `fix(auth): …`, `chore(db): …`, `refactor(ui): …`, `perf(load): …`.
- Commit `prisma/migrations/**`, `AGENTS.md`, `.env.example`. Never commit `.env*` (except `.env.example`) or `*.tsbuildinfo`.

---

## 14. Environment, scripts & deployment

| Env var | Purpose |
|---------|---------|
| `DATABASE_URL` | Runtime connection string (use the **pooled** URL on serverless) |
| `DIRECT_URL` | Direct connection used by Prisma migrations (required because `schema.prisma` sets `directUrl`) — **missing from `.env.example`**, see §15 |
| `SUPERADMIN_USERNAME`, `SUPERADMIN_PASSWORD` | Used only by the seed script |

| Script | Does |
|--------|------|
| `npm run dev` / `build` / `start` / `lint` | Standard Next.js |
| `npm run db:migrate` | `prisma migrate dev` |
| `npm run db:seed` | `tsx prisma/seed.ts`: upserts the superadmin by username; **resets its password to the env value**, re-sets role `SUPERADMIN`, clears `deletedAt` and lockout, so re-running it is a password reset |
| `npm run db:studio` | Prisma Studio |
| `npm run vercel-build` | `prisma generate`, then `prisma migrate deploy` **only when `VERCEL_ENV=production`**, then `next build` |
| `postinstall` | `prisma generate` |

Setup: copy `.env.example` → `.env`, fill the four variables, `npm install`, `npm run db:migrate`, `npm run db:seed`, `npm run dev`. After the first production deploy, run the seed once and change the superadmin password from the UI.

---

## 15. Known deviations, tech debt & open items

Status after comparing the code to the previous SRD, `REFACTOR_NOTES.md`, and the 2026-11-12 Lighthouse reports.

**Performance (see `PERFORMANCE_PLAN.md`)**

| # | Finding |
|---|---------|
| P1 | Prerendered HTML = header + one generic 320 px shimmer card. The shimmer gradient is white→near-white on a white card, so it reads as a blank card. |
| P2 | `/` for organisers shows two stacked shimmers (`AdminSessionContainer` + `SessionsDirectory`) that resolve at different times → CLS 0.931. |
| P3 | `AppHeader` ignores `authLoading`, so the logged-out "Admin login" shows first, then swaps to the organiser controls. |
| P4 | Request waterfall: HTML → JS → hydrate → `/api/auth/me` → data requests. |
| P5 | Zod (~39 KiB gzip) and all dialog code ship in the initial JS of every route, because `GlobalDialogs` (in the shell layout) and `SessionView` import dialogs statically. |
| P6 | `getTreasurySummary` reads **every** active entry to build the 6-month chart (unbounded). |

**Correctness / security observations (none blocking)**

| # | Finding | Severity |
|---|---------|----------|
| C1 | `429 TOO_MANY_ATTEMPTS` is only returned for existing active accounts, so it reveals that a username exists (FR-AUTH-6 intent is a uniform response). | Low |
| C2 | `PATCH /games/:id` does not check match status; the API can edit a `DONE` match (the UI never offers it). | Low |
| C3 | `PUT /admins/:id/password` does not restrict the target role to `ADMIN`; a superadmin could reset another superadmin. | Low |
| C4 | `.env.example` lacks `DIRECT_URL`, which `schema.prisma` requires for migrations. | Docs |
| C5 | Re-running `db:seed` silently resets the superadmin password. | Ops note |
| C6 | Root layout sets `alternates.canonical: "/"`, which `/treasury` and `/admins` inherit; with `noindex` this produced Lighthouse SEO 61 on `/treasury` ("blocked from indexing", canonical points to the homepage). The noindex is intentional; override the canonical per private page if the score matters. | SEO |

**Housekeeping**

- `package.json` name is still `sc`; `README.md` is the create-next-app boilerplate; five unused default SVGs remain in `public/`.
- `components/ui/Modal.tsx` is an unused alias of `Dialog`.
- Preserved oddities from the refactor (do not "fix" silently): `HistoryDialog.handleConfirmRemove` has no `catch`/toast; `ExternalMatchesView` keeps polling the sessions list while `VisitorView` is open; toast text clears at fade-out start.
- **Performance (resolved items from `PERFORMANCE_PLAN.md`)**: P1 (generic blank shimmer → frame-first shaped skeletons + `data-skeleton`), P2 (CLS in header/worksheets → stable header skeleton pills + shaped screen skeletons), P3 (`AppHeader` auth pop → fixed-size auth placeholders while `loading`), P4 (sequential auth waterfall → parallel `QueryProvider` prefetching + `mbg-boot-v1` hint + removed top-level `useHydrated` block), P5 (initial Zod + dialog JS weight → `next/dynamic` on 9 non-confirm dialogs + idle warm-up + `experimental.inlineCss: true`), P6 (unbounded 6-month chart scan → bounded Prisma `groupBy`).
- No automated tests (unit or E2E); `REFACTOR_PLAN.md` §6 holds the manual regression checklist.
- Not implemented from the old plan: the optional legacy `localStorage` import endpoint (dropped).

---

## 16. Acceptance criteria

1. A visitor opening `/` sees open sessions only; inside a session they see names, counts, courts and queue (queued items flagged) and nothing else. `GET /api/sessions/:id` without a cookie → 401; `GET /api/sessions/:id/summary` of a closed session → 403 `SESSION_CLOSED`.
2. Logging in sets the `mbg_session` cookie as `HttpOnly` (not in `document.cookie`), `SameSite=Strict`, `Secure` in production; logout removes it and revokes the token.
3. A superadmin creates a session (courts, status, roster). An admin can then: assign matches to two courts, queue a third (flagged "Queued"), finish one, promote the queued match (flag disappears), tick/untick and see the lock behaviour, close/reopen the session. Visitors see courts, queue and counts update within ~10 s.
4. A match with exactly 4 ticks is locked after reload; unlocking persists; the server rejects ticks while locked (409).
5. An admin gets 403 on session create/edit(non-status)/roster/delete, treasury edit/delete and admin management; a superadmin succeeds.
6. Soft-deleting an admin logs them out on their next request and blocks re-login; a superadmin cannot delete themselves.
7. After 5 wrong passwords an account returns 429 for 15 minutes; a foreign `Origin` on a POST returns 403.
8. Treasury: all-time balance = income − expense of non-deleted entries; adding an entry updates cards, chart and list; filters and pagination work server-side; admin cannot edit/delete.
9. `/` keeps metadata, JSON-LD and its sitemap entry; `/treasury` and `/admins` are `noindex` and disallowed in `robots.txt`.
10. `npx tsc --noEmit`, `npm run lint` and `npm run build` pass.
11. (Performance) Lighthouse mobile targets in NFR-11 are met on `/` and `/treasury` — measured as described in `PERFORMANCE_PLAN.md`.

---

## 17. Decision log

| # | Topic | Decision (current) |
|---|-------|--------------------|
| A1 | Who manages sessions | Create / edit name, date, courts / roster / delete are **Superadmin-only**. Admins fully manage matches and may **open/close** a session (added after the original decision). |
| A2 | What visitors see | Session list (open only), per-player games played, who is on each court, the queue. No checklist, history, recommendation, lock state or treasury. |
| A3 | Treasury | Entries have a type `INCOME` / `EXPENSE`; "add a spent" = an expense; cash left is computed server-side. |
| A4 | Assignment | Assigning (court or queue) creates the checklist column with 4 ticks. The recommendation feeds the two assign actions. |
| A5 | No blank "add game" | Matches only come from court assignment or the queue. |
| A6 | Queued matches | Count as played immediately but are always flagged "Queued" and exposed separately as `queued`. |
| A7 | Treasury delete | Soft delete. |
| A8 | Currency | IDR, whole rupiah as `Int`. |
| A9 | Tooling | Prisma 6 (`~6.19`), bcrypt, TanStack Query, Zustand (UI only), Zod 4. |
| A10 | Session visibility | `SessionStatus` `OPEN`/`CLOSED`; closed = organisers only. |
| A11 | Rendering | Client-rendered screens over a thin server shell (FR-RND-1). `PERFORMANCE_PLAN.md` may revisit this for the auth read (optional phase) — update FR-RND-1/2 if adopted. |

---

## 18. Changes from the previous SRD

| Area | Previous SRD | Now |
|------|--------------|-----|
| Folder layout | Flat `components/*.tsx`; `app/treasury`, `app/admins` | Feature folders; route group `app/(shell)` with shared layout; `lib/data/*`, `lib/stores/*`, `components/ui|layout|providers` |
| Sessions | Public list of id/name/date | `SessionStatus`, admin open/close, visitor visibility rules, filters, pagination, counters |
| Visitor / organiser `/` | One `MatchApp` | `ExternalMatchesView` (card grid) vs `InternalMatchesWorkspace` (selected session + directory table) |
| Treasury | Balance + simple list | KPI cards, period filters, 6-month chart, server pagination |
| Header | Single header + planned drawer | `AppHeader` + `MobileDrawer` + `SyncStatus`; overlay flags in Zustand |
| Toasts / confirms | Local toast state; `window.confirm` | Zustand toast; `ConfirmDialog` everywhere |
| Page layout | Courts → Queue → Next match → Games played | Courts → Queue → [Games played ‖ Next match] (side by side on desktop) |
| API | Bare examples | Wrapped responses, `SessionsPage`, `SESSION_CLOSED` and `INVALID_STATE` codes, admin PATCH for status only |
| `lib/store.ts` | "Rewrite internals" | Barrel over `lib/data/*` |
| Prisma | `url` only | `url` + `directUrl` |
| Implementation plan (old Part C) | Phases 0–8 | Removed (all done; history in git) |
| Optional legacy import | Planned | Not implemented |
| Coding rules | Part B, partly prescriptive | §13, rewritten to match the code |
| New | — | §6 folder structure, §10 client architecture, §14 ops, §15 known issues, NFR-11 performance |
