# 00 — Project Overview

## Product
A **hyperlocal food delivery marketplace** MVP inspired by Zomato's UX smoothness, scoped to a small launch area. Optimised for **operational clarity over feature breadth**.

## Surfaces
- Customer mobile app (React Native)
- Rider mobile app (React Native)
- Merchant mobile app (React Native)
- Merchant / Admin web dashboard (Next.js)
- Backend API (Node.js)

## Tech Stack (locked)
- Backend: **Node.js** + **Express.js** (modular monolith)
- Database: **PostgreSQL**
- Cache / realtime helpers: **Redis**
- Mobile: **React Native**
- Web dashboard: **Next.js**

## Repository Strategy
- Separate repos per surface (no monorepo) unless a strong reason emerges.
- React Native projects kept isolated to avoid tooling workspace conflicts.
- A single `docs/` folder (or repo) is the **source of truth** for all projects.

## Guiding Principles
1. MVP-first. Ship the smallest thing that works end-to-end.
2. Production-practical architecture — no premature microservices, no over-abstraction.
3. Reliable ordering flow > fancy features.
4. Operational clarity for merchant, rider, and admin.
5. Small-area launch → no enterprise complexity.
6. No AI dependencies in MVP unless explicitly required.

## MVP Priorities
- Reliable ordering flow
- Merchant order handling
- Rider dispatch and delivery flow
- Admin control and support
- Small-area launch

## Build Order
1. Markdowns (source of truth)
2. Backend foundation
3. Admin + merchant web basics ✅
4. Rider app
5. Customer app 🚧 (in progress — see `08-progress-customer.md` + `12-rn-windows-setup.md`)
6. Validate full order lifecycle end-to-end before expanding scope

## Roles
- `customer` — places orders, tracks delivery
- `merchant` — receives and manages orders, prepares food
- `rider` — picks up and delivers orders
- `admin` — operations, support, configuration