# MBG Web App — Modularization + Zustand Refactor Plan

**Audience:** coding agent working in this repo.
**Goal:** split oversized component files into focused modules, and mount `AppHeader` once in a shared layout using Zustand for the cross-page UI state (toast, login/password/new-session dialogs, mobile drawer).
**Hard constraint:** this is a **pure refactor**. Loading behavior, render order, data flow, copy, classNames, DOM ids, query keys and polling must not change.

Line numbers below refer to the original snapshot (`mbg-webapp-main.zip`). After earlier phases they will drift, so locate code by **function name / `{/* anchor comment */}`**, not by line number.

---

## 0. Rules of engagement (read before touching code)

1. `AGENTS.md` applies: this repo runs **Next 16.4.3 / React 19.3** with `cacheComponents: true` and `partialPrefetching: true`. Run `npm install`, then read the relevant guides in `node_modules/next/dist/docs/` (layouts, route groups, `usePathname`, Cache Components) **before** Phase 3.
2. **One phase = one commit.** After every phase run, in order, and fix before continuing:
   ```bash
   npx tsc --noEmit
   npm run lint
   npm run build
   ```
   There is no test suite, so the build + the manual checklist (§6) are the safety net.
3. **Move, don't rewrite.** When extracting a component: cut/paste the JSX verbatim, change only (a) imports and (b) closure variables → props with the **same names**. No className, copy, or markup edits. Review every move with `git diff --color-moved=dimmed-zebra`; moved blocks should show as "moved", not "changed".
4. **Do not "fix" things you notice.** Write them in `REFACTOR_NOTES.md` instead. Known oddities to leave alone: see §7.
5. **Out of scope / do not edit:** `app/api/**`, `lib/server/**`, `prisma/**`, `lib/api.ts`, `lib/query.ts`, `lib/auth.ts`, and the behavior of every function in `lib/store.ts`.
6. **Zustand is for UI state only.** Server data stays in TanStack Query. `useCurrentSessionId`/`selectSession` (localStorage + `useSyncExternalStore` + cross-tab `storage` event + hydration-safe server snapshot) **stays as is**; do not migrate it.
7. Keep every DOM `id` (`new-session`, `logout-btn`, `admin-login-btn`, `mobile-menu-btn`, `match-history`, `edit-players`, `session-settings`, `treasury-add`, …) and every `aria-labelledby` ↔ title-`id` pair.

---

## 1. What is wrong today (evidence)

| # | Finding | Where |
|---|---|---|
| 1 | `MatchApp.tsx` is 1316 lines holding **6 components** (`MatchApp`, `ExternalMatchesView`, `InternalMatchesWorkspace`, `AdminSessionsTableSection`, `AdminSessionContainer`, `SessionView`) + 3 helpers + a type | `components/MatchApp.tsx` |
| 2 | `TreasuryApp.tsx` is 970 lines: 3 components + 5 date helpers + `computePresetDates` + a type | `components/TreasuryApp.tsx` |
| 3 | `AppHeader` is rendered by each of the 3 pages, each re-implementing the same wiring: `toast` state + `useRef` timer + `showToast` + the `toastBox` div (3 copies); `loggingIn` + `LoginDialog` (in header, MatchApp, TreasuryApp); `useAuth()` + the `mx-auto max-w-[1190px]…` shell div (3 copies) | `MatchApp`, `TreasuryApp`, `AdminsApp`, `AppHeader` |
| 4 | `initials()` lives in `PlayerGrid.tsx` but is imported by `AppHeader`, `CourtCard`, `NextMatch`, `VisitorView` (so the header bundle drags in PlayerGrid + `lib/store`) | `PlayerGrid.tsx:28` |
| 5 | `pad2`, `getMonthRange`, `addDaysISO` are **byte-identical** in MatchApp and TreasuryApp (verified with `diff`) | both files, top |
| 6 | The "Pagination Footer" block is duplicated in the sessions table and the treasury table; identical except the noun ("sessions"/"entries") and page-size options (`5,10,25,50` vs `10,25,50`) | `MatchApp` / `TreasuryApp` |
| 7 | `AppHeader` repeats the Live/Syncing indicator and the 3 nav links twice (desktop vs drawer) with different classNames | `AppHeader.tsx` |
| 8 | `lib/store.ts` (661 lines) mixes 8 concerns and is **not** a Zustand store despite the name | `lib/store.ts` |
| 9 | The `rec → prefill` mapping is written twice in `SessionView` | `onAssignCourt`, `onAddQueue` |
| 10 | `components/Modal.tsx` is an unused alias of `Dialog` (no importers) | `components/Modal.tsx` |

---

## 2. Target structure

```
app/
  layout.tsx                      (root; unchanged except QueryProvider import path)
  (shell)/                        ← route group, URLs unchanged
    layout.tsx                    ← NEW: shell wrapper + <AppHeader/> + <main> + GlobalDialogs + Toast
    page.tsx                      ← moved from app/page.tsx
    treasury/page.tsx             ← moved
    admins/page.tsx               ← moved
  api/**, manifest.ts, robots.ts, sitemap.ts   (unchanged, stay at app/ root)

lib/
  initials.ts                     ← NEW (from PlayerGrid)
  date.ts                         ← NEW (pad2, getMonthRange, addDaysISO, shiftMonth)
  stores/ui-store.ts              ← NEW Zustand store
  store.ts                        (unchanged; optional split in Phase 8)

components/
  providers/QueryProvider.tsx
  ui/            Dialog.tsx, Modal.tsx, Toast.tsx (NEW), TablePagination.tsx (NEW)
  layout/        AppHeader.tsx, MobileDrawer.tsx (NEW), SyncStatus.tsx (NEW), nav-items.ts (NEW),
                 GlobalDialogs.tsx (NEW), RouteOverlayReset.tsx (NEW)
  auth/          LoginDialog.tsx, PasswordDialog.tsx
  matches/
    MatchApp.tsx                  (gating only)
    ExternalMatchesView.tsx
    InternalMatchesWorkspace.tsx
    admin/
      SessionsDirectory.tsx       (was AdminSessionsTableSection)
      useSessionFilters.ts
      session-date-range.ts
      SessionsHero.tsx
      SessionsFilterToolbar.tsx
      SessionsTable.tsx
      AdminSessionContainer.tsx
      SessionView.tsx
      SessionHeaderBar.tsx
    CourtBoard, CourtCard, NextMatch, PlayerGrid, QueuePanel, VisitorView,
    AssignDialog, HistoryDialog, RosterDialog, SessionDialog, SessionSettingsDialog  (moved, unchanged)
  treasury/
    TreasuryApp.tsx               (gating + entry dialog state)
    TreasuryContent.tsx
    useTreasuryFilters.ts
    period.ts                     (PeriodPreset, PRESET_OPTIONS, computePresetDates)
    TreasuryHero.tsx
    TreasuryKpiCards.tsx
    MonthlyCashflowCard.tsx
    TransactionsCard.tsx
    TreasuryFilterToolbar.tsx
    TransactionsTable.tsx
    TreasuryEntryDialog.tsx       (moved, unchanged)
  admins/
    AdminsApp.tsx                 (gating + dialog state)
    AdminsContent.tsx
    AdminsTable.tsx
    AdminDialog.tsx               (moved, unchanged)
```

Target: no file you create is over ~250 lines. (`PlayerGrid.tsx`, `lib/store.ts` and the existing dialogs are not part of that goal except where stated.)

---

## 3. Zustand design

**Why Zustand here:** once the header is mounted in a layout, pages can no longer pass it `onToast` / `onNewSession` / `user` as props. The store is the channel.

**Install:** `npm i zustand` (v5).

### 3.1 State that goes in the store

| Field | Replaces |
|---|---|
| `toast` + `showToast(msg)` | `toast` state, `timer` ref, `showToast` in 3 pages |
| `loginOpen` | `loggingIn` in AppHeader, MatchApp, TreasuryApp |
| `passwordOpen` | `changingPass` in AppHeader |
| `newSessionOpen` | `creating` in MatchApp (+ header's `onNewSession`) |
| `drawerOpen` | `drawerOpen` in AppHeader (so one `closeOverlays()` can dismiss everything on route change) |

**Stays local** (transient, not shared): header's `loggingOut`; every dialog's form state; `dialogMode` in TreasuryApp; `creating`/`resetTarget` in AdminsApp (`resetTarget` carries an object and is page-specific).

### 3.2 `lib/stores/ui-store.ts`

```ts
import { create } from "zustand";

const TOAST_MS = 2600;
// Module-level, NOT state. Replaces the per-page useRef timer; same semantics.
let toastTimer: ReturnType<typeof setTimeout> | undefined;

interface UiState {
  toast: string;
  drawerOpen: boolean;
  loginOpen: boolean;
  passwordOpen: boolean;
  newSessionOpen: boolean;

  showToast: (msg: string) => void;
  openDrawer: () => void;
  closeDrawer: () => void;
  openLogin: () => void;
  closeLogin: () => void;
  openPassword: () => void;
  closePassword: () => void;
  openNewSession: () => void;
  closeNewSession: () => void;
  closeOverlays: () => void;
}

export const useUiStore = create<UiState>()((set) => ({
  toast: "",
  drawerOpen: false,
  loginOpen: false,
  passwordOpen: false,
  newSessionOpen: false,

  // Same order as the original: set → clear previous timer → start new timer.
  showToast: (msg) => {
    set({ toast: msg });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => set({ toast: "" }), TOAST_MS);
  },
  openDrawer: () => set({ drawerOpen: true }),
  closeDrawer: () => set({ drawerOpen: false }),
  openLogin: () => set({ loginOpen: true }),
  closeLogin: () => set({ loginOpen: false }),
  openPassword: () => set({ passwordOpen: true }),
  closePassword: () => set({ passwordOpen: false }),
  openNewSession: () => set({ newSessionOpen: true }),
  closeNewSession: () => set({ newSessionOpen: false }),
  closeOverlays: () =>
    set({
      drawerOpen: false,
      loginOpen: false,
      passwordOpen: false,
      newSessionOpen: false,
    }),
}));

/** Stable reference (actions are created once). Use instead of passing onToast around. */
export const useToast = () => useUiStore((s) => s.showToast);
```

### 3.3 Rules for using the store

- **Select primitives or single actions** (`useUiStore((s) => s.toast)`). Never return a fresh object/array from a selector (`s => ({a: s.a, b: s.b})`): with Zustand v5 + React 19 this causes an infinite render loop. If you need several fields, use `useShallow` from `zustand/react/shallow`, or just call the hook several times.
- **Never call store actions during render, or from server code.** Only from event handlers / effects. The module-level store instance is shared across server renders, so nothing may write to it on the server. Initial state is a constant, so SSR output and the first client render match (no hydration mismatch).
- No `persist`, no `devtools`, no `immer`.

### 3.4 `components/ui/Toast.tsx` (markup identical to the 3 existing copies)

```tsx
"use client";

import { useUiStore } from "@/lib/stores/ui-store";
import { cx, toastBox } from "@/lib/ui";

export function Toast() {
  const toast = useUiStore((s) => s.toast);
  return (
    <div
      className={cx(
        toastBox,
        toast ? "translate-y-0 opacity-100" : "translate-y-5 opacity-0",
      )}
      role="status"
    >
      {toast}
    </div>
  );
}
```
It must **always be mounted** (never `{toast && …}`), otherwise the CSS transition breaks.

### 3.5 `app/(shell)/layout.tsx` (server component)

```tsx
import type { ReactNode } from "react";
import { AppHeader } from "@/components/layout/AppHeader";
import { GlobalDialogs } from "@/components/layout/GlobalDialogs";
import { RouteOverlayReset } from "@/components/layout/RouteOverlayReset";
import { Toast } from "@/components/ui/Toast";

export default function ShellLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto max-w-[1190px] px-[30px] pb-14 max-[860px]:px-3.5 max-[860px]:pb-10">
      <AppHeader />
      <main>{children}</main>
      <GlobalDialogs />
      <Toast />
      <RouteOverlayReset />
    </div>
  );
}
```
DOM order (header → main → dialogs → toast) matches today. If a `LayoutProps<…>` helper type complains for the group layout, use the explicit `{ children: ReactNode }` shown here.

### 3.6 `GlobalDialogs.tsx` and `RouteOverlayReset.tsx`

```tsx
// GlobalDialogs.tsx  ("use client")
const { user } = useAuth();
const isSuperadmin = user?.role === "SUPERADMIN";
const loginOpen = useUiStore((s) => s.loginOpen);
const passwordOpen = useUiStore((s) => s.passwordOpen);
const newSessionOpen = useUiStore((s) => s.newSessionOpen);
const showToast = useToast();
const closeLogin = useUiStore((s) => s.closeLogin);
// …closePassword, closeNewSession likewise

return (
  <>
    {newSessionOpen && isSuperadmin && <SessionDialog onClose={closeNewSession} />}
    {loginOpen && <LoginDialog onClose={closeLogin} onLoggedIn={() => showToast("Logged in")} />}
    {passwordOpen && <PasswordDialog onClose={closePassword} onSaved={showToast} />}
  </>
);
```
Keep the `isSuperadmin` guard on `SessionDialog` (it exists today in MatchApp). All three call sites of `LoginDialog` use the same `"Logged in"` message, so one handler is equivalent.

```tsx
// RouteOverlayReset.tsx  ("use client"; renders null)
const pathname = usePathname();
useEffect(() => {
  useUiStore.getState().closeOverlays();
}, [pathname]);
```
**Why:** today the header (and its dialogs/drawer) remounts on every page change, so a browser Back press while a dialog/drawer is open closes it. A persistent header would otherwise leave it open. This effect preserves the old behavior. Do **not** reset `toast` on navigation.

### 3.7 `AppHeader` after the change (no props)

- `const { user } = useAuth();` (same query key ⇒ deduped with the pages' own `useAuth()` calls; keep ignoring `loading`, so the header still renders the logged-out variant while auth is pending, exactly as today).
- `const pathname = usePathname();` → `active`: `"/treasury"` → `"treasury"`, `"/admins"` → `"admins"`, otherwise `"matches"`.
- `const showNewSession = isSuperadmin && active === "matches";` (today only MatchApp passes `onNewSession`; Treasury/Admins don't, so the button is hidden there).
- `onNewSession` → `openNewSession()`; `onToast` → `useToast()`; `setLoggingIn(true)` → `openLogin()`; `setChangingPass(true)` → `openPassword()`; `drawerOpen` → store.
- Keep `loggingOut` as local `useState`, and `handleLogout` in `AppHeader` (it does `logout()` → `closeDrawer()` → `showToast("Signed out")` in a `try/finally` exactly as today).
- Keep the Escape-key effect in the header (reads `drawerOpen` from the store, calls `closeDrawer`).
- Keep `useIsFetching()` in the header.

---

## 4. Phases

### Phase 0 — Baseline (no code changes)
1. `git checkout -b refactor/modularize`; `npm install`; copy `.env.example` → `.env` and configure DB per the repo's setup if you want to run the app locally (`npm run db:migrate && npm run db:seed`).
2. Record baseline: `npx tsc --noEmit`, `npm run lint`, `npm run build` all pass (note any pre-existing warnings so they are not blamed on the refactor).
3. Read `node_modules/next/dist/docs/` guides for layouts / route groups / `usePathname` / Cache Components.
4. Walk §6 once on the untouched app so you know what "correct" looks like.

### Phase 1 — Pure helper extraction (no JSX moves)
| Step | Action |
|---|---|
| 1a | Create `lib/initials.ts` with `initials()` copied **verbatim** from `PlayerGrid.tsx`. Remove it from PlayerGrid; change imports in `PlayerGrid`, `AppHeader`, `CourtCard`, `NextMatch`, `VisitorView` to `@/lib/initials`. |
| 1b | Create `lib/date.ts` with `pad2`, `getMonthRange`, `addDaysISO`, `shiftMonth` verbatim. Delete the local copies in `MatchApp.tsx` and `TreasuryApp.tsx` and import from `@/lib/date`. |

Do **not** merge the two preset implementations: Matches has `all / this-month / last-30 / this-year / custom` with no labels; Treasury has 8 presets with labels. Their `PeriodPreset` types stay separate.
`todayISO`, `fmtDate`, `fmtMonth` stay in `lib/format.ts` (`lib/store.ts` re-exports `todayISO`; leave that).

### Phase 2 — Folder moves (pure `git mv`)
Use `git mv` so history is kept; fix imports until `tsc` is clean. Use `@/components/...` for cross-folder imports, relative for same-folder.

| From `components/` | To |
|---|---|
| `Dialog.tsx`, `Modal.tsx` | `ui/` (do **not** delete `Modal.tsx`; note it in `REFACTOR_NOTES.md`) |
| `QueryProvider.tsx` | `providers/` (update `app/layout.tsx`) |
| `AppHeader.tsx` | `layout/` |
| `LoginDialog.tsx`, `PasswordDialog.tsx` | `auth/` |
| `MatchApp, CourtBoard, CourtCard, NextMatch, PlayerGrid, QueuePanel, VisitorView, AssignDialog, HistoryDialog, RosterDialog, SessionDialog, SessionSettingsDialog` | `matches/` |
| `TreasuryApp.tsx`, `TreasuryEntryDialog.tsx` | `treasury/` |
| `AdminsApp.tsx`, `AdminDialog.tsx` | `admins/` |

Page files (`app/page.tsx`, `app/treasury/page.tsx`, `app/admins/page.tsx`) keep importing the default exports; just update the import paths. **No content edits in this commit.**

### Phase 3 — Zustand store + shared header layout

**3a. Introduce the store without changing structure**
1. `npm i zustand`. Create `lib/stores/ui-store.ts` and `components/ui/Toast.tsx` (§3.2, §3.4).
2. In `AdminsApp`, then `TreasuryApp`, then `MatchApp` (one at a time, running the app between): delete the local `toast` state, `timer` ref and `showToast`; use `const showToast = useToast();` and render `<Toast />` where the old toast div was. Leave everything else (including `onToast={showToast}` prop passing and the per-page `<AppHeader>`) untouched.
3. Commit.

**3b. Cut over to the layout (do this in ONE commit; a half-done cutover renders two headers)**
1. Create `GlobalDialogs.tsx`, `RouteOverlayReset.tsx`, `app/(shell)/layout.tsx` (§3.5–3.6).
2. `git mv app/page.tsx "app/(shell)/page.tsx"`, same for `treasury/page.tsx` and `admins/page.tsx`. Leave `app/layout.tsx`, `api/`, `manifest.ts`, `robots.ts`, `sitemap.ts` where they are. URLs and each page's `metadata` export are unaffected.
3. Rewrite `AppHeader` to take no props (§3.7), swapping local state for store selectors/actions.
4. In each page component remove: the outer `mx-auto max-w-[1190px]…` div, `<AppHeader …/>`, the `<main>` wrapper, the `<Toast/>`, and any `LoginDialog`/`loggingIn`. Per page:
   - **MatchApp:** drop `creating`, `loggingIn`, `<SessionDialog>`, `<LoginDialog>`. Replace `onNewSession={() => setCreating(true)}` with `openNewSession()` from the store, and `onLogin={() => setLoggingIn(true)}` with `openLogin()`. The function body becomes just the existing ternary (`!hydrated || authLoading ? shimmer : user ? Internal : External`) returned directly.
   - **TreasuryApp:** drop `loggingIn` + `LoginDialog`; the "Admin login" button calls `openLogin()`. Keep `dialogMode` + `TreasuryEntryDialog` here.
   - **AdminsApp:** keep `creating`, `resetTarget` and both `AdminDialog`s here.
5. **Keep `useHydrated()` and `useAuth()` in each page component.** Do not hoist the loading/auth gate into the layout. Re-mounting each page's `useAuth()` observer is what triggers the `/auth/me` refetch-on-mount (`staleTime` is 2 s) today; hoisting would silently remove that.
6. Verify (§6) including Back-button-with-dialog-open and mobile drawer.

### Phase 4 — Split `MatchApp.tsx`
Order: do the leaf extractions first, parents last, running `tsc` after each file.

| New file | Take from (original) | Notes |
|---|---|---|
| `matches/MatchApp.tsx` | `MatchApp` | Gating only: `useHydrated`, `useAuth`, `useCurrentSessionId`, shimmer/Internal/External. Define one `handleSelectSession(id){ selectSession(id); window.scrollTo({ top: 0, behavior: "smooth" }); }` replacing the two identical inline lambdas. |
| `matches/ExternalMatchesView.tsx` | `ExternalMatchesView` (L160–392) | Move as is. Keep the order: hooks → `if (currentSessionId) return <VisitorView key=…/>` → `if (loading && !data)` shimmer → `if (!data) return null`. Optionally pull the `<article>` card into a local `OpenSessionCard` in the same file. |
| `matches/InternalMatchesWorkspace.tsx` | `InternalMatchesWorkspace` | Keep `<div className="mb-8">` wrapper and `key={currentSessionId}` on `AdminSessionContainer`. |
| `matches/admin/session-date-range.ts` | the `dateRange` `useMemo` body (`all / this-month / last-30 / this-year / custom`) | Export `computeSessionDateRange(preset, customFrom, customTo)` and the `PeriodPreset` type. Pure function; the `useMemo` stays in the hook with the same deps. |
| `matches/admin/useSessionFilters.ts` | the 7 filter `useState`s, `dateRange`/`filterParams` `useMemo`s, `hasActiveFilters`, `resetFilters` | Returns state + setters + `filterParams` + `hasActiveFilters` + `resetFilters`. Must be called at the top of `SessionsDirectory`, **before** `useSessionsList`. |
| `matches/admin/SessionsHero.tsx` | `{!currentSessionId && <section>…Organiser dashboard…}` | Calls `openNewSession()` from the store; shown only when `isSuperadmin`. |
| `matches/admin/SessionsFilterToolbar.tsx` | `{/* Filter Toolbar */}` (L619–736) | Props: filter state + setters, `hasActiveFilters`, `onReset`. Keep `presetOptions` computed per render (it embeds `fmtMonth(todayISO()…)`). |
| `matches/admin/SessionsTable.tsx` | `{/* Sessions Table */}` incl. the empty-state div (L737–872) | Props: `sessions`, `hasActiveFilters`, `isSuperadmin`, `currentSessionId`, `togglingId`, `onSelectSession`, `onHideDetail` (calls `selectSession(null)`), `onToggleStatus`, `onRequestDelete`. |
| `ui/TablePagination.tsx` | `{/* Pagination Footer */}` in both Matches (L873–930) and Treasury (L763–823) | Props: `noun`, `total`, `page`, `pageSize`, `totalPages`, `fetching`, `pageSizeOptions`, `onPageSizeChange`, `onPrev`, `onNext`. Details in §4.1. |
| `matches/admin/SessionsDirectory.tsx` | `AdminSessionsTableSection` | Keeps: the hook call, `useSessionsList`, early returns, `togglingId`/`deletingSession`/`deletingBusy` state, `handleToggleStatus`, `handleConfirmDeleteSession`, the `ConfirmDialog`, and composes the pieces above inside `<section id="sessions-directory" className={card} …>`. |
| `matches/admin/AdminSessionContainer.tsx` | `AdminSessionContainer` | Move as is. |
| `matches/admin/SessionHeaderBar.tsx` | the first `<section>` of `SessionView` (title + button row, L1110–1187) | Presentational. Props: `session`, `isSuperadmin`, `togglingStatus`, `deletingSession`, `onShowHistory`, `onEditRoster`, `onEditSettings`, `onToggleStatus`, `onRequestDelete`. Keeps ids `match-history`, `edit-players`, `session-settings`. |
| `matches/admin/SessionView.tsx` | `SessionView` | Keeps all 12 `useState`s, the `useMemo`s, the 6 `handle*` functions and all dialogs. **Do not** move the handlers into a custom hook (stateful and tightly coupled). Expected size ≈ 230 lines. |
| `lib/match.ts` (add) | rec→prefill mapping duplicated in `onAssignCourt` / `onAddQueue` | `export function prefillFromRec(rec: Recommendation \| null): [Team, Team] \| undefined` returning exactly `rec ? [[rec.teams[0][0].id, rec.teams[0][1].id],[rec.teams[1][0].id, rec.teams[1][1].id]] : undefined`. |

#### 4.1 `TablePagination` fidelity
- Root element: `<div className={cx(cardFoot, "flex-wrap gap-3 bg-[#fafdff]")}>`; copy the inner markup verbatim.
- "Showing" text: `total === 0 ? "Showing 0 {noun}" : "Showing {startRow}–{endRow} of {total} {noun}"` with `startRow = (page - 1) * pageSize + 1`, `endRow = Math.min(total, page * pageSize)`. Pass the **server-returned** `data.page` / `data.pageSize` as `page`/`pageSize` (not the local state), as the original does.
- Prev/Next `disabled` conditions use the server `page`/`totalPages` **and** `fetching`. The click handlers stay the parent's functional updaters: `onPrev={() => setPage(p => Math.max(1, p - 1))}`, `onNext={() => setPage(p => Math.min(totalPages, p + 1))}`.
- The "Rows" `<select>` keeps `aria-label="Rows per page"` and `onPageSizeChange={(n) => { setPageSize(n); setPage(1); }}`.
- The centered Prev/Next on the **public** list (`ExternalMatchesView`) has different markup/classes; leave it in that file, do not force it into `TablePagination`.

### Phase 5 — Split `TreasuryApp.tsx`
| New file | Take from | Notes |
|---|---|---|
| `treasury/period.ts` | `PeriodPreset`, `computePresetDates`, and the `presetOptions` array | `presetOptions` is constant → export as `PRESET_OPTIONS`. Imports `getMonthRange`, `addDaysISO`, `shiftMonth` from `@/lib/date`. |
| `treasury/useTreasuryFilters.ts` | the 8 filter `useState`s, `periodRange`, `filterParams`, `hasActiveFilters`, `resetFilters`, `handleSelectMonthFromChart`, `defaultYm` | Called at the top of `TreasuryContent`, before `useTreasury`. |
| `treasury/TreasuryHero.tsx` | `{/* Top Hero Header */}` | Props: `treasury`, `onAdd`. Keeps ids `treasury-add-income`, `treasury-add`. |
| `treasury/TreasuryKpiCards.tsx` | `{/* Dashboard KPI Cards */}` (4 cards) | Props: `treasury`, `periodLabel`. Compute `allTimeVolume` and `incomeRatioPct` **inside** (they are used only here). |
| `treasury/MonthlyCashflowCard.tsx` | `MonthlyCashflowCard` (already a separate function) | Move as is. |
| `treasury/TreasuryFilterToolbar.tsx` | `{/* Periodical & Search Filter Toolbar */}` through the search input | Includes the month stepper using `shiftMonth`. |
| `treasury/TransactionsTable.tsx` | `{/* Transactions Table */}` | Props: `entries`, `isSuperadmin`, `onEdit`, `onRequestDelete`. |
| `treasury/TransactionsCard.tsx` | `<section aria-labelledby="entries-title">` shell | Composes toolbar + table + `TablePagination noun="entries" pageSizeOptions={[10, 25, 50]}`. |
| `treasury/TreasuryContent.tsx` | `TreasuryContent` | Keeps hook call, `useTreasury`, early returns (`loading && !treasury` → shimmer, `!treasury` → null), `confirmEntry`/`deletingId`, `handleConfirmDelete`, the `ConfirmDialog`. |
| `treasury/TreasuryApp.tsx` | `TreasuryApp` | Gating; the "Organisers only" card; `dialogMode` + `TreasuryEntryDialog`. Keep the card inline (≈15 lines). |

### Phase 6 — Admins, header internals, small extras
**Admins:** `AdminsApp.tsx` (gating + "Not allowed" card + `creating`/`resetTarget` + dialogs), `AdminsContent.tsx` (`useAdmins`, early return `loading || !admins` → shimmer, delete flow, `ConfirmDialog`), `AdminsTable.tsx` (the table inside `<section aria-labelledby="admins-title">`).

**Header internals** (`components/layout/`):
- `nav-items.ts`: `[{ key: "matches", href: "/", label: "Matches" }, { key: "treasury", href: "/treasury", label: "Treasury" }, { key: "admins", href: "/admins", label: "Admins", superadminOnly: true }]`. Desktop renders `btn(active === key ? "primary" : "light", "sm")`; the drawer renders `cx(btn(active === key ? "primary" : "light", "md"), "w-full text-left")` **plus** `onClick={closeDrawer}`. Keep both exact class sets.
- `SyncStatus.tsx` with `variant: "desktop" | "drawer"`:
  - desktop: wrapper `flex items-center gap-[7px] text-xs text-muted`, dot `size-[7px] rounded-full bg-[#53b8a3]`
  - drawer: wrapper `flex items-center gap-1.5 text-xs font-bold text-[#204a74]`, dot `size-2 rounded-full bg-[#53b8a3]`
  - both: spinner `cx(spinner, "size-2.5 text-[#5da5e4]")`, texts "Syncing…" / "Live"
- `MobileDrawer.tsx`: the `{drawerOpen && <div role="dialog" …>}` block. Props: `active`, `user`, `isSuperadmin`, `showNewSession`, `loggingOut`, `onLogout`. Drawer actions use the store: "New session" → `closeDrawer(); openNewSession()`, "Change password" → `closeDrawer(); openPassword()`, "Admin login" → `closeDrawer(); openLogin()`. Keep `loggingOut`/`handleLogout` owned by `AppHeader` and passed down (do not duplicate the state in two components).

**Optional (skip if time-boxed):** `VisitorView.tsx` → extract the queue and players `<section>`s into `VisitorQueueSection` / `VisitorPlayersSection` in the same folder. Do **not** split `PlayerGrid` (per-cell pending/lock/remove state lives with the rows).

### Phase 7 (optional) — Remove `onToast` prop drilling
Rule: **components that call a toast directly use `useToast()`; reusable dialogs keep their `onSaved`/`onToast` callback props and the parent passes `showToast`.**
- Remove the pass-through `onToast` props in `InternalMatchesWorkspace` → `SessionsDirectory` / `AdminSessionContainer` → `SessionView`.
- `SessionsDirectory`, `SessionView`, `PlayerGrid` (drop its optional `onToast?`), `TreasuryContent`, `AdminsContent` call `useToast()` themselves.
- Dialogs (`PasswordDialog`, `RosterDialog`, `SessionSettingsDialog`, `AssignDialog`, `TreasuryEntryDialog`, `AdminDialog`) are **not** touched.

### Phase 8 (optional) — Split `lib/store.ts` behind a barrel
Create `lib/data/` and keep `lib/store.ts` as a barrel so the 12 importers do not change:
```
lib/data/current-session.ts   CURRENT_KEY, subscribeCurrent, useCurrentSessionId, selectSession, useHydrated
lib/data/parse-names.ts       parseNames
lib/data/queries.ts           useSessionsList, useSessionSummary, useSessionDetail, useTreasury, useAdmins
lib/data/session-actions.ts   createSession, updateSession, deleteSession, setRoster
lib/data/match-actions.ts     assignMatch, updateMatchPlayers, startQueuedMatch, finishMatch, reorderQueue, removeGame, clearGames, setPlayed, setGameLocked
lib/data/treasury-actions.ts  addTreasuryEntry, editTreasuryEntry, removeTreasuryEntry
lib/data/admin-actions.ts     createAdmin, deleteAdmin, resetAdminPassword
lib/store.ts                  export * from "./data/…"; export { todayISO } from "./format";
```
Function bodies are copied verbatim (the optimistic-update / rollback logic is delicate). `deleteSession` needs `CURRENT_KEY` from `current-session.ts`. Do not name the folder `lib/store/` (collides with `lib/store.ts`).

---

## 5. Invariants that must not change

1. **Loading gates, same order and same conditions**
   - Pages: `!hydrated || authLoading` → shimmer.
   - `ExternalMatchesView`: `if (currentSessionId) → VisitorView` **after** `useSessionsList` runs, then `loading && !data` → shimmer, then `!data` → `null`.
   - `SessionsDirectory`: `loading && !data` → shimmer, `!data` → `null`. `TreasuryContent`: `loading && !treasury` → shimmer, `!treasury` → `null`. `AdminsContent`: `loading || !admins` → shimmer. `AdminSessionContainer`: `loading` → shimmer, `error || !session` → error card. `VisitorView`: `loading` → shimmer, `error || !summary` → error card.
2. **Hooks stay above early returns, in the same component.** Filter state must be owned by the same component that calls the query hook (directly or via the custom hook), never inside a child that could remount when the data branch changes.
3. **`key={currentSessionId}`** stays on `AdminSessionContainer` and `VisitorView`. It resets `SessionView`'s local state (shuffle seed, dialogs, busy flags) when the selected session changes.
4. **Header while auth is loading** renders the logged-out variant (it ignores `loading`).
5. **Guards:** `isSuperadmin &&` on `SessionDialog`, `RosterDialog`, `SessionSettingsDialog`, the Admins link, the delete/edit buttons.
6. **Toast:** always mounted; 2600 ms; a new toast clears the previous timer.
7. **Query keys, `refetchInterval`s, `placeholderData: keepPreviousData`, optimistic updates:** untouched (they all live in `lib/store.ts` / `lib/query.ts`).
8. **Responsive breakpoints and class strings:** `max-[860px]`, `max-[960px]`, etc. unchanged.
9. **Each page keeps its own `useAuth()` call** (see Phase 3b step 5).

---

## 6. Manual regression checklist (run after Phases 3, 4, 5, 6)

**Logged out**
- `/` shows the shimmer, then open sessions. Search box appears when >3 open sessions or once text is typed; clear/reset works; pagination works.
- Click a session → live courts / queue / player table. "← All sessions" returns. Reload keeps the selected session (localStorage `mbg-current-v2`).
- `/treasury` shows "Organisers only" + Admin login. `/admins` shows "Not allowed" + "Back to matches".
- Header "Admin login" (desktop and mobile) and the in-page buttons all open the **same single** login dialog. Wrong password shows the inline error; success shows toast "Logged in" and the page re-renders as logged-in.

**Admin**
- Header: nav highlights the right tab on each route; username + role pill; "Password" dialog → toast; "Log out" shows "Signing out…" then toast "Signed out". Live ↔ Syncing indicator toggles during fetches.
- Sessions directory: every preset, custom range, status filter, search, rows-per-page, Prev/Next, Reset filters; Close/Reopen with toast; "View detail" / "Hide detail"; "Viewing" pill.
- Session view: assign to court, add to queue, edit/remove queued (confirm), reorder, promote next onto a court, finish, tick cells (pending state), lock/unlock, remove game, clear all, shuffle (toast), history dialog (remove game), "Close session" toggle. **Switch to another session and confirm local state resets.**

**Superadmin**
- "＋ New session": desktop header, mobile header "＋ New", drawer, and the dashboard hero all open the same dialog; create works; new session becomes current.
- Edit players, Session settings, Delete session (confirm → toast).
- `/admins`: add admin, reset password, delete (confirm). `/treasury`: add income/spent, edit, delete (confirm), every period preset incl. month stepper and chart click, type filter, search, pagination, KPI numbers.

**Mobile / overlays (≤ 860 px)**
- Drawer opens/closes via ✕, backdrop click, Escape, and nav-link click; drawer actions close it first.
- Open a dialog or the drawer, press the browser **Back** → the overlay is closed on the previous page (RouteOverlayReset).
- The header does not flash/re-animate when switching tabs; logo is still `priority`.
- A second toast within 2.6 s replaces the first and restarts the timer.

**Console:** no hydration warnings, no "Maximum update depth exceeded", no missing-key warnings.

---

## 7. Pitfalls and known oddities

- **Zustand v5 selector loop:** see §3.3. This is the most likely source of a runtime error in this refactor.
- **`usePathname` + Cache Components:** if `next build` reports a missing Suspense boundary for the header, wrap `<AppHeader />` in `<Suspense fallback={null}>` in `app/(shell)/layout.tsx` and confirm there is no visible layout shift. Only do this if the build asks for it.
- **Root-layout alternative:** if the route group causes trouble, mount the same shell in `app/layout.tsx` instead (zero file moves). Trade-off: the 404 page would also get the header.
- **`Dialog`'s Escape effect depends on `onClose` identity**, so inline arrows re-subscribe each render. Existing behavior; stable store actions are fine and make it slightly cheaper. Do not "optimize" further.
- **Leave as is (log in `REFACTOR_NOTES.md`):**
  - `HistoryDialog.handleConfirmRemove` has no `catch` and no toast.
  - `ExternalMatchesView` keeps polling the sessions list while `VisitorView` is shown, because the hook runs before the early return. Do **not** reorder.
  - `components/Modal.tsx` is unused.
  - The toast text clears at the start of the fade-out (existing visual behavior).
- If `eslint` flags the `RouteOverlayReset` effect, keep the behavior and prefer a narrowly scoped `eslint-disable-next-line` with a comment over restructuring.

---

## 8. Definition of done

- `tsc`, `lint`, `build` clean (no new warnings vs. Phase 0 baseline).
- §6 checklist passes on desktop and mobile widths.
- `AppHeader` is rendered in exactly one place (`app/(shell)/layout.tsx`) and takes no props.
- No page contains its own toast state, timer, toast div, `LoginDialog`, or shell wrapper.
- No newly created file is over ~250 lines; `MatchApp.tsx` ≲ 60 lines, `TreasuryApp.tsx` ≲ 80 lines.
- `git diff --color-moved=dimmed-zebra` shows extracted blocks as moved, with only import/prop changes.
- `REFACTOR_NOTES.md` lists anything noticed but intentionally not changed.
