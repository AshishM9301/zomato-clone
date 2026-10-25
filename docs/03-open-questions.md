# 03 — Open Questions

> Questions that are unclear from the brief. Add to this list rather than invent answers. Mark `[DECIDED]` once resolved and link the decision in `01-core-decisions.md`.

## Product
- [ ] **Payment integration in MVP**: cash-on-delivery only, or include a payment gateway (Razorpay / Stripe)?
- [ ] **Promo codes / discounts**: any in MVP scope? If yes, who can author them?
- [ ] **Tipping** for riders — in or out?
- [x] **[DECIDED] Cancellation policy** — see `01-core-decisions.md`. Customers: only `placed`. Merchants: `placed|confirmed|preparing`. Admin: any non-terminal. Implementation: `backend/src/modules/orders/orders.service.ts`.
- [ ] **Refund flow**: manual by admin only, or automated by rules?
- [ ] **Service area definition**: how is a "small launch area" defined (geo fence, city, list of pin codes)?
- [ ] **Service hours**: are merchants 24/7 or do they have opening hours?

## Auth & Identity
- [x] **[DECIDED] OTP delivery provider** — see `01-core-decisions.md`. Dev stub for MVP: Redis-backed 6-digit code with 5-minute TTL; code is returned in the response outside production and logged via pino. Implementation: `backend/src/modules/auth/auth.service.ts`. Twilio / MSG91 / Firebase can swap in behind the same module boundary later.
- [ ] **Refresh tokens / session strategy** for mobile clients.
- [ ] **Account recovery** flow for admin/merchant (password reset email provider).
- [ ] **KYC / verification** requirements for merchants and riders.

## Realtime / Geo
- [ ] **Realtime channel**: WebSockets (socket.io) vs SSE vs long polling for order updates?
- [ ] **Map provider** for the rider app: Google Maps vs Mapbox vs OpenStreetMap?
- [ ] **Location capture frequency** and storage strategy for rider tracking.
- [ ] **ETA computation**: Haversine distance only, or directions API?

## Dispatch
- [ ] **Auto-assign vs manual accept** in MVP? Both with a toggle, or one only?
- [x] **[DECIDED] Rider selection criteria** for auto-assign — see `01-core-decisions.md`. FIFO by `riders.updated_at` for MVP. Implementation: `backend/src/modules/dispatch/dispatch.repository.ts` (`findFirstOnlineRider`). Geo-aware selection deferred.
- [ ] **Re-assignment rules** when a rider rejects or fails to pick up.

## Operations
- [ ] **Notifications provider**: FCM only, or also SMS / WhatsApp?
- [ ] **Logging destination**: stdout only for MVP, or pipe to a service later?
- [ ] **Error tracking** (Sentry etc.) — in MVP scope?
- [ ] **Backup / disaster recovery** expectations for v1.
- [ ] **Multi-tenant** or single-tenant per launch?

## Tech
- [x] **[DECIDED] Migration tool** — see `01-core-decisions.md`. Custom runner in `backend/scripts/migrate.ts` reads `db/migrations/*.sql` in alphabetical order and tracks applied files in `schema_migrations`. No third-party dependency.
- [ ] **Background jobs**: any in MVP (e.g. auto-cancel of stale orders), or all in-process?
- [ ] **Rate limiting** strategy (per IP / per user) — needed in MVP?
- [ ] **Idempotency on `POST /orders`** — currently a network retry on order placement can create a duplicate order (no `Idempotency-Key` header support on the backend). Customer app partially mitigates by disabling the submit button while the request is in flight. Full fix needs a backend change to accept and persist an `Idempotency-Key` header. Tracked for a follow-up.

## Assumptions Pending Confirmation
- A1: `backend/` is bootstrapped under the project root; docs live alongside at `docs/`. Future split into separate repos is a planning concern, not a blocker.
- A2: Express.js selected over Fastify/NestJS.
- A4: Order lifecycle `placed → confirmed → preparing → ready_for_pickup → assigned → picked_up → delivered`, with `cancelled` available from any non-terminal state.
- A8: `zod` for validation, `pino` for logging.