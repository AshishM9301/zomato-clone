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

export interface MerchantRow {
  id: string;
  user_id: string;
  business_name: string;
  status: 'active' | 'disabled';
}

export interface RiderRow {
  id: string;
  user_id: string;
  status: 'online' | 'offline' | 'busy';
}

export async function findUserByPhone(phone: string): Promise<UserRow | null> {
  const res = await query<UserRow>(
    `SELECT id, role, phone, email, name, password_hash, created_at, updated_at
       FROM users WHERE phone = $1 LIMIT 1`,
    [phone],
  );
  return res.rows[0] ?? null;
}

export async function findUserByEmail(email: string): Promise<UserRow | null> {
  const res = await query<UserRow>(
    `SELECT id, role, phone, email, name, password_hash, created_at, updated_at
       FROM users WHERE email = $1 LIMIT 1`,
    [email],
  );
  return res.rows[0] ?? null;
}

export async function findUserById(id: string): Promise<UserRow | null> {
  const res = await query<UserRow>(
    `SELECT id, role, phone, email, name, password_hash, created_at, updated_at
       FROM users WHERE id = $1 LIMIT 1`,
    [id],
  );
  return res.rows[0] ?? null;
}

export async function findMerchantByUserId(userId: string): Promise<MerchantRow | null> {
  const res = await query<MerchantRow>(
    `SELECT id, user_id, business_name, status FROM merchants WHERE user_id = $1 LIMIT 1`,
    [userId],
  );
  return res.rows[0] ?? null;
}

export async function findRiderByUserId(userId: string): Promise<RiderRow | null> {
  const res = await query<RiderRow>(
    `SELECT id, user_id, status FROM riders WHERE user_id = $1 LIMIT 1`,
    [userId],
  );
  return res.rows[0] ?? null;
}

export interface CreateCustomerInput {
  phone: string;
  name?: string;
}

export async function createCustomer(input: CreateCustomerInput): Promise<UserRow> {
  const res = await query<UserRow>(
    `INSERT INTO users (role, phone, name)
       VALUES ('customer', $1, COALESCE($2, 'Customer'))
     RETURNING id, role, phone, email, name, password_hash, created_at, updated_at`,
    [input.phone, input.name ?? null],
  );
  return res.rows[0]!;
}
