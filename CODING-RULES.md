# MBG — Architecture & Coding Rules (React + Next.js)

Applies to: the `sc` project as of `sc_1.rar` (Next.js 16.4.3 with `cacheComponents`, React 19.3, Tailwind v4, TanStack Query 5, Prisma 6, Zod 4).
Replaces: **Part B (Coding Rules) of `SRD.md`** wherever the two conflict (see §14).
Goal: a **modular, feature-based** codebase where a screen is a thin composition, logic lives in hooks, data access lives in one place per feature, and the dependency direction is enforced by lint — without adding new runtime dependencies.

---

## 1. Diagnosis of the current code

Findings are from reading `sc_1.rar`. The server side is in decent shape; the problems are almost all in `components/` and `lib/store.ts`.

| # | Finding | Evidence | Why it hurts |
|---|---------|----------|--------------|
| 1 | **God component files** | `MatchApp.tsx` = 1,316 lines holding 6 components; `AdminSessionsTableSection` alone ≈ 515 lines. `TreasuryApp.tsx` = 970 lines; `TreasuryContent` ≈ 628 lines. | Cannot be read, reviewed, tested or reused. Any change risks unrelated UI. |
| 2 | **Screens own too much state** | `SessionView` has 13 `useState` calls (dialogs, busy ids, confirm targets) and ~8 async handlers. | State explosion; every handler repeats the same busy/try/catch/toast block. |
| 3 | **Copy-pasted handler pattern** | Every action: `setBusyId(x); try { await action(); onToast("…") } catch (e) { onToast(e.message) } finally { setBusyId(null) }` (dozens of times). | Boilerplate; inconsistent messages; easy to forget the `finally`. |
| 4 | **Prop-drilled toast** | `onToast` is threaded through `MatchApp → InternalMatchesWorkspace → AdminSessionsTableSection/AdminSessionContainer → SessionView` (33 references in `MatchApp.tsx`, plus `AdminsApp`, `TreasuryApp`, `AppHeader`, `PlayerGrid`). Each root app owns its own toast state and markup. | Noise in every signature; toast UI duplicated 3×. |
| 5 | **Duplicated logic** | `pad2`, `getMonthRange`, `addDaysISO`, `PeriodPreset` and the filter/pagination state are implemented separately in `MatchApp.tsx` and `TreasuryApp.tsx`. | Two sources of truth for date math and filters. |
| 6 | **`lib/store.ts` is a catch-all (661 lines)** | Mixes: localStorage external store, hydration hook, `parseNames`, 5 query hooks, session / match / treasury / admin mutations with hand-written optimistic updates. The name is a leftover from the localStorage version. | Unrelated domains change together; no feature boundary. |
| 7 | **Mutations bypass React Query's model** | Actions are plain `async` functions using the global `queryClient` singleton (`setQueryData`, `cancelQueries`, repeated `invalidateQueries` triplets). | Not hook-based, no `isPending`/`variables`, no central error handling, invalidation list copy-pasted per action. |
| 8 | **Wrong dependency direction** | `initials()` is defined in `PlayerGrid.tsx` and imported by `AppHeader`, `CourtCard`, `NextMatch`, `VisitorView`. `Modal.tsx` is only a re-export alias of `Dialog.tsx`. | Leaf components depend on a big feature component; two names for one thing. |
| 9 | **No real routing for sessions** | `/` renders `MatchApp`, which switches between list / detail / visitor view using a **localStorage "current session id"** + `useHydrated()`. | A session has no URL (cannot share, no back button, no deep link); needs hydration hacks. |
| 10 | **Role checks scattered** | `user.role === "SUPERADMIN"` repeated in many components; server has its own role lists per route. | Permission rules can drift between UI and API. |
| 11 | **Styling is partly tokenised only** | `lib/ui.ts` holds class strings, but components still contain raw hex (`#204a74`, `#5da5e4`, `#183e6b`, `#b5524f`, `#e1edf7`, …) and long arbitrary-value strings. | Re-theming or dark mode means editing hundreds of lines. |
| 12 | **Server `games.ts` is 461 lines** with assign/queue/tick/lifecycle in one file; `HttpError` lives in `auth.ts` and is re-exported by `http.ts`. | `lib/server/games.ts`, `lib/server/http.ts` | Large service file; awkward import cycle risk. |

**What is already good and must be kept:** thin route handlers wrapped by `route()`, DTO mappers, shared Zod schemas used by client and server, `server-only` guard, CSRF/role checks centralised in `http.ts`, `lib/match.ts` pure and framework-free, shimmer skeleton pattern, accessibility attributes.

---

## 2. Principles

1. **Feature first.** Code is grouped by *what it is for* (`sessions`, `matches`, `treasury`, `admins`, `auth`), not by *what it is* (components / hooks / utils).
2. **Thin shells, small pieces.** `app/**/page.tsx` composes; a feature *screen* wires hooks to components; *presentational components* only render.
3. **One place per concern.** Server data → `features/<f>/api|queries|mutations`. Toasts → one toast module. Dates → one date module. Permissions → one permission map.
4. **Dependency flows downward only** (§4), enforced by ESLint.
5. **Server state in TanStack Query, UI state in the component that owns it.** No third store.
6. **Client-rendered UI, server-enforced rules.** UI hides what a role cannot do; the API always decides.
7. **Prefer deleting code to abstracting it.** No new abstraction until a pattern appears 3 times.

---

## 3. Target folder structure

```
app/                                  ROUTING ONLY — thin server shells
  layout.tsx  globals.css  providers.tsx  manifest.ts  robots.ts  sitemap.ts
  page.tsx                            → <HomeScreen />
  sessions/[id]/
    page.tsx                          → <SessionScreen sessionId=… />  (inside <Suspense>)
    loading.tsx  error.tsx  not-found.tsx
  treasury/page.tsx                   → <TreasuryScreen />
  admins/page.tsx                     → <AdminsScreen />
  api/**/route.ts                     thin handlers (≤ 15 lines each)

features/                             CLIENT feature modules (+ isomorphic contracts)
  auth/
    components/    LoginDialog.tsx  PasswordDialog.tsx  RoleGate.tsx
    api.ts  keys.ts  queries.ts  mutations.ts
    permissions.ts                    isomorphic: can(user, "session:delete")
    schemas.ts  types.ts              isomorphic contracts
    index.ts                          public API of the feature
  sessions/
    components/    SessionsTable.tsx  SessionsFilterBar.tsx  SessionDialog.tsx
                   SessionSettingsDialog.tsx  RosterDialog.tsx  SessionHeader.tsx
    hooks/         useSessionsFilters.ts  useSessionDialogs.ts
    screens/       HomeScreen.tsx  SessionScreen.tsx  VisitorSessionView.tsx
    api.ts  keys.ts  queries.ts  mutations.ts  invalidate.ts
    schemas.ts  types.ts  index.ts
  matches/                            courts, queue, checklist, recommendation
    components/    CourtBoard.tsx  CourtCard.tsx  QueuePanel.tsx  NextMatch.tsx
                   PlayerGrid.tsx  PlayerGridHeader.tsx  PlayerGridRow.tsx
                   AssignDialog.tsx  HistoryDialog.tsx
    hooks/         useMatchActions.ts  useRecommendation.ts
    lib/           recommend.ts  stats.ts  courts.ts  queue.ts    (pure, ex-`lib/match.ts`)
    api.ts  keys.ts  mutations.ts  schemas.ts  types.ts  index.ts
  treasury/
    components/    TreasuryFilterBar.tsx  BalanceCards.tsx  CashflowChart.tsx
                   EntriesTable.tsx  TreasuryEntryDialog.tsx
    hooks/         useTreasuryFilters.ts
    screens/       TreasuryScreen.tsx
    api.ts  keys.ts  queries.ts  mutations.ts  schemas.ts  types.ts  index.ts
  admins/
    components/    AdminsTable.tsx  AdminDialog.tsx
    screens/       AdminsScreen.tsx
    api.ts  keys.ts  queries.ts  mutations.ts  schemas.ts  types.ts  index.ts

components/                           SHARED, feature-agnostic
  ui/             Button  Card  Pill  Avatar  Dialog  ConfirmDialog  Field  Select
                  Skeleton  Pagination  EmptyState  Toast  ToastHost  Spinner
  layout/         AppShell  AppHeader  PageContainer
  index.ts        (ui barrel only)

lib/                                  FRAMEWORK-AGNOSTIC helpers (no React components)
  api-client.ts   fetch wrapper + ApiError
  query-client.ts QueryClient factory (+ MutationCache toast hooks)
  toast.ts        tiny external store: toast.show(msg)
  date.ts         todayISO, addDays, monthRange, shiftMonth, presets, fmtDate, fmtTime
  money.ts        formatIDR
  forms.ts        parseForm(schema, values)
  cx.ts  constants.ts  site.ts

server/                               SERVER ONLY (every file starts with `import "server-only"`)
  db.ts  env.ts  errors.ts  http.ts  auth/ (token, password, session)
  sessions/  service.ts  repo.ts  dto.ts
  matches/   assign.ts  queue.ts  ticks.ts  lifecycle.ts  guards.ts  repo.ts  dto.ts
  treasury/  service.ts  repo.ts  dto.ts
  admins/    service.ts  repo.ts  dto.ts

prisma/  public/
```

Notes:

- `app/` contains no business components; a page file is a server shell (metadata + one feature screen).
- **`server/` is separate from `features/`.** A feature folder is client code plus two *isomorphic* files (`schemas.ts`, `types.ts`, and `auth/permissions.ts`) that both client and server may import. Server code never lives next to client code, so an accidental client import of Prisma is structurally impossible.
- `features/<f>/index.ts` is the **only** thing other features may import from (§4).
- `lib/match.ts` moves into `features/matches/lib/` because it is domain logic, not a generic helper.

---

## 4. Layers & dependency rules

```
app  ─▶  features  ─▶  components (ui, layout)  ─▶  lib
                  └──────────────────────────────▶  lib
server ─▶ features/*/{schemas,types}  &  lib        (never components, never feature UI)
```

| Layer | May import | Must NOT import |
|-------|-----------|-----------------|
| `app/**` (pages) | `features/*` (via `index.ts`), `components`, `lib`, `server` (route handlers only) | — |
| `features/<f>` | own files, `components/ui`, `components/layout`, `lib`, **other features only via their `index.ts`** | `server/*`, `app/*`, deep paths into another feature |
| `components/ui` | `lib` | `features/*`, `server/*` (a UI primitive knows nothing about the domain) |
| `components/layout` | `components/ui`, `lib`, `features/auth` (public API) | other features |
| `lib` | nothing app-specific (only npm packages) | `components`, `features`, `server` |
| `server` | `lib`, `features/*/schemas`, `features/*/types`, `features/auth/permissions` | `components`, feature UI/hooks/api |

Cross-feature rule of thumb: if `matches` needs something from `sessions`, import it from `@/features/sessions` (public API). If two features share a concept, move it **down** (to `components/ui` or `lib`) rather than sideways.

### Enforcing it (no new packages)

ESLint flat config, using the built-in `no-restricted-imports`:

```js
// eslint.config.mjs (additions)
const restrict = (patterns) => ({ rules: { "no-restricted-imports": ["error", { patterns }] } });

export default [
  ...existingNextConfigs,

  // ui must stay domain-free
  { files: ["components/ui/**"], ...restrict([
      { group: ["@/features/*", "@/server/*"], message: "ui/ is domain-free." } ]) },

  // lib must not know about React components or features
  { files: ["lib/**"], ...restrict([
      { group: ["@/components/*", "@/features/*", "@/server/*"], message: "lib/ is framework-agnostic." } ]) },

  // features: no server code, no deep imports into other features
  { files: ["features/**"], ...restrict([
      { group: ["@/server/*"], message: "Client features cannot import server code." },
      { group: ["@/features/*/*"], message: "Import other features via '@/features/<name>' only." } ]) },

  // size guards (warn first, tighten later)
  { files: ["**/*.{ts,tsx}"], rules: {
      "max-lines": ["warn", { max: 300, skipBlankLines: true, skipComments: true }],
      "max-lines-per-function": ["warn", { max: 150, skipBlankLines: true, skipComments: true }],
      "complexity": ["warn", 15],
  } },
];
```

> Inside a feature, relative imports (`./components/X`) are fine; the `@/features/*/*` restriction applies to *other* features. If the rule is too coarse for same-feature `@/` imports, use relative paths inside the feature (this is the convention anyway).

---

## 5. Next.js rules

Verified against the local docs shipped with Next 16.4.3 (`node_modules/next/dist/docs/`). `AGENTS.md` still applies: **read the matching doc page before writing Next-specific code.**

1. **`app/**/page.tsx`, `layout.tsx`, `loading.tsx`, `not-found.tsx` are Server Components** and stay thin: metadata + one screen. `error.tsx` must be a Client Component.
2. **Client boundary at the screen.** A screen (`HomeScreen`, `SessionScreen`, `TreasuryScreen`, `AdminsScreen`) is the first `"use client"` file. Everything it imports is already client; do not sprinkle the directive on every child.
3. **`"use client"` is required only on files that use hooks, event handlers, or browser APIs and are imported from a Server Component or are a screen.** Pure presentational components (props → JSX) have no directive. *(This replaces the v1 rule "every component starts with `use client`".)*
4. **One route per screen.** Sessions get a real route: `/sessions/[id]` (replaces the localStorage "current session" + `useHydrated`). Visitors and admins share the URL; the screen chooses visitor vs admin view from `useAuth()`.
5. **Dynamic params under `cacheComponents`:** without `generateStaticParams`, params are runtime data and must be read **inside a `<Suspense>` boundary**:

   ```tsx
   // app/sessions/[id]/page.tsx  (server shell)
   import { Suspense } from "react";
   import { SessionScreen, SessionScreenSkeleton } from "@/features/sessions";

   export default function Page({ params }: PageProps<"/sessions/[id]">) {
     return (
       <Suspense fallback={<SessionScreenSkeleton />}>
         <SessionRoute params={params} />
       </Suspense>
     );
   }

   async function SessionRoute({ params }: { params: PageProps<"/sessions/[id]">["params"] }) {
     const { id } = await params;
     return <SessionScreen sessionId={id} />;
   }
   ```
   (`PageProps`/`LayoutProps`/`RouteContext` are Next 16 global typed helpers — confirm the exact name in the generated types before use.)
6. **Loading/error UI by convention:** each route has `loading.tsx` (skeleton) and `error.tsx` (retry button). Components stop hand-writing "if loading return shimmer / if error return card" at every level; they only handle *data-specific* empty states.
7. **Navigation:** `next/link` for links, `useRouter().push` for programmatic navigation, `usePathname` for active nav state. No `window.location`, no manual `window.scrollTo` after navigation.
8. **Providers live in `app/providers.tsx`** (`QueryClientProvider`, `ToastHost`) and are rendered from `layout.tsx`. The layout stays a Server Component.
9. **Data fetching is client-side TanStack Query** (project decision: client-rendered UI). No fetching in `useEffect`, no `fetch` in components.
10. **Route Handlers:** keep the `route()` wrapper; `params` is a `Promise` (`await params`); do **not** export `runtime`, `dynamic`, or `revalidate` (unsupported with `cacheComponents`); every response is `no-store`.
11. **SEO:** metadata and JSON-LD only in server shells/layout; `lib/site.ts` constants; private routes (`/treasury`, `/admins`, `/sessions/*` if desired) get `robots: { index: false }` and are disallowed in `robots.ts`.
12. **`proxy.ts` (ex-middleware) is not used.** Authorization is enforced in route handlers (data access layer), never only at the edge.

---

## 6. React component rules

### 6.1 Four kinds of component

| Kind | Where | Job | Rules |
|------|-------|-----|-------|
| **Page shell** | `app/**/page.tsx` | metadata + render one screen | Server Component, ≤ 30 lines |
| **Screen** | `features/<f>/screens/` | Wire hooks → components; own dialog state; decide visitor/admin | ≤ 150 lines; no raw `fetch`; no Tailwind soup (layout classes only) |
| **Feature component** | `features/<f>/components/` | A meaningful piece of one feature (`CourtBoard`, `SessionsTable`) | ≤ 200 lines; gets data via props or a feature hook; one responsibility |
| **UI primitive** | `components/ui/` | Generic, domain-free (`Button`, `Dialog`, `Pill`) | No data hooks, no feature types; documented props; accessible by default |

### 6.2 Size & complexity budgets

| Thing | Target | Hard limit (review blocks) |
|-------|-------:|---------------------------:|
| Component file | ≤ 150 lines | 300 |
| Function / component body | ≤ 80 lines | 150 |
| `useState` calls in one component | ≤ 5 | 8 → extract a hook or a reducer |
| Props | ≤ 6 | 10 → group into an object or use composition |
| JSX nesting depth | ≤ 5 | 8 → extract a child component |

### 6.3 Logic goes in hooks; rendering stays dumb

- A component that has more than ~3 handlers or any `try/catch` moves them to a **feature hook** (`useMatchActions(sessionId)`, `useSessionsFilters()`), which returns plain values and callbacks.
- Pure calculations (stats, recommendation, date ranges) are plain functions in `features/*/lib` or `lib/` and are unit-testable without React.
- Derive, do not store: anything computable from props/state/query data is computed during render (`useMemo` only when it is measurably expensive, such as `recommend`).
- `useEffect` is only for syncing with something outside React (event listeners, timers, document title). Never to compute state from state.

### 6.4 One state for dialogs

Replace one boolean per dialog with a single discriminated union:

```tsx
type SessionDialog =
  | { type: "roster" }
  | { type: "settings" }
  | { type: "history" }
  | { type: "assign"; config: AssignDialogConfig }
  | { type: "confirm-delete-session" }
  | { type: "confirm-remove-queued"; game: Game };

const [dialog, setDialog] = useState<SessionDialog | null>(null);
const close = () => setDialog(null);
```

Render with one `switch` in a small `SessionDialogs` component. `SessionView`'s current 13 `useState`s become 2–3.

### 6.5 Actions: no hand-written busy/try/catch/toast

Use `useMutation` (§7). The component reads `isPending` and `variables`; messages come from mutation `meta`:

```tsx
const finish = useFinishMatch(sessionId);
<button disabled={finish.isPending && finish.variables === game.id}
        onClick={() => finish.mutate(game.id)}>Finish</button>
```

### 6.6 Props & composition

- Export a named `interface XProps` for any component with more than 3 props or that is exported across files. Tiny private components may keep inline types. *(Replaces the v1 "always inline" rule.)*
- Prefer **composition over flags**: `children`, slots (`header`, `footer`, `actions`) instead of `showX`/`hideY`/`isZ` booleans. More than 2 booleans in a props list is a smell.
- Callbacks are `onX`; handlers inside are `handleX`; booleans read as state (`isOpen`, `isPending`).
- Do not pass `user`/`role` down five levels. Use `useAuth()` where needed and `<RoleGate>` / `can()` for visibility (§6.8).
- Keys are stable ids, never array indexes for reorderable lists (queue, players).

### 6.7 Forms

- State is controlled and local to the dialog. Validation is `parseForm(schema, values)` from `lib/forms.ts`, using the **same Zod schema** as the server. It returns `{ data } | { errors: Record<string, string> }`.
- Show field errors under the field (`errorNotice`), server `fields` from `ApiError` are mapped into the same error shape.
- Submit buttons show `isPending` (spinner + disabled). Dialog closes only on success.

### 6.8 Permissions in the UI

`features/auth/permissions.ts` (isomorphic, used by both UI and API):

```ts
export type Permission =
  | "session:manage" | "session:delete" | "match:manage"
  | "treasury:read" | "treasury:add" | "treasury:edit" | "admins:manage";

const MATRIX: Record<Permission, readonly Role[]> = {
  "session:manage": ["SUPERADMIN"],
  "session:delete": ["SUPERADMIN"],
  "match:manage":   ["ADMIN", "SUPERADMIN"],
  "treasury:read":  ["ADMIN", "SUPERADMIN"],
  "treasury:add":   ["ADMIN", "SUPERADMIN"],
  "treasury:edit":  ["SUPERADMIN"],
  "admins:manage":  ["SUPERADMIN"],
};
export const can = (user: AuthUser | null, p: Permission) => !!user && MATRIX[p].includes(user.role);
```

UI: `if (can(user, "session:delete"))` or `<RoleGate permission="session:delete">…</RoleGate>`. Server: `route({ permission: "session:delete" }, …)` resolves to the same matrix. One edit changes both. (This is the SRD permission matrix in code form.)

### 6.9 Accessibility (unchanged from v1, now mandatory in `ui/`)

`aria-label` on icon buttons; labelled inputs; `role="status"` on the toast; `aria-busy` on skeletons; dialogs trap Esc; focusable controls are real `<button>`/`<a>`; checkbox cells have accessible names ("Ahmad — Game 3").

---

## 7. Data layer (client)

Standard: **TanStack Query** (already installed). The hand-rolled `lib/query.ts` from the SRD is superseded.

### 7.1 Per-feature files

```
features/<f>/api.ts         pure typed functions: list(), get(id), create(input)…  (no React)
features/<f>/keys.ts        query key factory
features/<f>/queries.ts     useXQuery hooks (thin useQuery wrappers, polling config)
features/<f>/mutations.ts   useXMutation hooks (useMutation + cache updates + toast meta)
features/<f>/invalidate.ts  helpers that invalidate related keys (once, not per action)
```

```ts
// features/sessions/keys.ts
export const sessionKeys = {
  all: ["sessions"] as const,
  list: (p?: SessionsFilterParams) => [...sessionKeys.all, "list", p ?? {}] as const,
  detail: (id: string) => [...sessionKeys.all, "detail", id] as const,
  summary: (id: string) => [...sessionKeys.all, "summary", id] as const,
};

// features/sessions/invalidate.ts
export const invalidateSession = (qc: QueryClient, id: string) =>
  Promise.all([
    qc.invalidateQueries({ queryKey: sessionKeys.detail(id) }),
    qc.invalidateQueries({ queryKey: sessionKeys.summary(id) }),
    qc.invalidateQueries({ queryKey: [...sessionKeys.all, "list"] }),
  ]);
```

### 7.2 Mutation pattern (replaces every function in the current `store.ts`)

```ts
// features/matches/mutations.ts
export function useFinishMatch(sessionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (gameId: string) => finishMatch(gameId),
    meta: { success: "Match finished", error: "Could not finish match" },
    onMutate: async (gameId) => {
      await qc.cancelQueries({ queryKey: sessionKeys.detail(sessionId) });
      const prev = qc.getQueryData<Session>(sessionKeys.detail(sessionId));
      qc.setQueryData<Session>(sessionKeys.detail(sessionId), (s) =>
        s && { ...s, games: s.games.map((g) => g.id === gameId
          ? { ...g, status: "DONE", courtNumber: undefined, finishedAt: Date.now() } : g) });
      return { prev };
    },
    onError: (_e, _id, ctx) => ctx?.prev && qc.setQueryData(sessionKeys.detail(sessionId), ctx.prev),
    onSettled: () => invalidateSession(qc, sessionId),
  });
}
```

Rules:
- **Hooks use `useQueryClient()`**; the global `queryClient` singleton exists only in `lib/query-client.ts` for the provider.
- Optimistic update only where latency is felt (ticks, court actions, reorder). Everything else: invalidate on settle.
- Idempotent API calls for toggles (`PUT … { checked }`), as in the SRD.
- Polling: `refetchInterval` set in the query hook (5 s admin / 10 s visitor), paused when hidden (`refetchIntervalInBackground: false`).

### 7.3 One toast module, no prop drilling

```ts
// lib/toast.ts — tiny external store (no dependency)
type Listener = () => void;
let message = ""; const listeners = new Set<Listener>(); let timer: ReturnType<typeof setTimeout>;
export const toast = {
  show(msg: string, ms = 2600) { message = msg; listeners.forEach((l) => l());
    clearTimeout(timer); timer = setTimeout(() => { message = ""; listeners.forEach((l) => l()); }, ms); },
  subscribe: (l: Listener) => (listeners.add(l), () => listeners.delete(l)),
  get: () => message,
};
```

`components/ui/ToastHost.tsx` renders it once (in `providers.tsx`) with `useSyncExternalStore`. The QueryClient reports results centrally:

```ts
// lib/query-client.ts
new QueryClient({
  mutationCache: new MutationCache({
    onSuccess: (_d, _v, _c, m) => m.meta?.success && toast.show(String(m.meta.success)),
    onError: (e, _v, _c, m) => toast.show(e instanceof Error ? e.message : String(m.meta?.error ?? "Something went wrong")),
  }),
  defaultOptions: { queries: { retry: 1, staleTime: 2_000, refetchOnWindowFocus: true } },
});
```

Result: **`onToast` disappears from every signature.** Components that need a one-off message call `toast.show("…")` directly.

### 7.4 Filters, presets and pagination (shared)

`SessionsTable` and the treasury list share the same shape: period preset, custom range, search, type/status, page, page size. Build it **once**:

- `lib/date.ts`: `todayISO`, `addDays`, `monthRange`, `shiftMonth`, `fmtDate`, `fmtTime`, plus `resolvePeriod(preset, { month, from, to })` returning `{ from?, to? }`.
- `features/sessions/hooks/useSessionsFilters.ts` and `features/treasury/hooks/useTreasuryFilters.ts` both build on a generic `usePeriodFilters()` hook; each returns `{ params, state, setters, reset, hasActiveFilters }`.
- `components/ui/Pagination.tsx` and a shared `PeriodPicker` replace the duplicated JSX.

(Optional later: sync filters to the URL via `useSearchParams`, which needs a `<Suspense>` boundary under `cacheComponents`.)

### 7.5 What is NOT in React Query

- The selected session id → **the URL** (`/sessions/[id]`).
- Dialog open/close, form drafts, sort/seed for "shuffle" → local `useState`.
- Auth user → `useAuth()` (a query on `/api/auth/me`), no copy in another store.

---

## 8. Server layer

Keep the current good shape (`route()` → service → Prisma → DTO) and tighten it:

1. **Route handler:** ≤ 15 lines. `export const POST = route({ permission: "match:manage", body: assignInput }, async ({ params, body, user }) => ok(await assignGame((await params).id, body, user)))`.
2. **Service** (`server/<f>/service.ts` or split files): business rules and transactions; throws `HttpError`; never touches `Request`/`Response`.
3. **Repo** (`server/<f>/repo.ts`): only Prisma calls (with `tx` passed in). Services never write `prisma.x.findMany` inline once the file passes ~200 lines.
4. **DTO** (`server/<f>/dto.ts`): the only place Prisma rows become API shapes; passwords/audit ids never leave.
5. **Split large services:** `games.ts` → `matches/assign.ts`, `queue.ts`, `ticks.ts`, `lifecycle.ts`, `guards.ts` (court occupied, player busy, locked). Target ≤ 200 lines per file.
6. **`server/errors.ts`** owns `HttpError` (today it lives in `auth.ts`); `http.ts` and services import from there.
7. **`server/env.ts`** parses `process.env` with Zod once; nothing else reads `process.env`.
8. **Authorization** via `permission` option → `can()`; role literals no longer appear in route files.
9. All writes spanning multiple rows use `prisma.$transaction`; retries only for the `(sessionId, seq)` unique conflict.
10. Every file in `server/` starts with `import "server-only"`.

---

## 9. Validation & types

- **Zod schemas** live in `features/<f>/schemas.ts` (isomorphic) and are used by forms and routes. `z.infer` types are exported next to them.
- **Domain/DTO types** live in `features/<f>/types.ts`. The current single `lib/types.ts` is split per feature; shared primitives (`Role`, `ISODate`) go to `features/auth/types.ts` / `lib/types.ts`.
- Do not duplicate a type by hand on the client if a Zod schema or DTO already defines it.
- No `any`; prefer `unknown` + parsing at boundaries (`api<T>` results are typed, request bodies are validated).

---

## 10. Styling

- **Tailwind only**, as today. No CSS modules.
- **Semantic tokens in `@theme`** (`globals.css`) for every repeated colour/radius/shadow, then use `text-ink`, `bg-brand`, `border-line`, `text-danger` instead of hex. Start with the hexes that appear most (`#204a74`, `#183e6b`, `#5da5e4`, `#e1edf7`, `#eaf5ff`, `#b5524f`). New hex values in components are not allowed.
- **If it is used 3+ times, it becomes a component, not a class string.** `btn()`, `pill()`, `card`, `avatar` in `lib/ui.ts` become `<Button variant size>`, `<Pill variant>`, `<Card>`, `<Avatar name>` in `components/ui/`. They carry the behaviour and a11y that a class string cannot (disabled/pending state, focus ring, aria).
- Remaining feature-specific class strings are co-located in the feature file (or a `styles.ts` next to it), not in a global grab-bag. `lib/ui.ts` is deleted at the end of the migration.
- Conditional classes use `cx(...)`. One responsive breakpoint (`max-[860px]:`) stays, expressed as a named custom variant if you want to stop repeating the arbitrary value.
- Skeletons: one `<Skeleton />` primitive instead of repeating the shimmer class string.

---

## 11. Naming, files and imports

| Thing | Convention | Example |
|-------|------------|---------|
| Component file | `PascalCase.tsx`, one component per file, filename = export | `CourtCard.tsx` |
| Hook file | `useCamelCase.ts` | `useMatchActions.ts` |
| Other modules | `kebab-case.ts` (single word is fine) | `query-client.ts`, `date.ts` |
| Folders | `kebab-case` | `features/matches/` |
| Screen | `<Name>Screen` | `SessionScreen` (not `MatchApp`) |
| Dialog | `<Thing>Dialog` | `AssignDialog` |
| Exports | **Named exports only.** Default exports only for Next special files (`page`, `layout`, `route` handlers use named) | — |
| Query hooks | `use<Thing>Query` / `use<Thing>` for reads; `use<Verb><Thing>` for mutations | `useSessionDetail`, `useFinishMatch` |
| Handlers | `handleX` inside, `onX` as props | `onFinish`, `handleFinish` |
| IDs on key controls | kebab-case `id`, as today | `id="assign-court"` |

Import order (blank line between groups): `react` / `next/*` → third-party → `@/lib/*` → `@/components/*` → `@/features/*` (public API) → relative (`./`, `../`) → `import type` last within each group. Use `import type` for type-only imports.

**Barrels:** `features/<f>/index.ts` exports the feature's *public API* (screens, shared dialogs, hooks other features need). Never create a barrel inside `components/` subfolders other than `components/ui/index.ts`. Never import from another feature's internals.

---

## 12. Quality gates

| Gate | Command / rule | When |
|------|----------------|------|
| Types | `npx tsc --noEmit` | every commit |
| Lint | `npm run lint` (includes boundary + size rules) | every commit |
| Build | `npm run build` | every PR |
| Unit tests (recommended) | pure logic first: `lib/date.ts`, `features/matches/lib/*` (recommend, stats), `server/matches/guards.ts`. Needs a test runner (e.g. Vitest) — **new dev dependency, requires your approval** | when added |
| Manual QA | the script in `SRD.md` (Part C) | every release |

Definition of done for a PR: no new file over the size limits, no new `onToast` prop, no direct `fetch` in a component, no cross-feature deep import, no new hex colour, lint + tsc + build green.

---

## 13. Migration plan (behaviour-preserving)

Every step is a separate PR, ships on its own, and leaves the app working. Do them in this order — each one makes the next smaller.

| Step | Work | Removes / creates | Size |
|------|------|-------------------|:----:|
| **M0** Guardrails | Add the ESLint rules from §4 as **warnings**; note current violations as the baseline. | `eslint.config.mjs` | S |
| **M1** Shared foundations | Create `components/ui/` (move `Dialog`/`ConfirmDialog`, **delete `Modal.tsx` alias**, add `Button`, `Pill`, `Card`, `Avatar` (move `initials` here), `Skeleton`, `Pagination`, `Field`). Create `lib/date.ts` (dedupe `pad2`, `getMonthRange`, `addDaysISO`, presets), `lib/money.ts`, `lib/forms.ts`. | Duplicates in `MatchApp` / `TreasuryApp`; `initials` import from `PlayerGrid` | M |
| **M2** Toast | Add `lib/toast.ts`, `ToastHost`, `providers.tsx`; wire `MutationCache` meta. Remove toast state + markup from `MatchApp`, `TreasuryApp`, `AdminsApp`. Replace `onToast` props with `toast.show`. | 33+ `onToast` references | M |
| **M3** Data layer split | Split `lib/store.ts` into `features/{auth,sessions,matches,treasury,admins}/{api,keys,queries,mutations}.ts`; rewrite actions as `useMutation` hooks with `invalidateSession`; hooks use `useQueryClient()`. Rename `lib/api.ts`→`lib/api-client.ts`, `lib/query.ts`→`lib/query-client.ts`. **Delete `lib/store.ts`.** | 661-line file; copy-pasted invalidations | L |
| **M4** Session route | Add `/sessions/[id]` (+ `loading.tsx`, `error.tsx`, `not-found.tsx`); the sessions table links to it. Remove `useCurrentSessionId`, `selectSession`, `useHydrated`, `mbg-current-v2` localStorage. | Hydration hacks | M |
| **M5** Split `MatchApp.tsx` | → `HomeScreen`, `VisitorSessionView`, `SessionsTable` + `SessionsFilterBar` + `useSessionsFilters`, `SessionScreen` + `SessionHeader` + `SessionDialogs` + `useSessionDialogs` + `useMatchActions`. Target: no file > 200 lines. | `MatchApp.tsx` (1,316 lines) | L |
| **M6** Split `TreasuryApp.tsx` | → `TreasuryScreen`, `TreasuryFilterBar`, `BalanceCards`, `CashflowChart` (already a separate function), `EntriesTable`, `useTreasuryFilters` (built on the shared period hook). | `TreasuryApp.tsx` (970 lines) | M |
| **M7** Matches feature | Move `CourtBoard`, `CourtCard`, `QueuePanel`, `NextMatch`, `PlayerGrid` (split header/row), `AssignDialog`, `HistoryDialog` and `lib/match.ts` into `features/matches/`. | Cross-imports between components | M |
| **M8** Auth & permissions | `features/auth` with `permissions.ts` + `RoleGate`; replace `user.role === …` checks and per-route role arrays with `can()` / `permission`. Move `AppHeader` to `components/layout`. | Scattered role checks | M |
| **M9** Server restructure | `lib/server/*` → `server/*` by feature; split `games.ts`; add `errors.ts`, `env.ts`; introduce repos where files exceed 200 lines. | 461-line service | M |
| **M10** Styling tokens | Add `@theme` tokens; replace hex in components; convert `btn/pill/card/avatar` call sites to the new primitives; delete `lib/ui.ts`. | Global class-string file | M |
| **M11** Tighten | Flip the ESLint rules from `warn` to `error`; update `README.md` with this structure. | — | S |

### Old → new mapping (key files)

| Current | Becomes |
|---------|---------|
| `components/MatchApp.tsx` | `features/sessions/screens/{HomeScreen,SessionScreen,VisitorSessionView}.tsx`, `features/sessions/components/{SessionsTable,SessionsFilterBar,SessionHeader,SessionDialogs}.tsx`, `features/sessions/hooks/*` |
| `components/TreasuryApp.tsx` | `features/treasury/screens/TreasuryScreen.tsx`, `features/treasury/components/*`, `features/treasury/hooks/useTreasuryFilters.ts` |
| `components/AdminsApp.tsx`, `AdminDialog.tsx` | `features/admins/screens/AdminsScreen.tsx`, `features/admins/components/*` |
| `components/AppHeader.tsx` | `components/layout/AppHeader.tsx` (+ `NavLinks`, `UserMenu` extracted) |
| `components/Dialog.tsx`, `Modal.tsx` | `components/ui/Dialog.tsx` (alias removed) |
| `components/PlayerGrid.tsx` (+ `initials`) | `features/matches/components/PlayerGrid*.tsx`; `initials` → `components/ui/Avatar.tsx` |
| `components/QueryProvider.tsx` | `app/providers.tsx` |
| `lib/store.ts` | split across `features/*/{api,queries,mutations}.ts` |
| `lib/auth.ts`, `LoginDialog`, `PasswordDialog` | `features/auth/*` |
| `lib/match.ts` | `features/matches/lib/{recommend,stats,courts,queue}.ts` |
| `lib/types.ts`, `lib/schemas.ts` | split per feature into `types.ts` / `schemas.ts` |
| `lib/format.ts` | `lib/date.ts` + `lib/money.ts` |
| `lib/ui.ts` | `components/ui/*` + `@theme` tokens (deleted last) |
| `lib/server/*` | `server/<feature>/*` |

---

## 14. How this changes the SRD's Part B

| SRD Part B rule | Now |
|-----------------|-----|
| B.2 `components/` flat, `lib/` holds everything shared | **Feature folders**, `components/` only for shared UI/layout, `lib/` only framework-agnostic helpers, `server/` split out |
| B.3 "Every client component starts with `use client`" | Only files that need it; the **screen** is the boundary |
| B.3 "Props typed inline" | Named `XProps` interface when > 3 props or exported |
| B.3 "Toast = one local state in the screen" | One global `toast` module + `ToastHost`; mutation `meta` drives messages |
| B.5 "UI never calls fetch; calls action functions in `lib/store.ts`" | UI calls **feature hooks** (`useXMutation`); `api.ts` holds fetch calls |
| B.11 "Hand-rolled `lib/query.ts`, no data-fetching library" | **TanStack Query** is the standard (already in use) |
| B.5 "Selected session stored in localStorage" | **URL route** `/sessions/[id]` |
| B.4 shared class strings in `lib/ui.ts` | UI primitives in `components/ui` + `@theme` tokens |
| B.9 server layout `lib/server/*` | `server/<feature>/{service,repo,dto}.ts` |
| Everything else in Part B (formatting, naming of IDs, comments, English copy style, a11y, Git hygiene, security rules for passwords/cookies/CSRF) | **Unchanged** |

---

## 15. Quick reference (print this)

**Do**
- Put a new piece of UI in the feature that owns it; promote to `components/ui` only if two features need it.
- Keep screens ≤ 150 lines: hooks for logic, components for rendering.
- Use `useMutation` + `meta` for every write; use `invalidateSession`-style helpers.
- Use `can(user, permission)` for visibility and `permission` on routes.
- Put every date calculation in `lib/date.ts`.
- Put every selected-thing-that-should-be-shareable in the URL.

**Don't**
- Don't add to `MatchApp.tsx`, `TreasuryApp.tsx`, or `lib/store.ts` — they are being dismantled.
- Don't import one feature's internals from another, or `server/*` from the client.
- Don't add `onToast` props, boolean-per-dialog state, `try/catch/finally` busy boilerplate, or `localStorage` for server data.
- Don't hardcode hex colours or role strings in components.
- Don't add a dependency (state manager, form library, UI kit) without approval.

**Where does it go?**

| I'm writing… | Put it in |
|--------------|-----------|
| A new page | `app/<route>/page.tsx` (shell) + `features/<f>/screens/<Name>Screen.tsx` |
| A server call | `features/<f>/api.ts` |
| A hook that reads data | `features/<f>/queries.ts` |
| A hook that writes data | `features/<f>/mutations.ts` |
| A calculation | `features/<f>/lib/*.ts` (domain) or `lib/*.ts` (generic) |
| A generic button/dialog/pill | `components/ui/` |
| A business rule enforced by the API | `server/<f>/service.ts` |
| A Zod schema | `features/<f>/schemas.ts` |
| A permission | `features/auth/permissions.ts` |
