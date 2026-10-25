import { query } from '../../config/db';

export interface NotificationRow {
  id: string;
  user_id: string;
  type: string;
  payload: Record<string, unknown>;
  read_at: Date | null;
  created_at: Date;
}

export async function listForUser(
  userId: string,
  filters: { unreadOnly: boolean; limit: number; offset: number },
): Promise<NotificationRow[]> {
  const params: unknown[] = [userId];
  let where = 'user_id = $1';
  if (filters.unreadOnly) where += ' AND read_at IS NULL';
  params.push(filters.limit, filters.offset);
  const res = await query<NotificationRow>(
    `SELECT id, user_id, type, payload, read_at, created_at
       FROM notifications WHERE ${where}
      ORDER BY created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  return res.rows;
}

export async function insert(
  userId: string,
  type: string,
  payload: Record<string, unknown>,
): Promise<NotificationRow> {
  const res = await query<NotificationRow>(
    `INSERT INTO notifications (user_id, type, payload)
       VALUES ($1, $2, $3::jsonb)
     RETURNING id, user_id, type, payload, read_at, created_at`,
    [userId, type, JSON.stringify(payload)],
  );
  return res.rows[0]!;
}

export async function markAllRead(userId: string): Promise<number> {
  const res = await query<{ n: number }>(
    `WITH updated AS (
       UPDATE notifications SET read_at = now()
        WHERE user_id = $1 AND read_at IS NULL
        RETURNING 1
     )
     SELECT COUNT(*)::int AS n FROM updated`,
    [userId],
  );
  return res.rows[0]?.n ?? 0;
}
