import { PoolClient } from 'pg';
import { query, getPool } from '../../config/db';
import { hashPassword } from '../../common/utils/password';

export interface RestaurantRow {
  id: string;
  merchant_id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  is_open: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface RestaurantListItem extends RestaurantRow {
  business_name: string;
}

export async function findById(id: string): Promise<RestaurantRow | null> {
  const res = await query<RestaurantRow>(
    `SELECT id, merchant_id, name, address, lat, lng, is_open, created_at, updated_at
       FROM restaurants WHERE id = $1 LIMIT 1`,
    [id],
  );
  return res.rows[0] ?? null;
}

export interface ListFilters {
  q?: string;
  near?: { lat: number; lng: number };
  includeClosed: boolean;
  limit: number;
  offset: number;
}

export async function list(filters: ListFilters): Promise<RestaurantListItem[]> {
  const where: string[] = [];
  const params: unknown[] = [];

  if (!filters.includeClosed) where.push('r.is_open = true');

  if (filters.q) {
    params.push(`%${filters.q.toLowerCase()}%`);
    where.push(
      `(LOWER(r.name) LIKE $${params.length} OR LOWER(m.business_name) LIKE $${params.length})`,
    );
  }

  // Bounding box pre-filter for `near`. Cheap, narrows the set before
  // exact haversine sort.
  if (filters.near) {
    const { lat, lng } = filters.near;
    params.push(lat - 0.5, lat + 0.5, lng - 0.5, lng + 0.5);
    const latLo = params.length - 3;
    const latHi = params.length - 2;
    const lngLo = params.length - 1;
    const lngHi = params.length;
    where.push(`r.lat BETWEEN $${latLo} AND $${latHi}`);
    where.push(`r.lng BETWEEN $${lngLo} AND $${lngHi}`);
  }

  const orderBy = filters.near
    ? (() => {
        // haversine: prepend lat, lng params at positions 1 and 2.
        params.unshift(filters.near.lat, filters.near.lng);
        return `ORDER BY (
          2 * 6371 * asin(sqrt(
            power(sin(radians(($1 - r.lat) / 2)), 2) +
            cos(radians($1)) * cos(radians(r.lat)) *
            power(sin(radians(($2 - r.lng) / 2)), 2)
          ))
        ) ASC`;
      })()
    : `ORDER BY r.created_at DESC`;

  params.push(filters.limit, filters.offset);
  const limitIdx = params.length - 1;
  const offsetIdx = params.length;

  const sql = `
    SELECT r.id, r.merchant_id, r.name, r.address, r.lat, r.lng, r.is_open,
           r.created_at, r.updated_at, m.business_name
      FROM restaurants r
      JOIN merchants m ON m.id = r.merchant_id
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ${orderBy}
      LIMIT $${limitIdx} OFFSET $${offsetIdx}
  `;

  const res = await query<RestaurantListItem>(sql, params);
  return res.rows;
}

export async function update(
  id: string,
  patch: {
    name?: string;
    address?: string;
    lat?: number;
    lng?: number;
    is_open?: boolean;
  },
): Promise<RestaurantRow> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  if (patch.name !== undefined) { fields.push(`name = $${++i}`); values.push(patch.name); }
  if (patch.address !== undefined) { fields.push(`address = $${++i}`); values.push(patch.address); }
  if (patch.lat !== undefined) { fields.push(`lat = $${++i}`); values.push(patch.lat); }
  if (patch.lng !== undefined) { fields.push(`lng = $${++i}`); values.push(patch.lng); }
  if (patch.is_open !== undefined) { fields.push(`is_open = $${++i}`); values.push(patch.is_open); }

  const sql = `
    UPDATE restaurants SET ${fields.join(', ')}
     WHERE id = $1
     RETURNING id, merchant_id, name, address, lat, lng, is_open, created_at, updated_at
  `;
  const res = await query<RestaurantRow>(sql, [id, ...values]);
  return res.rows[0]!;
}

export interface CreateRestaurantWithMerchantInput {
  restaurant: {
    name: string;
    address: string;
    lat: number;
    lng: number;
  };
  merchant: {
    email: string;
    password: string;
    business_name: string;
  };
  merchantUserId?: string;
}

export async function createWithMerchant(
  input: CreateRestaurantWithMerchantInput,
): Promise<{ restaurant: RestaurantRow; merchantId: string }> {
  const client: PoolClient = await getPool().connect();
  try {
    await client.query('BEGIN');

    let merchantId: string;
    if (input.merchantUserId) {
      const found = await client.query<{ id: string }>(
        `SELECT id FROM merchants WHERE user_id = $1 LIMIT 1`,
        [input.merchantUserId],
      );
      if (!found.rows[0]) throw new Error('merchant not found for user');
      merchantId = found.rows[0].id;
    } else {
      const passwordHash = await hashPassword(input.merchant.password);
      const userRes = await client.query<{ id: string }>(
        `INSERT INTO users (role, email, name, password_hash)
           VALUES ('merchant', $1, $2, $3)
         RETURNING id`,
        [input.merchant.email, input.merchant.business_name, passwordHash],
      );
      const userId = userRes.rows[0]!.id;
      const merchantRes = await client.query<{ id: string }>(
        `INSERT INTO merchants (user_id, business_name) VALUES ($1, $2) RETURNING id`,
        [userId, input.merchant.business_name],
      );
      merchantId = merchantRes.rows[0]!.id;
    }

    const restaurantRes = await client.query<RestaurantRow>(
      `INSERT INTO restaurants (merchant_id, name, address, lat, lng)
         VALUES ($1, $2, $3, $4, $5)
       RETURNING id, merchant_id, name, address, lat, lng, is_open, created_at, updated_at`,
      [
        merchantId,
        input.restaurant.name,
        input.restaurant.address,
        input.restaurant.lat,
        input.restaurant.lng,
      ],
    );
    const restaurant = restaurantRes.rows[0]!;

    await client.query('COMMIT');
    return { restaurant, merchantId };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}
