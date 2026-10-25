/**
 * Local development seed.
 *
 * Idempotent: every insert uses ON CONFLICT DO NOTHING / unique-violation
 * handling, so the script is safe to re-run.
 *
 * Run with: `npm run seed`
 *
 * Inserts (if missing):
 *   - 1 admin   : admin@local / env.SEED_ADMIN_PASSWORD (default 'admin123')
 *   - 3 merchants (each with one restaurant and 5 menu items):
 *       merchant1@local … merchant3@local / 'merchant123'
 *   - 2 riders  : rider1@local, rider2@local / 'rider123'
 *   - 1 customer: phone '+10000000000' (no password — OTP only)
 */

import { env } from '../src/config/env';
import * as db from '../src/config/db';
import * as redis from '../src/config/redis';
import { hashPassword } from '../src/common/utils/password';
import logger from '../src/common/utils/logger';

const DEFAULT_ADMIN_PW = 'admin123';
const DEFAULT_MERCHANT_PW = 'merchant123';
const DEFAULT_RIDER_PW = 'rider123';

interface SeedSummary {
  admin: number;
  merchants: number;
  restaurants: number;
  menuItems: number;
  riders: number;
  customer: number;
}

async function ensureAdmin(): Promise<number> {
  const password = env.SEED_ADMIN_PASSWORD || DEFAULT_ADMIN_PW;
  const hash = await hashPassword(password);
  const res = await db.query(
    `INSERT INTO users (role, email, name, password_hash)
       VALUES ('admin', 'admin@local', 'Admin', $1)
     ON CONFLICT DO NOTHING
     RETURNING id`,
    [hash],
  );
  if (res.rowCount && res.rowCount > 0) {
    logger.info({ email: 'admin@local' }, 'seed: created admin user');
    return 1;
  }
  logger.info({ email: 'admin@local' }, 'seed: admin user already exists');
  return 0;
}

interface MerchantSeed {
  email: string;
  businessName: string;
  restaurant: { name: string; address: string; lat: number; lng: number };
  items: Array<{ name: string; description: string; priceCents: number }>;
}

const MERCHANT_SEEDS: MerchantSeed[] = [
  {
    email: 'merchant1@local',
    businessName: 'Spice Route',
    restaurant: {
      name: 'Spice Route',
      address: '12 MG Road, Bengaluru',
      lat: 12.9716,
      lng: 77.5946,
    },
    items: [
      { name: 'Chicken Biryani', description: 'Aromatic basmati with tender chicken', priceCents: 28000 },
      { name: 'Paneer Butter Masala', description: 'Cottage cheese in creamy tomato gravy', priceCents: 22000 },
      { name: 'Garlic Naan', description: 'Tandoor-baked flatbread', priceCents: 6000 },
      { name: 'Dal Makhani', description: 'Slow-cooked black lentils', priceCents: 18000 },
      { name: 'Gulab Jamun', description: 'Warm milk-solid dumplings in syrup', priceCents: 9000 },
    ],
  },
  {
    email: 'merchant2@local',
    businessName: 'Tokyo Ramen House',
    restaurant: {
      name: 'Tokyo Ramen House',
      address: '4 Indiranagar 100ft Rd, Bengaluru',
      lat: 12.9784,
      lng: 77.6408,
    },
    items: [
      { name: 'Tonkotsu Ramen', description: 'Rich pork-bone broth, chashu, ajitama', priceCents: 35000 },
      { name: 'Miso Ramen', description: 'Miso broth with corn and butter', priceCents: 32000 },
      { name: 'Gyoza', description: 'Pan-fried pork dumplings (6 pcs)', priceCents: 18000 },
      { name: 'Karaage', description: 'Crispy Japanese fried chicken', priceCents: 22000 },
      { name: 'Matcha Ice Cream', description: 'Two scoops', priceCents: 12000 },
    ],
  },
  {
    email: 'merchant3@local',
    businessName: 'Bella Italia',
    restaurant: {
      name: 'Bella Italia',
      address: '21 Koramangala 5th Block, Bengaluru',
      lat: 12.9352,
      lng: 77.6245,
    },
    items: [
      { name: 'Margherita Pizza', description: 'Tomato, fior di latte, basil', priceCents: 30000 },
      { name: 'Spaghetti Carbonara', description: 'Guanciale, pecorino, egg yolk', priceCents: 32000 },
      { name: 'Lasagna al Forno', description: 'Slow-baked beef ragù béchamel', priceCents: 34000 },
      { name: 'Tiramisu', description: 'Mascarpone, espresso, savoiardi', priceCents: 16000 },
      { name: 'Garlic Focaccia', description: 'Rosemary and olive oil', priceCents: 9000 },
    ],
  },
];

async function ensureMerchantsAndRestaurants(): Promise<{
  merchants: number;
  restaurants: number;
  menuItems: number;
}> {
  const password = DEFAULT_MERCHANT_PW;
  const hash = await hashPassword(password);

  let merchants = 0;
  let restaurants = 0;
  let menuItems = 0;

  for (const seed of MERCHANT_SEEDS) {
    // Upsert user.
    const userRes = await db.query<{ id: string }>(
      `INSERT INTO users (role, email, name, password_hash)
         VALUES ('merchant', $1, $2, $3)
       ON CONFLICT (email) WHERE email IS NOT NULL DO UPDATE
         SET email = EXCLUDED.email
       RETURNING id`,
      [seed.email, seed.businessName, hash],
    );
    if (userRes.rowCount && userRes.rowCount > 0) {
      // Was a fresh insert.
      merchants++;
    }
    const userId = userRes.rows[0]!.id;

    // Upsert merchant.
    const merchantRes = await db.query<{ id: string }>(
      `INSERT INTO merchants (user_id, business_name)
         VALUES ($1, $2)
       ON CONFLICT (user_id) DO UPDATE
         SET business_name = EXCLUDED.business_name
       RETURNING id`,
      [userId, seed.businessName],
    );
    const merchantId = merchantRes.rows[0]!.id;

    // Upsert restaurant by (merchant_id, name).
    const restRes = await db.query<{ id: string }>(
      `INSERT INTO restaurants (merchant_id, name, address, lat, lng)
         VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT DO NOTHING
       RETURNING id`,
      [merchantId, seed.restaurant.name, seed.restaurant.address, seed.restaurant.lat, seed.restaurant.lng],
    );
    if (restRes.rowCount && restRes.rowCount > 0) {
      restaurants++;
    } else {
      // Find existing.
      const existing = await db.query<{ id: string }>(
        `SELECT id FROM restaurants WHERE merchant_id = $1 AND name = $2 LIMIT 1`,
        [merchantId, seed.restaurant.name],
      );
      if (!existing.rows[0]) throw new Error('restaurant lookup failed');
      restRes.rows[0] = existing.rows[0];
    }
    const restaurantId = restRes.rows[0]!.id;

    // Upsert menu items by (restaurant_id, name).
    for (const item of seed.items) {
      const itemRes = await db.query(
        `INSERT INTO menu_items (restaurant_id, name, description, price_cents)
           VALUES ($1, $2, $3, $4)
         ON CONFLICT DO NOTHING
         RETURNING id`,
        [restaurantId, item.name, item.description, item.priceCents],
      );
      if (itemRes.rowCount && itemRes.rowCount > 0) menuItems++;
    }
  }

  return { merchants, restaurants, menuItems };
}

async function ensureRiders(): Promise<number> {
  const password = DEFAULT_RIDER_PW;
  const hash = await hashPassword(password);
  let created = 0;
  for (const email of ['rider1@local', 'rider2@local']) {
    const userRes = await db.query<{ id: string }>(
      `INSERT INTO users (role, email, name, password_hash)
         VALUES ('rider', $1, $2, $3)
       ON CONFLICT (email) WHERE email IS NOT NULL DO UPDATE
         SET email = EXCLUDED.email
       RETURNING id`,
      [email, email.split('@')[0]!, hash],
    );
    if (userRes.rowCount && userRes.rowCount > 0) created++;
    const userId = userRes.rows[0]!.id;
    await db.query(
      `INSERT INTO riders (user_id, status)
         VALUES ($1, 'offline')
       ON CONFLICT (user_id) DO NOTHING`,
      [userId],
    );
  }
  return created;
}

async function ensureCustomer(): Promise<number> {
  const res = await db.query(
    `INSERT INTO users (role, phone, name)
       VALUES ('customer', '+10000000000', 'Demo Customer')
     ON CONFLICT (phone) WHERE phone IS NOT NULL DO NOTHING
     RETURNING id`,
  );
  return res.rowCount && res.rowCount > 0 ? 1 : 0;
}

async function main(): Promise<void> {
  logger.info('seed: starting');

  try {
    await db.ping();
  } catch (err) {
    logger.error({ err }, 'seed: db ping failed; aborting');
    process.exitCode = 1;
    return;
  }
  try {
    await redis.ping();
  } catch (err) {
    logger.warn({ err }, 'seed: redis ping failed; continuing without cache');
  }

  const result: SeedSummary = {
    admin: await ensureAdmin(),
    merchants: 0,
    restaurants: 0,
    menuItems: 0,
    riders: 0,
    customer: 0,
  };
  const mr = await ensureMerchantsAndRestaurants();
  result.merchants = mr.merchants;
  result.restaurants = mr.restaurants;
  result.menuItems = mr.menuItems;
  result.riders = await ensureRiders();
  result.customer = await ensureCustomer();

  logger.info({ result }, 'seed: complete');
  logger.info('seed: login credentials:');
  logger.info('  admin    : admin@local / (SEED_ADMIN_PASSWORD env or "admin123")');
  logger.info('  merchant : merchant1@local … merchant3@local / "merchant123"');
  logger.info('  rider    : rider1@local, rider2@local / "rider123"');
  logger.info('  customer : phone "+10000000000" via OTP (dev mode returns code)');
}

main()
  .catch((err) => {
    logger.error({ err }, 'seed: failed');
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.close().catch(() => undefined);
    await redis.close().catch(() => undefined);
  });
