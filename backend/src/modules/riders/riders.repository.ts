import { query } from '../../config/db';

export type RiderStatus = 'online' | 'offline' | 'busy';

export interface RiderRow {
  id: string;
  user_id: string;
  status: RiderStatus;
  current_lat: number | null;
  current_lng: number | null;
  created_at: Date;
  updated_at: Date;
}

export interface RiderUserSummary {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
}

export async function findById(id: string): Promise<RiderRow | null> {
  const res = await query<RiderRow>(
    `SELECT id, user_id, status, current_lat, current_lng, created_at, updated_at
       FROM riders WHERE id = $1 LIMIT 1`,
    [id],
  );
  return res.rows[0] ?? null;
}

export async function findByUserId(userId: string): Promise<RiderRow | null> {
  const res = await query<RiderRow>(
    `SELECT id, user_id, status, current_lat, current_lng, created_at, updated_at
       FROM riders WHERE user_id = $1 LIMIT 1`,
    [userId],
  );
  return res.rows[0] ?? null;
}

export async function findUserSummaryByRiderId(
  riderId: string,
): Promise<RiderUserSummary | null> {
  const res = await query<RiderUserSummary>(
    `SELECT u.id, u.name, u.email, u.phone
       FROM riders r JOIN users u ON u.id = r.user_id
      WHERE r.id = $1 LIMIT 1`,
    [riderId],
  );
  return res.rows[0] ?? null;
}

export async function updateStatus(
  riderId: string,
  status: RiderStatus,
): Promise<RiderRow> {
  const res = await query<RiderRow>(
    `UPDATE riders SET status = $2 WHERE id = $1
     RETURNING id, user_id, status, current_lat, current_lng, created_at, updated_at`,
    [riderId, status],
  );
  return res.rows[0]!;
}
