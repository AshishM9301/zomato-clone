import { PoolClient } from 'pg';
import { query, getPool } from '../../config/db';
import type { OrderStatus } from '../../common/constants/orderStatus';

export interface OrderRow {
  id: string;
  customer_id: string;
  restaurant_id: string;
  status: OrderStatus;
  subtotal_cents: number;
  delivery_fee_cents: number;
  total_cents: number;
  address: string;
  lat: number | null;
  lng: number | null;
  notes: string | null;
  cancellation_reason: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface OrderItemRow {
  id: string;
  order_id: string;
  menu_item_id: string;
  name_snapshot: string;
  qty: number;
  unit_price_cents: number;
}

export async function findById(id: string): Promise<OrderRow | null> {
  const res = await query<OrderRow>(
    `SELECT * FROM orders WHERE id = $1 LIMIT 1`,
    [id],
  );
  return res.rows[0] ?? null;
}

export async function findItemsByOrderId(orderId: string): Promise<OrderItemRow[]> {
  const res = await query<OrderItemRow>(
    `SELECT id, order_id, menu_item_id, name_snapshot, qty, unit_price_cents
       FROM order_items WHERE order_id = $1`,
    [orderId],
  );
  return res.rows;
}

export interface CreateOrderWithItemsInput {
  customerId: string;
  restaurantId: string;
  items: Array<{ menu_item_id: string; name_snapshot: string; unit_price_cents: number; qty: number }>;
  subtotalCents: number;
  deliveryFeeCents: number;
  totalCents: number;
  address: string;
  lat: number | null;
  lng: number | null;
  notes: string | null;
}

export async function createWithItems(
  input: CreateOrderWithItemsInput,
): Promise<{ order: OrderRow; items: OrderItemRow[] }> {
  const client: PoolClient = await getPool().connect();
  try {
    await client.query('BEGIN');

    const orderRes = await client.query<OrderRow>(
      `INSERT INTO orders (
          customer_id, restaurant_id, status,
          subtotal_cents, delivery_fee_cents, total_cents,
          address, lat, lng, notes
        ) VALUES ($1, $2, 'placed', $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        input.customerId,
        input.restaurantId,
        input.subtotalCents,
        input.deliveryFeeCents,
        input.totalCents,
        input.address,
        input.lat,
        input.lng,
        input.notes,
      ],
    );
    const order = orderRes.rows[0]!;

    // Bulk insert items.
    const values: unknown[] = [];
    const placeholders: string[] = [];
    let i = 0;
    for (const it of input.items) {
      placeholders.push(`($${++i}, $${++i}, $${++i}, $${++i}, $${++i})`);
      values.push(order.id, it.menu_item_id, it.name_snapshot, it.qty, it.unit_price_cents);
    }
    const itemsRes = await client.query<OrderItemRow>(
      `INSERT INTO order_items (order_id, menu_item_id, name_snapshot, qty, unit_price_cents)
         VALUES ${placeholders.join(', ')}
       RETURNING id, order_id, menu_item_id, name_snapshot, qty, unit_price_cents`,
      values,
    );

    await client.query('COMMIT');
    return { order, items: itemsRes.rows };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}

export interface ListFilters {
  status?: OrderStatus;
  limit: number;
  offset: number;
}

export async function listForCustomer(
  customerId: string,
  filters: ListFilters,
): Promise<OrderRow[]> {
  const params: unknown[] = [customerId];
  let where = 'customer_id = $1';
  if (filters.status) {
    params.push(filters.status);
    where += ` AND status = $${params.length}`;
  }
  params.push(filters.limit, filters.offset);
  const res = await query<OrderRow>(
    `SELECT * FROM orders WHERE ${where}
      ORDER BY created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  return res.rows;
}

export async function listForMerchant(
  merchantId: string,
  filters: ListFilters,
): Promise<OrderRow[]> {
  const params: unknown[] = [merchantId];
  let where = `restaurant_id IN (SELECT id FROM restaurants WHERE merchant_id = $1)`;
  if (filters.status) {
    params.push(filters.status);
    where += ` AND status = $${params.length}`;
  }
  params.push(filters.limit, filters.offset);
  const res = await query<OrderRow>(
    `SELECT * FROM orders WHERE ${where}
      ORDER BY created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  return res.rows;
}

export async function listForRider(
  riderId: string,
  filters: ListFilters,
): Promise<OrderRow[]> {
  const params: unknown[] = [riderId];
  let where = `id IN (SELECT order_id FROM assignments WHERE rider_id = $1)`;
  if (filters.status) {
    params.push(filters.status);
    where += ` AND status = $${params.length}`;
  }
  params.push(filters.limit, filters.offset);
  const res = await query<OrderRow>(
    `SELECT * FROM orders WHERE ${where}
      ORDER BY created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  return res.rows;
}

export async function listAll(
  filters: ListFilters,
): Promise<OrderRow[]> {
  const params: unknown[] = [];
  let where = '1=1';
  if (filters.status) {
    params.push(filters.status);
    where += ` AND status = $${params.length}`;
  }
  params.push(filters.limit, filters.offset);
  const res = await query<OrderRow>(
    `SELECT * FROM orders WHERE ${where}
      ORDER BY created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  return res.rows;
}

export async function updateStatus(
  orderId: string,
  status: OrderStatus,
  cancellationReason?: string,
): Promise<OrderRow> {
  const params: unknown[] = [status, orderId];
  let reasonClause = '';
  if (cancellationReason !== undefined) {
    params.push(cancellationReason);
    reasonClause = `, cancellation_reason = $${params.length}`;
  }
  const res = await query<OrderRow>(
    `UPDATE orders SET status = $1${reasonClause} WHERE id = $2 RETURNING *`,
    params,
  );
  return res.rows[0]!;
}

export async function findActiveAssignmentForOrder(
  orderId: string,
): Promise<{ id: string; rider_id: string; status: 'active' } | null> {
  const res = await query<{ id: string; rider_id: string; status: 'active' }>(
    `SELECT id, rider_id, status FROM assignments
      WHERE order_id = $1 AND status = 'active' LIMIT 1`,
    [orderId],
  );
  return res.rows[0] ?? null;
}

export async function findAssignmentForRider(
  assignmentId: string,
  riderId: string,
): Promise<{ id: string; order_id: string; rider_id: string; status: string } | null> {
  const res = await query<{ id: string; order_id: string; rider_id: string; status: string }>(
    `SELECT id, order_id, rider_id, status FROM assignments
      WHERE id = $1 AND rider_id = $2 LIMIT 1`,
    [assignmentId, riderId],
  );
  return res.rows[0] ?? null;
}

export async function createAssignment(
  orderId: string,
  riderId: string,
): Promise<{ id: string; order_id: string; rider_id: string }> {
  const res = await query<{ id: string; order_id: string; rider_id: string }>(
    `INSERT INTO assignments (order_id, rider_id) VALUES ($1, $2)
       RETURNING id, order_id, rider_id`,
    [orderId, riderId],
  );
  return res.rows[0]!;
}

export async function releaseAssignment(assignmentId: string): Promise<void> {
  await query(
    `UPDATE assignments SET status = 'released', released_at = now() WHERE id = $1`,
    [assignmentId],
  );
}

export async function completeAssignment(assignmentId: string): Promise<void> {
  await query(
    `UPDATE assignments SET status = 'completed' WHERE id = $1 AND status = 'active'`,
    [assignmentId],
  );
}
