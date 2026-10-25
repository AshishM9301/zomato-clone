import { query } from '../../config/db';
import type { Role } from '../../common/constants/roles';

export interface UserRow {
  id: string;
  role: Role;
  phone: string | null;
  email: string | null;
  name: string;
  password_hash: string | null;
  created_at: Date;
  updated_at: Date;
}

export async function findById(id: string): Promise<UserRow | null> {
  const res = await query<UserRow>(
    `SELECT id, role, phone, email, name, password_hash, created_at, updated_at
       FROM users WHERE id = $1 LIMIT 1`,
    [id],
  );
  return res.rows[0] ?? null;
}

export async function updateName(id: string, name: string): Promise<UserRow> {
  const res = await query<UserRow>(
    `UPDATE users SET name = $2 WHERE id = $1
     RETURNING id, role, phone, email, name, password_hash, created_at, updated_at`,
    [id, name],
  );
  return res.rows[0]!;
}
