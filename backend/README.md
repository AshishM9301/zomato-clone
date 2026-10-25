# Backend — Hyperlocal Food Delivery MVP

Node.js + Express + **TypeScript** backend for the Zomato-clone MVP. Modular monolith layout.

## Quick start

```bash
cd backend
cp .env.example .env       # then edit values
npm install
npm run migrate            # apply SQL migrations
npm run seed               # idempotent dev seed
npm run dev                # tsx watch (no build step)
```

Server listens on `http://localhost:4000` by default. The first `/readyz` ping lazily initialises the pg + redis clients, so the process boots even if Postgres/Redis are temporarily unreachable.

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Dev server with `tsx` (auto reload on TS changes) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run compiled output (`node dist/src/server.js`) |
| `npm run typecheck` | Type-check only (no emit) |
| `npm run migrate` | Apply pending SQL migrations from `db/migrations/` |
| `npm run seed` | Run the local development seed script (idempotent) |
| `npm run smoke` | End-to-end smoke test against the running server |
| `npm test` | Placeholder — not configured yet |
| `npm run lint` | Placeholder — not configured yet |

## Folder layout

```
backend/
├── src/
│   ├── app.ts                # Express app composition (no listen)
│   ├── server.ts             # Bootstraps http server + graceful shutdown
│   ├── config/               # env, db, redis
│   ├── common/               # middleware, utils, errors, constants
│   ├── modules/              # auth, users, merchants, riders, restaurants,
│   │                         # menus, orders, dispatch, admin, notifications
│   └── routes/               # main router mounting /api/v1/*
├── db/migrations/            # numbered SQL migrations
├── scripts/                  # migrate, seed, smoke
├── .env.example
└── package.json
```

Each module follows the same pattern:

```
modules/<name>/
├── <name>.routes.ts          # thin routes — auth + parse + service call
├── <name>.validation.ts      # zod schemas for body / params / query
├── <name>.service.ts         # business logic; throws AppError
└── <name>.repository.ts      # raw SQL via src/config/db
```

## Health

- `GET /healthz` — liveness (always 200 once the process is up)
- `GET /readyz`  — readiness (pings DB + Redis; 503 if degraded)

## API

All endpoints are versioned under `/api/v1`. See `docs/05-api-contracts.md` for the current contract list.

## Dev login (after `npm run seed`)

| Role | Credential |
|---|---|
| Customer | phone `+10000000000` via OTP (dev mode returns the code) |
| Admin | `admin@local` / `admin123` (override with `SEED_ADMIN_PASSWORD`) |
| Merchant | `merchant1@local` … `merchant3@local` / `merchant123` |
| Rider | `rider1@local`, `rider2@local` / `rider123` |