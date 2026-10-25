# 07 — Progress: Web (Admin + Merchant dashboard)

> Staff-side control plane. Single Next.js (App Router, TypeScript) app covering admin and merchant dashboards behind one login.

## Current Status
**Stage**: MVP shipped for admin + merchant flows; UI migrated to shadcn/ui
**Last updated**: 2026-06-23

## Stack (locked)
- **Next.js 16.2.9** (App Router, Turbopack, TypeScript strict) — scaffolded with `npx create-next-app@latest`
- **Tailwind CSS v4** (default from `create-next-app`)
- **shadcn/ui v4** (radix-nova preset, neutral base color, OKLCH tokens) — components copied into `src/components/ui/`, owned by the app
- **TanStack Query v5** for data fetching + cache
- **React Hook Form + zod** for forms (`@hookform/resolvers/zod`)
- **`fetch` API client** with JWT in an httpOnly cookie and a thin envelope normalizer
- **sonner** for toasts (replaces the hand-rolled `Toast` provider)
- **next-themes** for class-based `.dark` mode (light/dark toggle in the topbar, persisted to `localStorage`)
- **Date helpers**: `date-fns`
- **Class merging**: `clsx` + `tailwind-merge` via `cn()` in `src/lib/utils.ts`
- No state library beyond React Query. No CSS-in-JS.

## Repo layout
```
web/
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root layout (server) — wraps in <Providers>
│   │   ├── providers.tsx           # QueryClient + Auth + Toast providers
│   │   ├── page.tsx                # / — redirects to /login or role home
│   │   ├── login/page.tsx          # /login (single form, role tabs)
│   │   ├── admin/
│   │   │   ├── layout.tsx          # Role guard + AppShell
│   │   │   ├── orders/
│   │   │   │   ├── page.tsx        # List + filters + pagination
│   │   │   │   └── [id]/page.tsx   # Detail + cancel + refund
│   │   │   ├── users/page.tsx
│   │   │   ├── riders/page.tsx
│   │   │   └── merchants/page.tsx
│   │   └── merchant/
│   │       ├── layout.tsx
│   │       ├── orders/
│   │       │   ├── page.tsx        # Live queue, polls every 5s
│   │       │   └── [id]/page.tsx   # Role-scoped transition buttons
│   │       ├── menu/page.tsx       # Restaurant picker + CRUD
│   │       └── profile/page.tsx
│   ├── components/
│   │   ├── AppShell.tsx            # Sidebar + topbar (theme toggle, avatar, logout)
│   │   ├── DataTable.tsx           # shadcn Table wrapper, FilterBar, PageHeader
│   │   ├── StatusBadge.tsx         # shadcn Badge with status→variant map
│   │   ├── States.tsx              # Loading/Empty/Error
│   │   ├── ThemeToggle.tsx         # Light/dark via next-themes
│   │   └── ui/                     # shadcn primitives (button, card, dialog, …)
│   └── lib/                        # api.ts, auth.tsx, constants.ts, errors.ts, format.ts, types.ts, toast.ts, utils.ts, schemas/*
├── next.config.ts
├── postcss.config.mjs
├── components.json                 # shadcn config (style: radix-nova, neutral, RSC, @/components, @/lib/utils)
├── package.json
└── tsconfig.json
```

## Auth model
- JWT in an **`httpOnly` cookie** set by the backend on login (cookie name: `zc_token`). The web never sees the token in JS — defeats XSS exfiltration.
- Cookie config: `httpOnly: true`, `sameSite: 'lax'`, `path: '/'`, `secure: NODE_ENV === 'production'`, `maxAge` matches `JWT_EXPIRES_IN`. `SameSite=Lax` blocks the CSRF surface for this app (no third-party iframes/forms posting to our API).
- Auth state is bootstrapped on mount by calling `GET /auth/me`; the cookie carries the credential automatically because the fetch uses `credentials: "include"`. 401 from `/me` = no session.
- `useAuth()` exposes `{ user, role, merchantId, riderId, isLoading, login, logout }`. (Token is intentionally not in the context — the web never holds it.)
- `useRequireRole(role)` redirects mismatched/wrong roles to their home.
- `UNAUTHENTICATED` responses trigger a global `auth:unauthorized` event that the API client dispatches; the auth provider listens and force-logs-out, redirecting to `/login`.
- `logout()` calls `POST /auth/logout` (idempotent, clears the cookie server-side) then clears local state.
- Backend `authenticate` middleware accepts **either** the `Authorization: Bearer <token>` header (for RN/curl/scripts) **or** the `zc_token` cookie (browser). Non-browser clients keep working without any change.
- No `proxy.ts` (Next.js 16's renamed middleware). Auth is enforced client-side via `useRequireRole`; backend still requires JWT on every protected request.

## API client (`src/lib/api.ts`)
- Reads `NEXT_PUBLIC_API_BASE_URL` (default `http://localhost:4000/api/v1`).
- `fetch` is called with `credentials: "include"` so the browser sends the auth cookie.
- Decodes the backend envelope `{ success, data | error }`.
- On `UNAUTHENTICATED` dispatches the `auth:unauthorized` window event; the auth provider listens.
- Throws `ApiError` with `{ code, message, status, details }`.

## Endpoints consumed
| Surface | Endpoint | Notes |
|---|---|---|
| Auth | `POST /auth/{admin,merchant,rider}/login` | Returns `{ token, user }`; backend also sets the `zc_token` cookie on the response. Web uses the cookie and ignores the body token. |
| Auth | `GET /auth/me` | Bootstrap probe on mount. Returns `{ user }` or 401. |
| Auth | `POST /auth/logout` | Idempotent; clears the cookie. |
| Admin | `GET /admin/orders` | Status filter + pagination. |
| Admin | `POST /orders/:id/cancel` | With `{ reason }`. |
| Admin | `POST /admin/orders/:id/refund` | Idempotent; backend returns 409 `CONFLICT` on repeat — surfaced as an info toast. |
| Admin | `GET /admin/users` | Role filter + pagination. |
| Admin | `GET /admin/riders` | Status filter + `active_assignments` count. |
| Admin | `PATCH /admin/riders/:id/status` | `online` / `offline` (busy is set automatically). |
| Admin | `GET /admin/merchants` | Returns merchant + user join + `open_orders` count. (Added in this delivery.) |
| Admin | `PATCH /admin/merchants/:id/status` | `active` / `disabled`; backend rejects disable if open orders exist. |
| Merchant | `GET /orders` | Server-scoped to caller's restaurants via JWT. Polled every 5s on the list page. |
| Merchant | `GET /orders/:id` | Polled every 5s on the detail page. |
| Merchant | `POST /orders/:id/{confirm,preparing,ready,cancel}` | Buttons gated by current status. |
| Merchant | `GET /merchants/me` | Returns `{ merchant, user, restaurants }`. |
| Merchant | `PATCH /merchants/me` | Currently only `business_name` is editable. |
| Merchant | `GET /restaurants?include_closed=true` | List all, filter by `merchantId` from JWT (client-side). |
| Merchant | `GET /restaurants/:id/menu?include_unavailable=true` | Menu items. |
| Merchant | `POST /restaurants/:id/menu/items` | Create. |
| Merchant | `PATCH /menu/items/:itemId` | Update. |
| Merchant | `DELETE /menu/items/:itemId` | Remove. |

## Done
- [x] Scaffolded Next.js 16.2.9 with `npx create-next-app@latest` (TypeScript, Tailwind, App Router, src/).
- [x] Installed: TanStack Query, React Hook Form, zod, clsx, date-fns, @hookform/resolvers.
- [x] API client with envelope normalization + auto-logout on `UNAUTHENTICATED`.
- [x] Auth context + role guards (`useRequireRole`).
- [x] **httpOnly cookie auth**: backend `cookie-parser` + cookie fallback in JWT middleware; `GET /auth/me` + `POST /auth/logout`; web uses `credentials: "include"` and bootstraps from `/me`. Header path (`Authorization: Bearer …`) still works for non-browser clients.
- [x] Shared shell: `AppShell` (sidebar + topbar), `DataTable`, `FilterBar`, `PageHeader`, `StatusBadge`, `Toast` + provider, `Loading/Empty/Error` states.
- [x] `/login` (single form, role tabs).
- [x] Admin: orders list + detail with cancel + refund (409 surfaced), users list, riders list (enable/disable), merchants list (enable/disable).
- [x] Merchant: live orders list (5s polling), order detail with role-scoped transitions, menu CRUD with restaurant picker, profile (business name edit).
- [x] Backend addition: `GET /admin/merchants` (admin.repository + service + route + validation).
- [x] **shadcn/ui migration** (radix-nova preset, neutral base color, OKLCH tokens). 20 primitives added under `src/components/ui/`. Hand-rolled `Toast` provider replaced by **sonner** via `lib/toast.ts` (`toastOk` / `toastInfo` / `toastApiError` wrappers). All 5 shared components (AppShell, DataTable, StatusBadge, States, ThemeToggle) and all 9 pages rewritten on shadcn primitives. Destructive actions (cancel order, delete menu item, disable merchant) gated by **AlertDialog**. Merchant menu add/edit moved to a right-side **Sheet** drawer with RHF + zod schema.
- [x] **Light/dark theme** wired via `next-themes` (class-based `.dark`); toggle in the AppShell topbar, persisted to `localStorage` under `zc-theme`. `globals.css` rewritten with shadcn v4 OKLCH tokens.
- [x] Type-check + build pass (`npm run typecheck`, `npm run build`) — backend and web.
- [x] `npm run lint` clean for the web (0 errors). `npm run smoke` 23/23 (no backend changes).

## In Progress
- [ ] (none)

## Next Up
- [ ] Rider app (React Native CLI) — closes the back half of the order lifecycle.
- [ ] Customer app (React Native CLI) — browse + place + track.
- [ ] Merchant kitchen mobile app (React Native CLI) — port of merchant confirm/preparing/ready.
- [ ] Real-time channel (WS vs SSE vs long-poll) — replace 5s polling once decided.
- [ ] Notifications provider (FCM/SMS) — wire `/api/v1/notifications` to a real backend.
- [ ] Refresh token / session strategy — httpOnly cookie is the right baseline; add a refresh flow if session lifetime needs to exceed the cookie's `maxAge`.
- [ ] PATCH /merchants/me — extend to allow name/email/phone updates (currently only `business_name`).
- [ ] `GET /admin/merchants` — add merchant search (q) and merchant-side open-orders count column already returned.

## Blockers / Open Questions
- See `docs/03-open-questions.md`. No web-specific blockers; we follow the documented choices.

## Verification

```bash
# Terminal 1 — backend
cd backend
npm run dev                 # :4000

# Terminal 2 — web
cd web
npm run dev                 # :3000, talks to :4000 by default
```

Open `http://localhost:3000`, log in with seeded credentials:
- `admin@local` / `admin123`
- `merchant1@local` / `merchant123`
- `rider1@local` / `rider123`

Smoke checks:
1. Admin: orders list shows seeded orders; click an order, **Cancel** with reason → 200, status updates.
2. Admin: open a delivered order, click **Mark as refunded** → success; click again → 409 `CONFLICT` is surfaced as a toast.
3. Merchant: orders list auto-refreshes every 5s; click an order, click **Confirm** → 200, status updates in the UI.
4. Merchant: menu page → add an item, edit it, delete it.
5. Merchant: profile page → change business name, save.

## Out of scope (explicit)
- Real-time updates via WS/SSE (polling for now).
- Maps / geo (only relevant to rider app).
- i18n.
- Analytics / charts.