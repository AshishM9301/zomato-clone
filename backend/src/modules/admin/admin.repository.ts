import { query } from '../../config/db';
import type { Role } from '../../common/constants/roles';
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
  refunded_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export async function listOrders(filters: {
  status?: OrderStatus;
  limit: number;
  offset: number;
}): Promise<OrderRow[]> {
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

export interface UserRow {
  id: string;
  role: Role;
  phone: string | null;
  email: string | null;
  name: string;
  created_at: Date;
  updated_at: Date;
}

export async function listUsers(filters: {
  role?: Role;
  limit: number;
  offset: number;
}): Promise<UserRow[]> {
  const params: unknown[] = [];
  let where = '1=1';
  if (filters.role) {
    params.push(filters.role);
    where += ` AND role = $${params.length}`;
  }
  params.push(filters.limit, filters.offset);
  const res = await query<UserRow>(
    `SELECT id, role, phone, email, name, created_at, updated_at
       FROM users WHERE ${where}
      ORDER BY created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  return res.rows;
}

export interface MerchantRow {
  id: string;
  user_id: string;
  business_name: string;
  status: 'active' | 'disabled';
  created_at: Date;
  updated_at: Date;
}

export async function setMerchantStatus(
  merchantId: string,
  status: 'active' | 'disabled',
): Promise<MerchantRow | null> {
  const res = await query<MerchantRow>(
    `UPDATE merchants SET status = $2 WHERE id = $1
     RETURNING id, user_id, business_name, status, created_at, updated_at`,
    [merchantId, status],
  );
  return res.rows[0] ?? null;
}

export async function countMerchantOpenOrders(merchantId: string): Promise<number> {
  const res = await query<{ n: string }>(
    `SELECT COUNT(*)::text AS n
       FROM orders o
       JOIN restaurants r ON r.id = o.restaurant_id
      WHERE r.merchant_id = $1
        AND o.status NOT IN ('delivered', 'cancelled')`,
    [merchantId],
  );
  return Number(res.rows[0]?.n ?? 0);
}

export interface RiderRow {
  id: string;
  user_id: string;
  status: 'online' | 'offline' | 'busy';
  current_lat: number | null;
  current_lng: number | null;
  created_at: Date;
  updated_at: Date;
}

export async function setRiderStatus(
  riderId: string,
  status: 'online' | 'offline' | 'busy',
): Promise<RiderRow | null> {
  const res = await query<RiderRow>(
    `UPDATE riders SET status = $2 WHERE id = $1
     RETURNING id, user_id, status, current_lat, current_lng, created_at, updated_at`,
    [riderId, status],
  );
  return res.rows[0] ?? null;
}

export async function countRiderActiveAssignments(riderId: string): Promise<number> {
  const res = await query<{ n: string }>(
    `SELECT COUNT(*)::text AS n
       FROM assignments WHERE rider_id = $1 AND status = 'active'`,
    [riderId],
  );
  return Number(res.rows[0]?.n ?? 0);
}

export interface RiderListItem {
  id: string;
  user_id: string;
  status: RiderRow['status'];
  current_lat: number | null;
  current_lng: number | null;
  name: string;
  email: string | null;
  phone: string | null;
  active_assignments: number;
  created_at: Date;
  updated_at: Date;
}

export async function listRiders(filters: {
  status?: RiderRow['status'];
  limit: number;
  offset: number;
}): Promise<RiderListItem[]> {
  const params: unknown[] = [];
  let where = '1=1';
  if (filters.status) {
    params.push(filters.status);
    where += ` AND r.status = $${params.length}`;
  }
  params.push(filters.limit, filters.offset);
  const res = await query<RiderListItem>(
    `SELECT r.id, r.user_id, r.status, r.current_lat, r.current_lng,
            u.name, u.email, u.phone,
            (SELECT COUNT(*)::int FROM assignments a
              WHERE a.rider_id = r.id AND a.status = 'active') AS active_assignments,
            r.created_at, r.updated_at
       FROM riders r
       JOIN users u ON u.id = r.user_id
      WHERE ${where}
      ORDER BY r.updated_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  return res.rows;
}

export async function countRiders(filters: { status?: RiderRow['status'] }): Promise<number> {
  const params: unknown[] = [];
  let where = '1=1';
  if (filters.status) {
    params.push(filters.status);
    where += ` AND status = $${params.length}`;
  }
  const res = await query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM riders WHERE ${where}`,
    params,
  );
  return Number(res.rows[0]?.n ?? 0);
}

export async function findOrderById(id: string): Promise<OrderRow | null> {
  const res = await query<OrderRow>(
    `SELECT * FROM orders WHERE id = $1 LIMIT 1`,
    [id],
  );
  return res.rows[0] ?? null;
}

export interface MerchantListItem {
  id: string;
  user_id: string;
  business_name: string;
  status: 'active' | 'disabled';
  name: string;
  email: string | null;
  phone: string | null;
  open_orders: number;
  created_at: Date;
  updated_at: Date;
}

export async function listMerchants(filters: {
  status?: 'active' | 'disabled';
  limit: number;
  offset: number;
}): Promise<MerchantListItem[]> {
  const params: unknown[] = [];
  let where = '1=1';
  if (filters.status) {
    params.push(filters.status);
    where += ` AND m.status = $${params.length}`;
  }
  params.push(filters.limit, filters.offset);
  const res = await query<MerchantListItem>(
    `SELECT m.id, m.user_id, m.business_name, m.status,
            u.name, u.email, u.phone,
            (SELECT COUNT(*)::int FROM orders o
              JOIN restaurants r ON r.id = o.restaurant_id
              WHERE r.merchant_id = m.id
                AND o.status NOT IN ('delivered', 'cancelled')) AS open_orders,
            m.created_at, m.updated_at
       FROM merchants m
       JOIN users u ON u.id = m.user_id
      WHERE ${where}
      ORDER BY m.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  return res.rows;
}

export async function setOrderRefunded(
  orderId: string,
): Promise<{ refunded_at: Date } | null> {
  const res = await query<{ refunded_at: Date }>(
    `UPDATE orders SET refunded_at = now()
      WHERE id = $1 AND refunded_at IS NULL
      RETURNING refunded_at`,
    [orderId],
  );
  return res.rows[0] ?? null;
}
