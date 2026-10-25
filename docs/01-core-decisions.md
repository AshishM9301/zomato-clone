# 01 — Core Decisions

> Locked decisions. Do not silently change. Add new entries; deprecate old ones explicitly.

## Stack
- **Backend language**: TypeScript (strict mode)
- **Backend framework**: Express.js (Node.js)
- **Dev runtime**: `tsx` (no build step in dev)
- **Build**: `tsc` → `dist/`
- **Database**: PostgreSQL
- **Cache / realtime**: Redis
- **Mobile**: React Native
- **Web**: Next.js

## Architecture
- **Modular monolith** backend under `src/modules/<domain>`.
- Each module owns its `routes`, `controller`, `service`, `validation`, and (later) `repository`.
- Shared cross-cutting code lives under `src/common/`.
- Single Express app, single deployable unit for MVP. No microservices.

## Auth
- **JWT** (HS256) bearer tokens for MVP.
- **Role-based access control** with four roles: `customer`, `merchant`, `rider`, `admin`.
- **Customer auth**: phone + OTP. **For MVP** the OTP is a dev stub: a 6-digit code is generated, stored in Redis with a 5-minute TTL, logged via pino, and returned in the response outside production. Twilio / MSG91 / Firebase Phone Auth can be swapped in behind the same module boundary later (`backend/src/modules/auth/auth.service.ts`).
- **Admin / Merchant / Rider auth**: email + password (bcrypt, 12 rounds).
- **Email validation** for MVP accepts local-dev domains (e.g. `merchant1@local`) — zod's stricter `.email()` was relaxed for seed credentials; tighten before production.

## Persistence
- PostgreSQL via `pg` (node-postgres) — raw SQL with a thin query helper.
- No ORM in MVP. Migrations are SQL files under `backend/db/migrations/`, applied by a custom idempotent runner at `backend/scripts/migrate.ts` (`npm run migrate`). No third-party migration tool.
- Redis via `ioredis`.

## Dispatch
- **Auto-assign** picks the first `online` rider ordered by `riders.updated_at` (FIFO). Geo-aware selection (distance, score, etc.) is a follow-up.
- A rider self-`accept` takes precedence when available; the order is claimed atomically inside a transaction so two riders can never grab the same order.

## Validation & Logging
- Input validation: **zod**.
- Logging: **pino** (structured JSON).

## Order Lifecycle
Standard flow (see `04-architecture.md` for details):

```
placed → confirmed → preparing → ready_for_pickup
   → assigned → picked_up → delivered
   (any non-terminal state) → cancelled
```

## Folder Layout (backend)
```
backend/
├── src/                    # TypeScript source
│   ├── app.ts
│   ├── server.ts
│   ├── config/
│   ├── common/
│   ├── modules/
│   └── routes/
├── scripts/                # seed, one-off scripts (.ts)
├── db/                     # migrations (later)
├── tests/                  # tests (later)
├── tsconfig.json
├── package.json
└── .env.example
```

## API Versioning
All routes prefixed with `/api/v1`.

## Documentation Rule
- Every meaningful task updates the relevant progress file (`06-progress-backend.md`, `07-progress-admin.md`, etc.) and `11-changelog.md`.
- Open questions go to `03-open-questions.md` — never invent answers.