# 05 — API Contracts

> Living contracts. Keep aligned with code. v1 endpoints are listed here.

## Conventions

- Base URL: `/api/v1`
- All requests/responses are JSON (`Content-Type: application/json`).
- Auth: `Authorization: Bearer <jwt>` for protected routes.
- Timestamps: ISO 8601 in UTC.
- IDs: UUID v4 strings.
- Money: integer in **minor units** (e.g. paise), never floats.

## Standard Response Shape

### Success
```json
{
  "success": true,
  "data": { /* payload */ }
}
```

### Error
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": [ { "field": "email", "issue": "invalid" } ]
  }
}
```

## Error Codes (initial set)

| HTTP | code | meaning |
|---|---|---|
| 400 | `VALIDATION_ERROR` | request body failed validation |
| 401 | `UNAUTHENTICATED` | missing or invalid token |
| 403 | `FORBIDDEN` | authenticated but role/permission denies |
| 404 | `NOT_FOUND` | resource does not exist |
| 409 | `CONFLICT` | state conflict (e.g. order already accepted) |
| 422 | `BUSINESS_RULE` | semantically invalid for current state |
| 429 | `RATE_LIMITED` | too many requests |
| 500 | `INTERNAL` | unexpected server error |

## Endpoints (initial scaffold)

> Only the routes that exist as **stubs in this foundation** are listed below. Each module's real contract will be filled in as features are implemented.

### Health
- `GET /healthz` — service liveness
- `GET /readyz` — readiness (DB + Redis ping)

### Auth (`/api/v1/auth`)
- `POST /auth/customer/request-otp` — `{ phone }` → sends OTP (provider TBD)
- `POST /auth/customer/verify-otp` — `{ phone, otp }` → `{ token }`
- `POST /auth/admin/login` — `{ email, password }` → `{ token }`
- `POST /auth/merchant/login` — `{ email, password }` → `{ token }`
- `POST /auth/rider/login` — `{ email, password }` → `{ token }`

### Users (`/api/v1/users`)
- `GET /users/me` — current user profile
- `PATCH /users/me` — update profile

### Merchants (`/api/v1/merchants`)
- `GET /merchants/me` — current merchant profile
- `PATCH /merchants/me` — update merchant profile
- `GET /merchants/:id` — public merchant info

### Riders (`/api/v1/riders`)
- `GET /riders/me` — current rider profile
- `PATCH /riders/me/status` — `{ status: "online" | "offline" }`

### Restaurants (`/api/v1/restaurants`)
- `GET /restaurants` — list (filter: `near`, `q`)
- `GET /restaurants/:id` — restaurant detail
- `POST /restaurants` — admin creates (onboarding)
- `PATCH /restaurants/:id` — admin or owning merchant updates

### Menus (`/api/v1/restaurants/:id/menus`)
- `GET /restaurants/:id/menu` — public menu
- `POST /restaurants/:id/menu/items` — merchant adds item
- `PATCH /menu/items/:itemId` — merchant updates item
- `DELETE /menu/items/:itemId` — merchant removes item

### Orders (`/api/v1/orders`)
- `POST /orders` — customer creates
- `GET /orders/:id` — fetch (auth-scoped)
- `GET /orders` — list (scoped to role)
- `POST /orders/:id/confirm` — merchant
- `POST /orders/:id/preparing` — merchant
- `POST /orders/:id/ready` — merchant
- `POST /orders/:id/cancel` — role-aware
- `POST /orders/:id/picked-up` — rider (closes `assigned → picked_up`)
- `POST /orders/:id/delivered` — rider

### Dispatch (`/api/v1/dispatch`)
- `GET /dispatch/available` — admin/merchant view
- `POST /dispatch/auto-assign/:orderId` — admin/dispatcher
- `POST /dispatch/accept/:orderId` — rider self-assigns
- `POST /dispatch/reject/:assignmentId` — rider releases

### Admin (`/api/v1/admin`)
- `GET /admin/orders` — all orders
- `GET /admin/users` — all users
- `GET /admin/riders` — all riders (with `active_assignments` count)
- `PATCH /admin/merchants/:id/status` — enable/disable
- `PATCH /admin/riders/:id/status` — enable/disable
- `POST /admin/orders/:id/refund` — flag order as refunded (idempotent: 409 on repeat)

### Notifications (`/api/v1/notifications`)
- `GET /notifications/me` — current user notifications
- `POST /notifications/me/read-all` — mark all read
- `POST /notifications/test` — admin/dev only

## Versioning
- Breaking changes bump to `/api/v2`. v1 routes remain stable for the lifetime of the MVP.