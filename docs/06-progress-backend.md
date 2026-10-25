# 06 — Progress: Backend

> Living status for the backend MVP. Updated after every meaningful task.

## Current Status
**Stage**: MVP routes implemented end-to-end
**Last updated**: 2026-06-22

## Done
- [x] Markdowns source of truth created (`docs/00..05`, `11`).
- [x] Backend project structure bootstrapped (`backend/`).
- [x] Modular monolith folder layout under `src/modules/*`.
- [x] **TypeScript migration** — all source files in `.ts`, strict mode on, `tsx` for dev, `tsc` for build.
- [x] Config loader + env validation (zod) — `src/config/env.ts`.
- [x] PostgreSQL connection (`src/config/db.ts`) + Redis client (`src/config/redis.ts`).
- [x] Common utilities: `pino` logger, error handler, async handler, response util, `AppError`, request id, JWT auth + role guard middleware.
- [x] Order status lifecycle constants and allowed transitions.
- [x] Module stubs (routes) for: auth, users, merchants, riders, restaurants, menus, orders, dispatch, admin, notifications.
- [x] Main router mounting `/api/v1/*`.
- [x] Health endpoints `/healthz` and `/readyz`.
- [x] `.env.example`, `.gitignore`, `README.md`, `tsconfig.json` for backend.
- [x] Type-check passes (`npm run typecheck`), build succeeds (`npm run build`), server boots and responds on `/healthz` and `/readyz`.

### Routes implemented (this delivery)
- [x] **Cross-cutting utils**: `password.ts` (bcrypt), `jwt.ts` (HS256 sign), `pagination.ts` (zod-based).
- [x] **DB migration runner**: `db/migrations/0001_init.sql` (9 tables + enums + indexes + updated_at triggers) and `scripts/migrate.ts` (idempotent).
- [x] **Auth**: customer phone+OTP via Redis (5-min TTL, dev code returned in non-prod); admin/merchant/rider email+password via bcrypt; JWT with role + optional merchantId/riderId claims.
- [x] **Users**: `GET/PATCH /users/me`.
- [x] **Merchants**: `GET /merchants/me`, `PATCH /merchants/me`, `GET /merchants/:id` (public).
- [x] **Riders**: `GET /riders/me`, `PATCH /riders/me/status`.
- [x] **Restaurants**: `GET /restaurants` (filters: `q`, `near=lat,lng`, `include_closed`, paginated), `GET /restaurants/:id`, admin-only `POST /restaurants` (creates merchant + restaurant in a transaction), `PATCH /restaurants/:id` (admin or owning merchant).
- [x] **Menus**: `GET /restaurants/:id/menu`, merchant `POST /restaurants/:id/menu/items`, merchant/admin `PATCH/DELETE /menu/items/:itemId`.
- [x] **Orders**: `POST /orders` (item snapshot, subtotal/delivery/total), role-scoped `GET /orders` and `GET /orders/:id`, merchant `confirm/preparing/ready`, rider `picked-up` (newly added) and `delivered`, role-aware `cancel`.
- [x] **Dispatch**: `GET /dispatch/available` (admin or scoped to merchant), admin `auto-assign` (FIFO online rider), rider `accept` and `reject` (with role-based status cleanup).
- [x] **Admin**: paginated `GET /admin/orders`, `GET /admin/users`, `GET /admin/riders` (with `active_assignments` count), `PATCH /admin/merchants/:id/status` (refuses if open orders exist), `PATCH /admin/riders/:id/status` (refuses if active assignments exist), `POST /admin/orders/:id/refund` (idempotent: 409 on repeat, sets `refunded_at`).
- [x] **Notifications**: `GET /notifications/me` (paginated, unread filter), `POST /notifications/me/read-all`, admin-only `POST /notifications/test`.
- [x] **Seed script** (`scripts/seed.ts`): idempotent — 1 admin, 3 merchants + restaurants + 15 menu items, 2 riders, 1 OTP customer.
- [x] **Smoke test** (`scripts/smoke.ts`): drives the full lifecycle (place → confirm → preparing → ready → accept → picked_up → delivered) plus admin list/refund/409; 23/23 passing locally.

## In Progress
- [ ] (none)

## Next Up
- [ ] Admin web basics (Next.js) — list orders, intervene.
- [ ] Customer app: place order UI + status polling.
- [ ] Rider app: available-orders list + accept + pickup + delivered.
- [ ] Webhook / queue worker for notifications (currently write-only).
- [ ] Real-time channel for order status (open question).
- [ ] Tests beyond smoke (unit + integration).

## Blockers / Open Questions
- See `docs/03-open-questions.md`. Resolved in this delivery:
  - OTP provider — `[DECIDED]` dev stub; see `01-core-decisions.md`.
  - Migration tool — `[DECIDED]` custom runner reading `db/migrations/*.sql`.
  - Auto-assign rider selection — `[DECIDED]` FIFO by `updated_at` for MVP; geo selection is follow-up.