import { PoolClient } from 'pg';
import { query, getPool } from '../../config/db';
import {
  ORDER_STATUS,
  type OrderStatus,
} from '../../common/constants/orderStatus';

export interface AvailableOrderRow {
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
  restaurant_name: string;
  restaurant_lat: number;
  restaurant_lng: number;
}

export async function listAvailable(merchantId?: string): Promise<AvailableOrderRow[]> {
  const params: unknown[] = [ORDER_STATUS.READY_FOR_PICKUP];
  let where = `o.status = $1`;
  if (merchantId) {
    params.push(merchantId);
    where += ` AND r.merchant_id = $${params.length}`;
  }
  const res = await query<AvailableOrderRow>(
    `SELECT o.*, r.name AS restaurant_name, r.lat AS restaurant_lat, r.lng AS restaurant_lng
       FROM orders o
       JOIN restaurants r ON r.id = o.restaurant_id
      WHERE ${where}
        AND NOT EXISTS (
          SELECT 1 FROM assignments a
            WHERE a.order_id = o.id AND a.status = 'active'
        )
      ORDER BY o.created_at ASC`,
    params,
  );
  return res.rows;
}

export interface OnlineRiderRow {
  id: string;
  user_id: string;
  status: 'online' | 'offline' | 'busy';
  current_lat: number | null;
  current_lng: number | null;
  updated_at: Date;
}

export async function findFirstOnlineRider(): Promise<OnlineRiderRow | null> {
  // MVP: FIFO by updated_at. Geo selection is a follow-up.
  const res = await query<OnlineRiderRow>(
    `SELECT id, user_id, status, current_lat, current_lng, updated_at
       FROM riders WHERE status = 'online'
       ORDER BY updated_at ASC LIMIT 1`,
  );
  return res.rows[0] ?? null;
}

export async function setRiderStatus(
  riderId: string,
  status: 'online' | 'offline' | 'busy',
): Promise<void> {
  await query(`UPDATE riders SET status = $2 WHERE id = $1`, [riderId, status]);
}

/**
 * Atomic claim: find a ready order with no active assignment and assign it
 * to the given rider. Returns the order + assignment if successful.
 */
export interface ClaimResult {
  orderId: string;
  assignmentId: string;
}

export async function claimOrderForRider(
  orderId: string,
  riderId: string,
): Promise<ClaimResult | null> {
  const client: PoolClient = await getPool().connect();
  try {
    await client.query('BEGIN');

    // Lock the order row.
    const orderRes = await client.query<{ id: string; status: OrderStatus }>(
      `SELECT id, status FROM orders WHERE id = $1 FOR UPDATE`,
      [orderId],
    );
    const order = orderRes.rows[0];
    if (!order) {
      await client.query('ROLLBACK');
      return null;
    }
    if (order.status !== ORDER_STATUS.READY_FOR_PICKUP) {
      await client.query('ROLLBACK');
      return null;
    }

    // Check no active assignment.
    const existing = await client.query<{ id: string }>(
      `SELECT id FROM assignments WHERE order_id = $1 AND status = 'active' LIMIT 1`,
      [orderId],
    );
    if (existing.rows[0]) {
      await client.query('ROLLBACK');
      return null;
    }

    // Create assignment + transition order to assigned.
    const assignRes = await client.query<{ id: string }>(
      `INSERT INTO assignments (order_id, rider_id) VALUES ($1, $2) RETURNING id`,
      [orderId, riderId],
    );
    await client.query(
      `UPDATE orders SET status = 'assigned' WHERE id = $1`,
      [orderId],
    );

    await client.query('COMMIT');
    return { orderId, assignmentId: assignRes.rows[0]!.id };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}

export async function adminAssign(
  orderId: string,
  riderId: string,
): Promise<ClaimResult | null> {
  return claimOrderForRider(orderId, riderId);
}

export async function listAssignmentsForRider(riderId: string) {
  const res = await query<{
    id: string;
    order_id: string;
    status: 'active' | 'released' | 'completed';
    assigned_at: Date;
    released_at: Date | null;
  }>(
    `SELECT id, order_id, status, assigned_at, released_at
       FROM assignments WHERE rider_id = $1 ORDER BY assigned_at DESC`,
    [riderId],
  );
  return res.rows;
}
