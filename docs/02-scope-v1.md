# 02 — Scope v1 (MVP)

## In Scope
- Backend foundation: auth, users, merchants, riders, admin, restaurants, menus, orders, dispatch (manual + simple auto-assign), notifications (placeholders).
- Customer app: browse nearby restaurants, view menu, place order, track status.
- Rider app: see available orders, accept, navigate to merchant → customer, mark picked up / delivered.
- Merchant app: receive orders, accept/reject, mark preparing, mark ready.
- Admin web: view orders, restaurants, users, riders; basic support actions (refund flag, disable merchant).
- Seed data for local development.

## Explicitly Out of Scope (v1)
- AI-driven dispatch / ETA prediction
- Multi-city / multi-region scaling
- Loyalty / rewards / coupons (except a simple promo code hook)
- Marketing automation
- Complex analytics / BI dashboards
- Multi-language UI (English-only for v1)
- Microservices architecture
- Native-only platform integrations (deep links, Apple Pay, etc.)

## MVP Success Criteria
1. Customer can place an order end-to-end.
2. Merchant can confirm, prepare, and mark ready.
3. Rider can accept, pick up, and deliver.
4. Admin can view all orders and intervene (cancel / re-assign).
5. Order lifecycle is observable across all four surfaces in real time (or near real time).
6. System runs locally via `npm run dev` with seeded data.