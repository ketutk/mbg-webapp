# Refactor Notes

Intentional non-changes and pre-existing oddities preserved verbatim during the modularization and Zustand refactor (`refactor/modularize`) to keep runtime behavior unchanged:

## Preserved Behaviors & Known Oddities (`REFACTOR_PLAN.md` §7)

- **`HistoryDialog.handleConfirmRemove` has no `catch` or toast** (`components/matches/HistoryDialog.tsx`): removing a match from the history modal awaits `removeGame(...)` with a `try/finally` block and does not catch or surface an error toast. Left untouched.
- **`ExternalMatchesView` keeps polling while `VisitorView` is active** (`components/matches/ExternalMatchesView.tsx`): `useSessionsList(filterParams)` runs unconditionally above the `if (currentSessionId) return <VisitorView ... />` early return. Hook ordering and polling were intentionally preserved.
- **Unused `Modal` alias** (`components/ui/Modal.tsx`, moved from `components/Modal.tsx`): re-exports `Dialog` as `Modal` with no current callers. Kept intact rather than deleted.
- **Toast text clears immediately at fade-out start** (`lib/stores/ui-store.ts`, `components/ui/Toast.tsx`): `showToast` clears `toast` back to `""` after `2600ms`, matching the original per-page `toast`/`timer` behavior while `<Toast />` remains mounted for CSS transition classes.
- **`AppHeader` ignores `authLoading`** (`components/layout/AppHeader.tsx`): renders the logged-out header variant while `/api/auth/me` is in flight, matching pre-refactor behavior and avoiding header flash differences.

## Modularization Implementation Notes

- **`TablePagination` `rowsPerPage` prop** (`components/ui/TablePagination.tsx`): accepts an optional `rowsPerPage?: number` alongside `pageSize` so the `<select aria-label="Rows per page">` reflects the user's selected local page-size immediately during `keepPreviousData` refetches while the `"Showing X–Y of Z"` text and `Prev` / `Next` disabled states continue reading the server-returned `data.page` and `data.pageSize`.
- **File size targets**: `MatchApp.tsx` is 37 lines (target `<= ~60`) and `TreasuryApp.tsx` is 61 lines (target `<= ~80`). `components/matches/admin/SessionView.tsx` (284 lines) and `components/matches/ExternalMatchesView.tsx` (252 lines) retain their co-located state handlers and centered pagination inline per §4; `lib/data/match-actions.ts` (331 lines) keeps all nine optimistic match mutations verbatim under the `lib/store.ts` barrel per Phase 8.
- **Route group & Cache Components**: `app/(shell)/layout.tsx` mounts `<AppHeader />` once above `<main>{children}</main>`, `<GlobalDialogs />`, `<Toast />`, and `<RouteOverlayReset />`. `npx next build` builds `/`, `/treasury`, `/admins`, `/_not-found`, `/manifest.webmanifest`, `/robots.txt`, and `/sitemap.xml` statically with zero Suspense errors.

## Verification Scope

- TypeScript (`npx tsc --noEmit`), ESLint (`npm run lint`), and Next.js production build (`npm run build`) ran cleanly after every commit phase.
- Automated UI/browser E2E tests do not exist in this repo; interactive visual/regression checks in `REFACTOR_PLAN.md` §6 (desktop/mobile viewports, auth flows, live mutations against a seeded database) were not executed live against a running dev server/database in this environment and should be spot-checked locally against a running app instance.

