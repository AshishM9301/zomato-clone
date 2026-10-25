# 04 — Architecture

> Living document. Update when boundaries, contracts, or infra change.

## High-Level

```
┌────────────┐  ┌────────────┐  ┌────────────┐  ┌──────────────┐
│  Customer  │  │   Rider    │  │  Merchant  │  │ Admin Web    │
│  (RN app)  │  │  (RN app)  │  │  (RN app)  │  │ (Next.js)    │
└─────┬──────┘  └─────┬──────┘  └─────┬──────┘  └──────┬───────┘
      │ HTTPS / JSON  │               │                │
      └───────────────┴───────────────┴────────────────┘
                          │
                          ▼
                  ┌───────────────┐
                  │  Node.js API  │
                  │  (Express)    │
                  └──┬─────────┬──┘
                     │         │
                     ▼         ▼
               ┌──────────┐  ┌────────┐
               │ Postgres │  │ Redis  │
               └──────────┘  └────────┘
```

## Backend Layout

```
src/
├── app.ts              # Express app composition
├── server.ts           # Bootstraps http server + graceful shutdown
├── config/             # env, db pool, redis client
├── common/
│   ├── middleware/     # auth, error handler, request id, logger
│   ├── utils/          # asyncHandler, response, logger
│   ├── errors/         # AppError + subclasses
│   └── constants/      # roles, orderStatus, errorCodes
├── modules/
│   ├── auth/           # routes, controller, service, validation
│   ├── users/
│   ├── merchants/
│   ├── riders/
│   ├── restaurants/
│   ├── menus/
│   ├── orders/
│   ├── dispatch/
│   ├── admin/
│   └── notifications/
└── routes/
    └── index.ts        # mounts /api/v1/* modules
```

### Module Conventions
- Each module exposes a default `router` from `*.routes.js`.
- Controller is thin: parse req → call service → format response.
- Service holds business logic.
- Validation lives next to the routes that need it (zod schemas).
- No business logic in controllers; no DB calls in controllers.

## Order Lifecycle

```
[placed] ─► [confirmed] ─► [preparing] ─► [ready_for_pickup]
                                                    │
                                                    ▼
                                            [assigned] ─► [picked_up] ─► [delivered]

   (any non-terminal) ──► [cancelled]
   (terminal failures) ──► [cancelled] with reason
```

Allowed transitions are enforced in `common/constants/orderStatus.js` and checked in the order service.

| From → To | Who |
|---|---|
| placed → confirmed | merchant |
| placed → cancelled | customer (pre-confirm) / merchant |
| confirmed → preparing | merchant |
| preparing → ready_for_pickup | merchant |
| ready_for_pickup → assigned | dispatch (auto or manual) |
| assigned → picked_up | rider |
| picked_up → delivered | rider |
| any non-terminal → cancelled | rules depend on stage |

## Cross-Cutting
- **Auth**: every protected route uses `requireAuth` + `requireRole(...)`.
- **Errors**: all thrown errors are `AppError` subclasses; `errorHandler` middleware formats the JSON response.
- **Logging**: `pino` logs every request with `requestId`, response time, and status.
- **Config**: `src/config/env.js` validates environment variables at boot using `zod`; missing or invalid env fails fast.
- **DB**: single `pg.Pool` exported from `src/config/db.js`; queries are raw SQL through a thin helper.
- **Redis**: single `ioredis` client exported from `src/config/redis.js`; used for cache and (later) pub/sub.

## External Integrations (planned, placeholders only)
- OTP provider (TBD)
- Maps provider (TBD)
- Push notifications provider (TBD)
- Payment gateway (TBD)

All external integrations are wrapped in module-local adapters so they can be swapped without touching business logic.

## Deployment (future)
- Single containerised Node.js process.
- Postgres + Redis managed services.
- HTTPS termination at the proxy.
- Environment-driven config (12-factor).