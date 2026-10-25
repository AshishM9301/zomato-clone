import { query } from '../../config/db';
import type { Role } from '../../common/constants/roles';

export interface MerchantRow {
  id: string;
  user_id: string;
  business_name: string;
  status: 'active' | 'disabled';
  created_at: Date;
  updated_at: Date;
}

export interface UserSummary {
  id: string;
  role: Role;
  name: string;
  email: string | null;
  phone: string | null;
}

export async function findById(id: string): Promise<MerchantRow | null> {
  const res = await query<MerchantRow>(
    `SELECT id, user_id, business_name, status, created_at, updated_at
       FROM merchants WHERE id = $1 LIMIT 1`,
    [id],
  );
  return res.rows[0] ?? null;
}

export async function findByUserId(userId: string): Promise<MerchantRow | null> {
  const res = await query<MerchantRow>(
    `SELECT id, user_id, business_name, status, created_at, updated_at
       FROM merchants WHERE user_id = $1 LIMIT 1`,
    [userId],
  );
  return res.rows[0] ?? null;
}

export async function findUserSummaryByMerchantId(
  merchantId: string,
): Promise<UserSummary | null> {
  const res = await query<UserSummary>(
    `SELECT u.id, u.role, u.name, u.email, u.phone
       FROM merchants m JOIN users u ON u.id = m.user_id
      WHERE m.id = $1 LIMIT 1`,
    [merchantId],
  );
  return res.rows[0] ?? null;
}

export async function updateBusinessName(
  merchantId: string,
  name: string,
): Promise<MerchantRow> {
  const res = await query<MerchantRow>(
    `UPDATE merchants SET business_name = $2 WHERE id = $1
     RETURNING id, user_id, business_name, status, created_at, updated_at`,
    [merchantId, name],
  );
  return res.rows[0]!;
}

export async function listRestaurantsForMerchant(
  merchantId: string,
): Promise<
  Array<{
    id: string;
    name: string;
    address: string;
    lat: number;
    lng: number;
    is_open: boolean;
  }>
> {
  const res = await query<{
    id: string;
    name: string;
    address: string;
    lat: number;
    lng: number;
    is_open: boolean;
  }>(
    `SELECT id, name, address, lat, lng, is_open
       FROM restaurants WHERE merchant_id = $1 ORDER BY created_at`,
    [merchantId],
  );
  return res.rows;
}
