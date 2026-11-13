# MBG — Loading Performance Plan (frame first, data second)

**Scope:** loading experience only (what the user sees between tapping the link and being able to use the page).
**Inputs:** Lighthouse mobile reports for `/` and `/treasury` (captured 2026-11-12, Moto G Power emulation, Slow 4G, Lighthouse 13.5.0) plus a production build of the current code, inspected for prerendered HTML and per-route JavaScript size.
**Companion:** `SRD.md` (§10 describes the current render pipeline; §13 the coding rules this plan must follow).

---

## 1. The problem in one paragraph

The server sends a page that contains **only the header and one empty 320 px card**. Everything else waits for: JavaScript download → hydration → `/api/auth/me` → data requests. On Slow 4G that is 3+ seconds of an empty-looking card, and the card then gets replaced by a layout of a completely different size, so the page jumps. Fixing this is mostly about (a) sending a real, correctly-shaped **frame** in the first HTML, (b) making the placeholders actually visible and the same size as the content, and (c) shortening the chain of round trips and the JS that has to arrive before data can load.

---

## 2. Evidence

### 2.1 Lighthouse (mobile, Slow 4G)

| Metric | `/` (admin, session open) | `/treasury` | Target |
|--------|:---:|:---:|:---:|
| Performance score | **62** | 89 | ≥ 90 both |
| First Contentful Paint | 0.8 s | 0.9 s | ≤ 1.0 s (keep) |
| Largest Contentful Paint | **3.3 s** | **3.3 s** | ≤ 2.5 s |
| Total Blocking Time | **210 ms** | 130 ms | < 200 ms |
| Cumulative Layout Shift | **0.931** | 0.009 | < 0.1 |
| Speed Index | **4.4 s** | **4.0 s** | ≤ 3.4 s |
| Flagged insights | Layout shift culprits, LCP breakdown, Network dependency tree, Legacy JS (14 KiB), DOM size | Render-blocking requests (110 ms), LCP breakdown, Network dependency tree, Legacy JS (14 KiB) | — |
| Flagged diagnostics | Main-thread work 2.8 s, unused JS 52 KiB, 6 long tasks | Main-thread work 2.1 s, unused JS 54 KiB, 5 long tasks | — |

The Lighthouse filmstrip for `/` shows exactly the user's complaint: several frames of header + white cards, then the header's right side changes, then a second card appears, then the real page.

> The PDFs only show the insight **titles** (details are collapsed). Phase 0 asks you to re-run with the insights expanded so the LCP element and the layout-shift culprits are confirmed rather than inferred.

### 2.2 What the code and build show

Measured on a production build of this repo (client chunks and prerendered HTML; Prisma and Google Fonts were stubbed in a scratch copy so the build could run offline, which does not affect client JS).

| # | Finding | Evidence |
|---|---------|----------|
| E1 | **First HTML has no frame.** `/` and `/treasury` prerender to header + a single `aria-busy` shimmer card. | `.next/server/app/index.html`: `<main>` holds one `h-80` card. |
| E2 | **The shimmer looks blank.** `shimmerCard` = white card with gradient `#fff → #eef6fd → #fff`; the highlight is almost the same colour as the card. | `lib/ui.ts` `shimmerCard`; matches the white cards in the filmstrip. |
| E3 | **Header flashes the logged-out state.** The prerendered header contains "Admin login"; `AppHeader` ignores `authLoading`. | HTML contains `Admin login`; `components/layout/AppHeader.tsx`. |
| E4 | **Two skeleton cards for organisers.** `AdminSessionContainer` and `SessionsDirectory` each render `shimmerCard` and resolve independently. | `InternalMatchesWorkspace.tsx`. There are **9** `shimmerCard` render sites in total (listed in Phase 2). |
| E5 | **Waterfall.** Auth is a prerequisite for choosing the view; data hooks only mount after `hydrated && !authLoading`. | `MatchApp.tsx`, `TreasuryApp.tsx`, `AdminsApp.tsx`. |
| E6 | **JS on the critical path:** `/` = 13 chunks, **821 KiB raw / ~248 KiB gzip**; `/treasury` = 12 chunks, ~239 KiB gzip. A single chunk containing **Zod is ~39 KiB gzip** and loads on every route. | `.next/static/chunks`, script tags in prerendered HTML. |
| E7 | **Why Zod is there:** `GlobalDialogs` is in the shell layout and statically imports `LoginDialog`, `PasswordDialog`, `SessionDialog`, which import `lib/schemas`. `SessionView` statically imports five more dialogs. None is visible on first paint. | `app/(shell)/layout.tsx`, `components/layout/GlobalDialogs.tsx`, `components/matches/admin/SessionView.tsx`. |
| E8 | Stylesheet is small (**~34 KiB raw / ~7 KiB gzip**), so the "render-blocking 110 ms" on `/treasury` is mostly one network round trip, not CSS weight. | `.next/static/chunks/*.css` |
| E9 | `getTreasurySummary` loads **all** active entries to build the 6-month chart; it grows forever. | `lib/server/treasury.ts` |

### 2.3 Why `/` is worse than `/treasury`

Same LCP (3.3 s), but `/` has CLS 0.931 vs 0.009. Treasury swaps one card for one page. `/` for an organiser swaps one card for a session view, **and** adds a second card for the directory a moment later. Content that moves into view while the user watches is what CLS counts. (Confirm with the "Layout shift culprits" expansion.)

---

## 3. Principles and targets

1. **Frame first.** The first HTML shows the real chrome: header with stable slots, page title/eyebrow, section headings, card outlines. Only the *data inside* is a placeholder.
2. **A placeholder looks like its content and has its size.** Same card, same row heights, same grid. When data arrives it replaces the placeholder in place: **no layout movement**.
3. **Placeholders are visible.** Clearly darker than the card background, subtle motion, `prefers-reduced-motion` respected.
4. **Never block the frame on auth or data.** Auth decides *which* content fills the frame, not *whether* the frame exists.
5. **Start data requests as early as possible and in parallel.**
6. **Don't ship code for things the user hasn't opened** (dialogs).
7. Keep every rule in `SRD.md` §13 (named exports, Tailwind only, class strings in `lib/ui.ts`, existing DOM ids and ARIA pairs unchanged).

**Honest expectations.** Phases 1–3 fix perceived speed and CLS (and improve Speed Index); they do not by themselves make the data arrive sooner. LCP and TBT are won in Phases 4–6 (fewer round trips, less JS, faster API). The "Expected effect" columns below are estimates to be checked by re-running Lighthouse after each phase.

---

## 4. Roadmap at a glance

| Phase | What | Main metric it moves | Effort | Risk |
|------:|------|----------------------|:------:|:----:|
| 0 | Baseline + measuring tools | — | 1 h | none |
| 1 | Visible skeleton primitives | perceived load | 1 h | none |
| 2 | Frame-first screens (shaped skeletons, one per screen) | perceived load, CLS, Speed Index | 1 day | low |
| 3 | Stable header (no logged-out flash) | CLS, perceived load | 2 h | low |
| 4 | Remove the request waterfall (early prefetch, shared query options) | LCP, Speed Index | 3–4 h | medium |
| 5 | JS diet (lazy dialogs, legacy JS, CSS) | TBT, FCP/LCP on slow CPU | 3–4 h | low |
| 6 | Faster first data (region check, treasury chart query) | LCP (API-bound) | 2–3 h | low |
| 7 | *Optional, only if still needed:* server-known auth / pre-paint role hint | LCP, flash-free first paint | 1–2 days | high |

Recommended order: **0 → 1 → 2 → 3 → 5 → 4 → 6**, re-measuring after each. Phases 1–3 answer the "blank card" complaint directly and are safe to ship first. Phase 5 is cheap and independent. Phase 4 touches data flow, so do it once the frame is solid.

---

## 5. Phases

### Phase 0 — Baseline and tools (1 h)

- [ ] Run Lighthouse (Chrome DevTools → Lighthouse → Mobile → **Navigation**, Slow 4G, clear storage) against a **production build or Vercel preview**, never `next dev`. Do **three runs per scenario and keep the median**:
  - `/` logged out · `/` logged in as admin with a session selected · `/treasury` logged in.
- [ ] On the logged-in `/` run, expand **Layout shift culprits**, **LCP breakdown** and **Network dependency tree** and save screenshots in the PR. Record which element is the LCP element and what shifts.
- [ ] Add the bundle measuring script below as `scripts/measure-bundle.mjs` and run it after `npm run build` to record JS size per route.
- [ ] Record the numbers in a table in the PR description (use §2.1 as the template).

```js
// scripts/measure-bundle.mjs — usage: npm run build && node scripts/measure-bundle.mjs
import fs from "node:fs";
import zlib from "node:zlib";

for (const page of ["index", "treasury"]) {
  const html = fs.readFileSync(`.next/server/app/${page}.html`, "utf8");
  const chunks = [...new Set(
    [...html.matchAll(/\/_next\/(static\/chunks\/[\w.\-]+\.js)/g)].map((m) => m[1]),
  )];
  let raw = 0, gz = 0;
  for (const c of chunks) {
    const buf = fs.readFileSync(`.next/${c}`);
    raw += buf.length;
    gz += zlib.gzipSync(buf).length;
  }
  console.log(`${page}: ${chunks.length} chunks, ${(raw / 1024).toFixed(1)} KiB raw, ${(gz / 1024).toFixed(1)} KiB gzip`);
}
```

Baseline from this analysis: `index` 13 chunks / 821 KiB raw / **247.8 KiB gz**; `treasury` 12 / 783 KiB / **239.0 KiB gz**.

---

### Phase 1 — Skeleton primitives that are actually visible (1 h)

**Goal:** a placeholder that reads as "loading" instead of "blank", used by every later phase.

**Files:** `app/globals.css`, `lib/ui.ts`, new `components/ui/Skeleton.tsx`.

1. Add theme tokens in `globals.css` (`@theme`), instead of one-off hex values (SRD §13.4):

```css
@theme {
  --color-skeleton: #e3eef9;      /* base bar: visibly darker than the white card */
  --color-skeleton-hi: #f2f8fe;   /* shimmer highlight */
}

@media (prefers-reduced-motion: reduce) {
  .skeleton { animation: none; }
}
```

2. In `lib/ui.ts` add class strings next to `shimmerCard` (keep `shimmerCard` until Phase 2 removes its last use, then delete it):

```ts
export const skeleton =
  "skeleton animate-shimmer rounded-lg bg-skeleton " +
  "bg-[linear-gradient(100deg,var(--color-skeleton)_30%,var(--color-skeleton-hi)_50%,var(--color-skeleton)_70%)] bg-size-[200%_100%]";
export const skelBar = (w: string, h = "h-3") => cx(skeleton, h, w); // e.g. skelBar("w-24")
export const skelCircle = cx(skeleton, "size-8 rounded-full");
```

3. New `components/ui/Skeleton.tsx` (named export, no `"use client"` needed because it has no hooks, so it can render in the server HTML):

```tsx
import { cx, skeleton } from "@/lib/ui";

/** Wrap a whole loading region. Announces once, hides the bars from screen readers. */
export function SkeletonRegion({ label, className, children }: {
  label: string; className?: string; children: React.ReactNode;
}) {
  return (
    <div role="status" aria-busy="true" data-skeleton className={className}>
      <span className="sr-only">{label}</span>
      <div aria-hidden="true">{children}</div>
    </div>
  );
}
export function SkeletonBar({ className }: { className?: string }) {
  return <div className={cx(skeleton, "h-3", className)} />;
}
```

**Done when:** replacing one `shimmerCard` with a `SkeletonRegion` containing three `SkeletonBar`s is clearly visible on a phone in bright light and passes the Lighthouse contrast audit (skeleton bars are decorative and `aria-hidden`).

---

### Phase 2 — Frame-first screens (1 day)

**Goal:** the first HTML contains the real frame; data areas are shaped placeholders with the same dimensions as the real content.

**Rules for each screen skeleton**

- **Static (real text, rendered immediately):** eyebrows, page titles that do not depend on data (`Club treasury`, `Admin accounts`, `Courts`, `Queue`, `Games played`, `Next match`, `All game sessions`), card outlines/headers, and button *shapes* (disabled or skeleton pill when role-dependent).
- **Skeleton (bars):** session name, counts, rows, player names, amounts, table cells.
- Reserve real sizes: copy the paddings/heights of the final component; use fixed `h-*` for bars and a `min-h-*` for lists (rows × row height). A mobile (≤ 860 px) layout is the one that matters for CLS.
- Put each skeleton **next to the component it mirrors** and keep it in sync (`SessionView.tsx` ↔ `SessionViewSkeleton.tsx`).
- Skeletons must not use hooks, so they render in the server HTML.

**New files (all named exports):**

| File | Mirrors | Contents |
|------|---------|----------|
| `components/matches/MatchesSkeleton.tsx` | generic `/` while hydration/auth pending | hero-height block + 2 card outlines (neutral for both visitor and organiser) |
| `components/matches/admin/SessionViewSkeleton.tsx` | `SessionView` | header bar (date pill, h1 bar, 3 button pills), **Courts** card with 2 court cards (Team A / vs / Team B rows), **Queue** card with 2 rows, then the 1.7fr/1fr grid: **Games played** card with ~6 player rows, **Next match** card |
| `components/matches/admin/SessionsDirectorySkeleton.tsx` | `SessionsDirectory` | card head + toolbar + 5 table rows + pager |
| `components/matches/ExternalMatchesSkeleton.tsx` | `ExternalMatchesView` | hero text + 3×(card) grid (1 column on mobile) |
| `components/matches/VisitorViewSkeleton.tsx` | `VisitorView` | header + Courts / Queue / Games-played cards |
| `components/treasury/TreasurySkeleton.tsx` | `TreasuryContent` (+ hero frame in `TreasuryApp`) | real "Club treasury" eyebrow, 4 KPI cards, chart card, table card with 6 rows |
| `components/admins/AdminsSkeleton.tsx` | `AdminsContent` | real "Admin accounts" hero, table card with 4 rows |

**Replace all 9 `shimmerCard` sites:**

| Site | Replace with |
|------|--------------|
| `MatchApp.tsx:23` (`!hydrated \|\| authLoading`) | `<MatchesSkeleton />` |
| `ExternalMatchesView.tsx:56` | `<ExternalMatchesSkeleton />` |
| `VisitorView.tsx:31` | `<VisitorViewSkeleton />` |
| `AdminSessionContainer.tsx:18` | `<SessionViewSkeleton />` |
| `SessionsDirectory.tsx:68` | `<SessionsDirectorySkeleton />` |
| `TreasuryApp.tsx:27` | `<TreasurySkeleton />` (frame, hero text included) |
| `TreasuryContent.tsx:55` | `<TreasurySkeleton />` (data part only; keep the hero rendered) |
| `AdminsApp.tsx:25` | `<AdminsSkeleton />` |
| `AdminsContent.tsx:36` | `<AdminsSkeleton />` |

Then delete `shimmerCard` from `lib/ui.ts`.

**Stop the "second card appears later" jump on `/` for organisers.** `InternalMatchesWorkspace` mounts the session view and the directory at once. Options, in order of preference:
1. Keep both mounted, but each shows its **shaped** skeleton (above). The directory sits below the session view, so as long as the session skeleton has the same height as the loaded view, the directory does not move.
2. If heights still differ noticeably (courts × players vary), give `SessionViewSkeleton` a `min-h` taken from a typical session, and verify in the Layout Shift track.

**Keep the frame through the auth gate (gated routes).** `/treasury` and `/admins` should render their real hero/title frame while auth resolves, then either the data or the existing "Please log in" / "Not allowed" card in the same slot. Anonymous visitors on those private routes will see a short frame-to-card swap; that path is rare and acceptable.

**Test it:** `curl -s https://<preview>/ | grep -c "data-skeleton"` > 0, and the first paint on a throttled phone shows structure (cards with bars), not a plain white card.

**Expected effect:** much better perceived loading and Speed Index; CLS on `/` drops sharply (target < 0.1); LCP unchanged until Phase 4–6.

---

### Phase 3 — Stable header (2 h)

**Problem:** `AppHeader` renders the logged-out variant ("Admin login") until `/api/auth/me` returns, then swaps to "＋ New / ☰ Menu" (desktop: nav + username + buttons). This is a visible flash and shifts layout on the right side.

**Change (in `components/layout/AppHeader.tsx`):**

- Read `loading` from `useAuth()` (already available).
- While `loading`, render a **fixed-size placeholder** in the auth-dependent slot: on mobile one pill the width of the Menu button (`w-[84px] h-9`), on desktop two pills matching "Admin login"'s width. Keep the logo/brand and sync indicator as they are.
- After load, swap in the real controls with the same wrapper dimensions.

**Notes:** this deliberately reverses the preserved oddity "`AppHeader` ignores `authLoading`" from `REFACTOR_NOTES.md`; update that note. Existing ids (`admin-login-btn`, `mobile-menu-btn`, `new-session`, `logout-btn`) must stay on the real buttons.

**Done when:** a throttled filmstrip never shows "Admin login" for a logged-in admin, and CLS attributed to the header is 0.

---

### Phase 4 — Remove the request waterfall (3–4 h)

**Today:** HTML → JS → hydrate → `useHydrated` flips → `/api/auth/me` → *then* data hooks mount → data. Each hop costs a full round trip on Slow 4G.

**Target:** the auth request and the data request start **when the JS evaluates**, in parallel, and the UI consumes the already in-flight promises.

1. **Share query definitions** so hooks and prefetch use identical keys/functions. New `lib/data/query-options.ts` using TanStack's `queryOptions`:

```ts
import { queryOptions } from "@tanstack/react-query";
import { api } from "../api";
import { queryKeys } from "../query";
import type { AuthUser, Session } from "../types";

export const authMeOptions = queryOptions({
  queryKey: queryKeys.authMe,
  queryFn: () => api<{ user: AuthUser | null }>("/auth/me"),
  staleTime: 30_000, // login()/logout() set the cache explicitly, so a longer stale time is safe
});

export const sessionDetailOptions = (id: string) =>
  queryOptions({
    queryKey: queryKeys.sessionDetail(id),
    queryFn: async () => (await api<{ session: Session }>(`/sessions/${id}`)).session,
  });
```

   Add a `sessionsPageOptions(params)` factory the same way (move the query-string building out of `useSessionsList` into it).

   Make `useAuth()` and `useSessionDetail()` use these options (keep their polling settings), and export the default list params as constants (e.g. `VISITOR_LIST_PARAMS`, `ORGANISER_LIST_PARAMS`) so prefetch and the screens build the **same query key**.

   > `staleTime: 30_000` for auth matters: with the current 2 s default, a prefetch that finished before hydration would be considered stale and be fetched a second time on mount.

2. **Start fetching at module evaluation.** In `components/providers/QueryProvider.tsx` (already a client module that imports the shared `queryClient`), run a guarded prefetch:

```ts
if (typeof window !== "undefined") {
  void queryClient.prefetchQuery(authMeOptions);
  const hint = readBootHint(); // see 3 below
  if (hint?.role === "organiser") {
    if (hint.sessionId) void queryClient.prefetchQuery(sessionDetailOptions(hint.sessionId));
    void queryClient.prefetchQuery(sessionsPageOptions(ORGANISER_LIST_PARAMS));
  } else {
    void queryClient.prefetchQuery(sessionsPageOptions(VISITOR_LIST_PARAMS));
  }
}
```

   TanStack de-duplicates in-flight requests with the same key, so the hooks that mount later reuse these promises.

3. **Boot hint (UI only, never for access).** After a successful `/auth/me` or login, write `localStorage["mbg-boot-v1"] = { role: "organiser" | "visitor" }`; clear it on logout and on a `null` user. Read it only to (a) decide which organiser-only requests to prefetch and (b) pick the matching skeleton variant. Authorization stays server-side; an out-of-date hint at worst fires a request that returns 401. To avoid a 401 appearing in the console (it lowers the Lighthouse "Best practices" audit), clear the hint whenever `/auth/me` returns `null`, and never prefetch organiser endpoints without it. This extends SRD FR-SES-8 ("no other data lives in browser storage"): update it if adopted.

4. **Stop gating the whole page on hydration.** `useHydrated()` exists only because the selected session id comes from `localStorage`. Keep it, but gate only the part that needs it (choosing the selected session / directory), not the frame. With Phase 2 skeletons the frame is already in the HTML.

5. **Parallel on the page:** `InternalMatchesWorkspace` already mounts the session view and directory together; with step 2 their requests are already in flight before they mount.

**Done when:** in the Network panel (Slow 4G) `/api/auth/me` and the first data request **start within the same few ms**, before React finishes hydrating; the "Network dependency tree" insight shows a shallower chain.

**Expected effect:** removes roughly one to two round trips from the data path (estimate; verify).

---

### Phase 5 — JS diet (3–4 h)

**5a. Lazy-load dialogs (biggest win).** Dialogs are not visible on first paint, yet `GlobalDialogs` and `SessionView` import them statically, which drags **Zod (~39 KiB gzip)** and all dialog code into every route. Use `next/dynamic` (see `node_modules/next/dist/docs/01-app/02-guides/lazy-loading.md`) and **render a dialog only while it is open**:

```tsx
// components/layout/GlobalDialogs.tsx  ("use client" already)
import dynamic from "next/dynamic";

const LoginDialog = dynamic(() =>
  import("@/components/auth/LoginDialog").then((m) => m.LoginDialog),
);
const PasswordDialog = dynamic(() =>
  import("@/components/auth/PasswordDialog").then((m) => m.PasswordDialog),
);
const SessionDialog = dynamic(() =>
  import("@/components/matches/SessionDialog").then((m) => m.SessionDialog),
);

// …and render conditionally:
// {loginOpen && <LoginDialog … />}
```

Apply the same to the dialogs imported by `SessionView` (`AssignDialog`, `HistoryDialog`, `RosterDialog`, `SessionSettingsDialog`), `TreasuryEntryDialog` and `AdminDialog`. Named exports need the `.then((m) => m.X)` form. Keep `ConfirmDialog` and `Dialog` static (small, used for confirmations).

- **Avoid a delay on first tap:** after first paint, warm the chunks in idle time, e.g. in `GlobalDialogs`: `useEffect(() => { const id = requestIdleCallback(() => { void import("@/components/auth/LoginDialog"); }); return () => cancelIdleCallback(id); }, [])`, or call the `import()` on `onPointerEnter`/`onFocus` of the opening button. (`requestIdleCallback` is missing in Safari/iOS: fall back to `setTimeout(…, 1500)`.)
- Mounting only while open resets dialog form state on close, which is the desired behaviour; check each dialog that currently keeps internal state across opens (e.g. `AssignDialog` prefill) still receives its initial values from props.
- **Verify** with `scripts/measure-bundle.mjs`: the Zod chunk should disappear from `index`/`treasury` initial chunks. If it does not, find the straggler: `grep -rn "lib/schemas" components lib | grep -v "import type"` (a value import from a component or from `lib/data/*` keeps Zod in the initial graph; move the schema use into the dialog or the server).
- **Expected:** about −39 KiB gzip from Zod alone plus the dialogs' own code (≈ 16%+ of today's 248 KiB), consistent with Lighthouse's "unused JavaScript 52–54 KiB".

**5b. Legacy JavaScript (14 KiB flagged on both pages).** Expand the insight to see *which files*. If they are Next/React internals, there is little to do; if they include app code, add a modern `browserslist` to `package.json` (e.g. the last 2 versions of Chrome/Safari/Firefox/Edge that your players use) and re-measure. Low priority.

**5c. Render-blocking CSS (110 ms on `/treasury`).** The CSS is ~7 KiB gzip, so the cost is one round trip. Try `experimental.inlineCss: true` in `next.config.ts` (docs: `next-config-js/inlineCss.md`; the config already has an `experimental` block). Trade-off: ~7 KiB more in each HTML document and no separate CSS caching; keep it only if Lighthouse and WebPageTest show a net gain.

**5d. Minor.** `SyncStatus` uses `useIsFetching()`, re-rendering the header on every poll; if the Performance panel shows header re-render cost, narrow it with a `predicate`/key filter. Keep Vercel Analytics/Speed Insights as they are (≈ 6 KiB gzip, loaded after hydration).

**Expected effect:** lower main-thread work (2.8 s → lower), fewer long tasks, TBT back under 200 ms; faster hydration, so the data requests of Phase 4 start sooner.

---

### Phase 6 — Faster first data (2–3 h)

The skeleton lasts as long as the first API responses take, so shorten them.

1. **Region match.** Confirm the Vercel Function region is the same as the PostgreSQL region (Vercel project settings → Functions, or `regions` in `vercel.json`). A cross-ocean hop per query is a common cause of 300–800 ms API calls from a Jakarta user. Pick the region closest to **both** the DB and the players (for Jakarta that is typically Singapore if the DB is there). Also confirm the runtime `DATABASE_URL` is the **pooled** one (`DIRECT_URL` is for migrations only).
2. **Treasury chart without loading every row.** `getTreasurySummary` currently reads all active entries to build 6 monthly buckets. Replace with a bounded query: find the newest entry's month, then `groupBy` `type` + `date` (or a single `$queryRaw` with `date_trunc('month', …)`, the only place raw SQL would be justified) restricted to the 6-month window, and bucket in code. This keeps the endpoint constant-time as history grows. Keep the response shape (`TreasuryMonthlyBucket[]`) unchanged.
3. **Measure the endpoints.** In the Network panel note the TTFB of `/api/auth/me`, `/api/sessions`, `/api/sessions/:id`, `/api/treasury` on the preview deployment. Anything > 300 ms warm deserves a look at its queries. `listSessions` and `getTreasurySummary` run several queries per call; wrap independent ones in `Promise.all` if they are awaited one after another.

**Expected effect:** LCP is API-bound, so this is where the last 0.5–1 s often comes from. The size of the gain depends on the region finding; measure before and after.

---

### Phase 7 — Optional, only if Phases 1–6 are not enough

Both options add complexity; do not start them without fresh numbers.

**7a. Role hint before paint.** A tiny inline script in the root layout reads `localStorage["mbg-boot-v1"]` and sets `<html data-role="organiser|visitor">` (same technique as theme-flash prevention; add `suppressHydrationWarning` to `<html>`). CSS variants (`group-data-[role=organiser]:`) then show the matching skeleton in the very first paint, with no JavaScript wait. Costs: an inline script, two variants to maintain.

**7b. Server-known auth (removes the `/api/auth/me` round trip).** Read the session cookie on the server inside a `<Suspense>` boundary and stream the user to the client as initial data. In this Next version reading `cookies()` requires a Suspense boundary under `cacheComponents` (see `02-guides/authentication-with-cache-components.md`; instant-navigation and `use cache: private` guides are alongside it). **Warning:** `lib/query.ts` exports a *module-level* `QueryClient`; never seed per-user data into it on the server. Use a per-request client and `HydrationBoundary`, otherwise one user's data can leak to another request. This also changes SRD FR-RND-1/2 ("no server-rendered data") and A11, so update those if adopted.

---

## 6. Verification protocol (repeat after each phase)

1. `npx tsc --noEmit && npm run lint && npm run build` pass.
2. `node scripts/measure-bundle.mjs` → record raw/gzip per route.
3. `curl -s <preview>/ | grep -c data-skeleton` (Phase 2+) and check the header HTML has no "Admin login" flash for a logged-in cookie (Phase 3, via the filmstrip).
4. Lighthouse mobile, Slow 4G, 3 runs, median, for the three scenarios in Phase 0. Fill the table:

| Metric | Baseline `/` | Phase 2 | Phase 3 | Phase 5 | Phase 4 | Phase 6 | Target |
|--------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| Performance | 62 | | | | | | ≥ 90 |
| LCP | 3.3 s | | | | | | ≤ 2.5 s |
| CLS | 0.931 | | | | | | < 0.1 |
| TBT | 210 ms | | | | | | < 200 ms |
| Speed Index | 4.4 s | | | | | | ≤ 3.4 s |
| JS gzip (initial) | 247.8 KiB | | | | | | ≤ 205 KiB |

5. DevTools → Performance → enable **Layout Shifts** track on a throttled reload; no red shift regions in the viewport.
6. Manual regression (SRD §16): visitor flow, organiser flow (assign / queue / finish / tick / lock), treasury add, admins add. Check that every dialog still opens on the **first** tap after Phase 5 and that existing ids/ARIA pairs are unchanged.

---

## 7. Risks and things not to break

| Risk | Mitigation |
|------|------------|
| Skeleton drifts from the real layout and CLS comes back | Keep skeleton next to the real component; check the Layout Shift track whenever either changes |
| Dialog opens late on first tap after lazy-loading | Idle-time warm-up or hover/focus preload (Phase 5a) |
| Stale boot hint fires organiser requests for a logged-out user (401 in console) | Clear hint on logout / null user; prefetch organiser endpoints only with a hint (Phase 4.3) |
| Double fetch of `/auth/me` | `staleTime: 30_000` on `authMeOptions` |
| Server-side query cache shared across users (Phase 7b) | Per-request `QueryClient` + `HydrationBoundary`, never the module singleton |
| Accidental rename of DOM ids / ARIA pairs | They are listed in SRD §13.3; run the manual regression |
| Skeleton colours fail contrast checks | Bars are decorative (`aria-hidden`); text stays real text on the existing palette |

---

## 8. Noticed in the reports, outside this plan's scope

- **Accessibility 93 / 96:** low colour contrast (both pages) and touch targets too small or too close (home). Worth a separate pass; new skeleton tokens must not add to it.
- **SEO 61 on `/treasury`:** "blocked from indexing" is intentional (`noindex`); the second item, canonical pointing to the homepage, comes from the root layout's `alternates.canonical: "/"` being inherited. Override the canonical on the private pages if the score matters. See SRD §15 C6.
- **Best Practices 100** lists informational items only (CSP, HSTS, COOP, XFO, Trusted Types); they are not scored.
