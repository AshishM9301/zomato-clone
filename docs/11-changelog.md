# 11 — Changelog

All notable changes to the project. Newest at top.

## [Unreleased]

### Added
- **Customer app scaffold started** (in progress) — React Native CLI at `customer/`, separate folder at repo root (per `00-project-overview.md` "no monorepo"). Android-first, physical USB device target. Foundation laid: TypeScript with `@/*` paths, TanStack Query, React Navigation, React Hook Form + zod, `react-native-keychain` for JWT, AsyncStorage for cart. 6 screens planned (Login, RestaurantList, RestaurantDetail, Cart, OrdersList, OrderDetail). No backend changes; **idempotency on `POST /orders` accepted as a known gap** for MVP (documented in `03-open-questions.md`). See `docs/08-progress-customer.md`.
- **`docs/12-rn-windows-setup.md`** — copy-pasteable Windows 11 toolchain setup (Node 20 LTS, JDK 17 Temurin, Android SDK cmdline-tools, platforms;android-34, build-tools;34.0.0, USB device, PowerShell exec policy, long paths, Defender exclusions). No Android Studio required.

### Changed
- **Web UI migrated to shadcn/ui v4** (radix-nova preset, neutral base color, OKLCH tokens). 20 primitives installed under `src/components/ui/` (button, card, input, label, badge, table, dialog, alert-dialog, select, tabs, dropdown-menu, sheet, checkbox, textarea, form, sonner, skeleton, separator, avatar, popover, tooltip). All 5 shared components (`AppShell`, `DataTable`, `StatusBadge`, `States`, new `ThemeToggle`) and all 9 pages rewritten on shadcn primitives. No backend changes; backend smoke still 23/23.
- **Destructive actions are now confirm-gated**: admin cancel-order (with reason), admin refund, admin disable-merchant, merchant delete-menu-item, merchant cancel-order (with reason) all flow through `AlertDialog` with a focused confirm/cancel button pair.
- **Toast provider replaced**: hand-rolled `Toast` component + provider deleted. All 17 call sites use `sonner` via a thin `lib/toast.ts` wrapper (`toastOk` / `toastInfo` / `toastApiError`).
- **Merchant menu add/edit moved to a right-side `Sheet` drawer** with React Hook Form + zod (`lib/schemas/menu.ts`, with `toPaise` / `fromPaise` helpers).
- **Light/dark theme** wired via `next-themes` (class-based `.dark`), toggle in the AppShell topbar, persisted to `localStorage` under `zc-theme`. `globals.css` rewritten with shadcn v4 OKLCH tokens; the `prefers-color-scheme` strategy is gone.
- **Web auth moved from localStorage to httpOnly cookies.** Bug fix: `setToken()` was defined but never called, so the JWT never persisted across page refresh and every protected request 401'd.
  - Backend: added `cookie-parser`, sets `zc_token` cookie on every login (admin / merchant / rider / customer-OTP). JWT middleware accepts the cookie as a fallback to the `Authorization` header. New `GET /auth/me` (role-agnostic bootstrap) and `POST /auth/logout` (idempotent cookie clear).
  - Frontend: `api.ts` uses `credentials: "include"`. `auth.tsx` bootstraps from `GET /auth/me` on mount, no longer reads/writes `localStorage` for auth, `logout()` calls `POST /auth/logout`. `flushSync` workaround removed (no longer needed — cookie is set by the response before state updates).
  - Header path preserved for non-browser clients (RN, curl, smoke script). `npm run smoke` still 23/23.



### Added
- **`web/` Next.js staff dashboard** (single app, admin + merchant). Scaffolded with `npx create-next-app@latest` (Next.js 16.2.9, App Router, TypeScript strict, Tailwind v4).
- Installed app deps: `@tanstack/react-query`, `react-hook-form`, `zod` (matches backend), `clsx`, `date-fns`, `@hookform/resolvers/zod`.
- API client (`src/lib/api.ts`): thin `fetch` wrapper, JWT in `localStorage`, envelope normalization, auto-logout on `UNAUTHENTICATED`.
- Auth context (`src/lib/auth.tsx`): `useAuth`, `useRequireRole`, JWT decode, `auth:unauthorized` event listener.
- Shared shell components: `AppShell` (role-aware nav), `DataTable`, `FilterBar`, `PageHeader`, `StatusBadge`, `Toast` + provider, `Loading/Empty/Error` states.
- `/login` page: single email+password form with admin/merchant/rider tabs.
- Admin pages: orders list + detail (cancel + refund with 409 handling), users list, riders list (online/offline toggle), merchants list (enable/disable toggle).
- Merchant pages: live orders list (5s polling), order detail with role-scoped `Confirm / Preparing / Mark Ready / Cancel` buttons, menu management (add/edit/delete items per restaurant), profile (business name edit).
- Backend addition: `GET /admin/merchants` (admin.repository `listMerchants` + service + route + validation). Returns merchant + user join + `open_orders` count.
- `docs/07-progress-web.md` (new progress file).
- Web title in layout: "Zomato Clone — Staff".

### Decisions
- **Combined web app**: one Next.js app covers admin + merchant behind one login and one `AppShell` with role-specific nav. Less to maintain.
- **JWT in `localStorage`** for MVP (not httpOnly cookie). Plan called this out as the simpler option; tighten before any non-local deploy.
- **No `proxy.ts`** (Next.js 16's renamed middleware). Client-side auth via `useRequireRole`; backend enforces JWT on every protected route regardless.
- **Polling** for live updates (5s on merchant orders list/detail). Real-time channel (WS/SSE) is a follow-up.
- **Toolchain**: latest stable Next.js via `npx create-next-app@latest`; React Native CLI (not Expo) for upcoming mobile apps.

### Verified
- `npm run typecheck` and `npm run build` pass for both `web/` and `backend/`.
- `npm run dev` boots web on `:3000`, talks to backend on `:4000` by default.
- `curl` smoke: admin/merchant/rider login all return valid JWTs; `/admin/orders`, `/admin/users`, `/admin/riders`, `/admin/merchants` all return paginated lists; merchant `/orders`, `/merchants/me`, `/restaurants` all return expected shapes.
- `curl http://localhost:4000/healthz` and `/readyz` both return `{success:true,...}` with DB+Redis checks green.

### Open Questions Added
- See `03-open-questions.md`. No new web-specific questions; we follow the documented choices (combined web, localStorage JWT, polling for live updates).
- Initial `docs/` source of truth: `00-project-overview.md`, `01-core-decisions.md`, `02-scope-v1.md`, `03-open-questions.md`, `04-architecture.md`, `05-api-contracts.md`, `06-progress-backend.md`.
- `backend/` project bootstrapped with modular monolith layout.
- **TypeScript migration**: all source files converted to `.ts` with strict mode, `tsx` for dev, `tsc` for build, full `@types/*` coverage.
- `tsconfig.json` with `strict`, `noImplicitReturns`, `noFallthroughCasesInSwitch`, `forceConsistentCasingInFileNames`, `skipLibCheck`.
- Config + env validation (`zod`) — `src/config/env.ts`.
- PostgreSQL connection placeholder (`src/config/db.ts`).
- Redis connection placeholder (`src/config/redis.ts`).
- Common utilities: `pino` logger, async handler, response util, `AppError`, request-id middleware, error handler, JWT auth + role guard middleware (typed).
- Order status lifecycle constants and allowed transitions.
- Module stubs (typed routes) for: auth, users, merchants, riders, restaurants, menus, orders, dispatch, admin, notifications.
- Main router mounting `/api/v1/*`.
- Health endpoints `/healthz` and `/readyz`.
- Seed script placeholder (`scripts/seed.ts`).
- `.env.example`, `.gitignore`, `tsconfig.json`, backend `README.md`.
- **Cross-cutting utils**: `src/common/utils/{password,jwt,pagination}.ts` (bcrypt 12 rounds, HS256 sign, zod-based query parsing).
- **DB schema + migrations runner**: `db/migrations/0001_init.sql` (9 tables, enums, partial unique indexes, updated_at triggers) and `scripts/migrate.ts` (idempotent, transactional per file, `npm run migrate`).
- **Full module implementations** for all 10 modules (auth, users, merchants, riders, restaurants, menus, orders, dispatch, admin, notifications). Each module has `*.routes.ts`, `*.validation.ts`, `*.service.ts`, `*.repository.ts`.
- **Order lifecycle** enforced via `canTransition` from `common/constants/orderStatus.ts`; new rider `POST /orders/:id/picked-up` endpoint added to close the `assigned → picked_up` transition.
- **Seed script** (`scripts/seed.ts`): idempotent — 1 admin, 3 merchants with restaurants + 15 menu items, 2 riders, 1 OTP-only customer.
- **Smoke test** (`scripts/smoke.ts`): drives the full lifecycle end-to-end; 23/23 passing (added admin riders list + refund + 409 idempotency).
- **Dispatch `GET /available`** now filters to the calling merchant's restaurants when called by a merchant.
- **Admin riders list** — `GET /admin/riders` joins `riders`/`users` and counts active assignments; supports `status` filter and pagination.
- **Admin refund flag** — `POST /admin/orders/:id/refund` sets `orders.refunded_at`; idempotent (returns 409 `CONFLICT` on repeat). Migration `0002_order_refund.sql` adds the nullable `refunded_at` column + partial index.

### Decisions
- Selected **Express.js** as the backend framework.
- Selected **TypeScript** as the backend language (strict mode, `tsx` dev, `tsc` build).
- Order lifecycle: `placed → confirmed → preparing → ready_for_pickup → assigned → picked_up → delivered`, with `cancelled` available from any non-terminal state.
- **[DECIDED]** Customer OTP for MVP — Redis-backed dev stub; 6-digit code, 5-min TTL, code returned in response outside production.
- **[DECIDED]** Migration runner — custom script reading `db/migrations/*.sql` alphabetically; no third-party tool.
- **[DECIDED]** Auto-assign rider selection for MVP — FIFO by `riders.updated_at`. Geo-aware selection is a follow-up.
- **[DECIDED]** Email validation accepts local-dev domains (e.g. `name@local`); zod's `.email()` was too strict for seed credentials.

### Verified
- `npm install` succeeds.
- `npm run typecheck` exits 0.
- `npm run build` produces `dist/`.
- `npm run migrate` applies `0001_init.sql` and `0002_order_refund.sql` against Postgres 16.
- `npm run seed` inserts 1 admin + 3 merchants + 3 restaurants + 15 menu items + 2 riders + 1 customer; idempotent on re-run.
- `node dist/src/server.js` boots, `/healthz` and `/readyz` return the standard envelope, request logged with request id.
- `npm run smoke` exercises the full lifecycle (place → confirm → preparing → ready → accept → picked_up → delivered → admin list → admin refund → 409 on repeat refund → customer list) with 23/23 steps green.

### Open Questions Added
- See `03-open-questions.md` for the full list (payment, maps, push notifications, etc.). OTP provider, migration tool, and dispatch rider selection have been resolved.