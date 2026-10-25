import { query } from '../../config/db';

export interface MenuItemRow {
  id: string;
  restaurant_id: string;
  name: string;
  description: string | null;
  price_cents: number;
  is_available: boolean;
  created_at: Date;
  updated_at: Date;
}

export async function listForRestaurant(
  restaurantId: string,
  options: { includeUnavailable?: boolean } = {},
): Promise<MenuItemRow[]> {
  const sql = options.includeUnavailable
    ? `SELECT id, restaurant_id, name, description, price_cents, is_available, created_at, updated_at
         FROM menu_items WHERE restaurant_id = $1 ORDER BY created_at`
    : `SELECT id, restaurant_id, name, description, price_cents, is_available, created_at, updated_at
         FROM menu_items WHERE restaurant_id = $1 AND is_available = true ORDER BY created_at`;
  const res = await query<MenuItemRow>(sql, [restaurantId]);
  return res.rows;
}

export async function findById(id: string): Promise<MenuItemRow | null> {
  const res = await query<MenuItemRow>(
    `SELECT id, restaurant_id, name, description, price_cents, is_available, created_at, updated_at
       FROM menu_items WHERE id = $1 LIMIT 1`,
    [id],
  );
  return res.rows[0] ?? null;
}

export async function create(
  restaurantId: string,
  input: { name: string; description?: string; price_cents: number; is_available?: boolean },
): Promise<MenuItemRow> {
  const res = await query<MenuItemRow>(
    `INSERT INTO menu_items (restaurant_id, name, description, price_cents, is_available)
       VALUES ($1, $2, $3, $4, COALESCE($5, true))
     RETURNING id, restaurant_id, name, description, price_cents, is_available, created_at, updated_at`,
    [restaurantId, input.name, input.description ?? null, input.price_cents, input.is_available ?? null],
  );
  return res.rows[0]!;
}

export async function update(
  id: string,
  patch: {
    name?: string;
    description?: string | null;
    price_cents?: number;
    is_available?: boolean;
  },
): Promise<MenuItemRow> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  if (patch.name !== undefined) { fields.push(`name = $${++i}`); values.push(patch.name); }
  if (patch.description !== undefined) { fields.push(`description = $${++i}`); values.push(patch.description); }
  if (patch.price_cents !== undefined) { fields.push(`price_cents = $${++i}`); values.push(patch.price_cents); }
  if (patch.is_available !== undefined) { fields.push(`is_available = $${++i}`); values.push(patch.is_available); }

  const sql = `
    UPDATE menu_items SET ${fields.join(', ')}
     WHERE id = $1
     RETURNING id, restaurant_id, name, description, price_cents, is_available, created_at, updated_at
  `;
  const res = await query<MenuItemRow>(sql, [id, ...values]);
  return res.rows[0]!;
}

export async function remove(id: string): Promise<void> {
  await query(`DELETE FROM menu_items WHERE id = $1`, [id]);
}
