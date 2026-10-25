-- 0001_init.sql — initial schema for the hyperlocal food delivery MVP.
-- Conventions:
--   * UUIDs (gen_random_uuid() from pgcrypto).
--   * Money in integer minor units (e.g. paise). Never floats.
--   * Timestamps in UTC (timestamptz).
--   * Soft state columns: users/menu_items/merchants/riders; orders use an explicit status enum.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------- enums ----------
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('customer', 'merchant', 'rider', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE merchant_status AS ENUM ('active', 'disabled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE rider_status AS ENUM ('online', 'offline', 'busy');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE order_status AS ENUM (
    'placed',
    'confirmed',
    'preparing',
    'ready_for_pickup',
    'assigned',
    'picked_up',
    'delivered',
    'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE assignment_status AS ENUM ('active', 'released', 'completed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------- users ----------
CREATE TABLE IF NOT EXISTS users (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  role            user_role   NOT NULL,
  phone           TEXT,
  email           TEXT,
  name            TEXT        NOT NULL,
  password_hash   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT users_phone_email_xor
    CHECK (phone IS NOT NULL OR email IS NOT NULL),
  CONSTRAINT users_password_for_non_customer
    CHECK (
      (role = 'customer' AND password_hash IS NULL)
      OR (role <> 'customer' AND password_hash IS NOT NULL)
    )
);

-- Partial unique indexes: uniqueness only among rows that actually carry the value.
CREATE UNIQUE INDEX IF NOT EXISTS users_phone_uniq
  ON users (phone) WHERE phone IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS users_email_uniq
  ON users (email) WHERE email IS NOT NULL;

CREATE INDEX IF NOT EXISTS users_role_idx ON users (role);

-- ---------- merchants ----------
CREATE TABLE IF NOT EXISTS merchants (
  id            UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID            NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  business_name TEXT            NOT NULL,
  status        merchant_status NOT NULL DEFAULT 'active',
  created_at    TIMESTAMPTZ     NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS merchants_user_uniq ON merchants (user_id);
CREATE INDEX IF NOT EXISTS merchants_status_idx ON merchants (status);

-- ---------- riders ----------
CREATE TABLE IF NOT EXISTS riders (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status       rider_status NOT NULL DEFAULT 'offline',
  current_lat  DOUBLE PRECISION,
  current_lng  DOUBLE PRECISION,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS riders_user_uniq ON riders (user_id);
CREATE INDEX IF NOT EXISTS riders_status_idx ON riders (status);

-- ---------- restaurants ----------
CREATE TABLE IF NOT EXISTS restaurants (
  id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id  UUID          NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  name         TEXT          NOT NULL,
  address      TEXT          NOT NULL,
  lat          DOUBLE PRECISION NOT NULL,
  lng          DOUBLE PRECISION NOT NULL,
  is_open      BOOLEAN       NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS restaurants_merchant_idx ON restaurants (merchant_id);
CREATE INDEX IF NOT EXISTS restaurants_is_open_idx ON restaurants (is_open);

-- ---------- menu_items ----------
CREATE TABLE IF NOT EXISTS menu_items (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID          NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name          TEXT          NOT NULL,
  description   TEXT,
  price_cents   INTEGER       NOT NULL CHECK (price_cents >= 0),
  is_available  BOOLEAN       NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS menu_items_restaurant_idx ON menu_items (restaurant_id);

-- ---------- orders ----------
CREATE TABLE IF NOT EXISTS orders (
  id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id         UUID         NOT NULL REFERENCES users(id),
  restaurant_id       UUID         NOT NULL REFERENCES restaurants(id),
  status              order_status NOT NULL DEFAULT 'placed',
  subtotal_cents      INTEGER      NOT NULL CHECK (subtotal_cents >= 0),
  delivery_fee_cents  INTEGER      NOT NULL DEFAULT 0 CHECK (delivery_fee_cents >= 0),
  total_cents         INTEGER      NOT NULL CHECK (total_cents >= 0),
  address             TEXT         NOT NULL,
  lat                 DOUBLE PRECISION,
  lng                 DOUBLE PRECISION,
  notes               TEXT,
  cancellation_reason TEXT,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS orders_customer_idx   ON orders (customer_id);
CREATE INDEX IF NOT EXISTS orders_restaurant_idx ON orders (restaurant_id);
CREATE INDEX IF NOT EXISTS orders_status_idx     ON orders (status);
CREATE INDEX IF NOT EXISTS orders_created_at_idx ON orders (created_at DESC);

-- ---------- order_items ----------
CREATE TABLE IF NOT EXISTS order_items (
  id                UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id          UUID    NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id      UUID    NOT NULL REFERENCES menu_items(id),
  name_snapshot     TEXT    NOT NULL,
  qty               INTEGER NOT NULL CHECK (qty > 0),
  unit_price_cents  INTEGER NOT NULL CHECK (unit_price_cents >= 0)
);

CREATE INDEX IF NOT EXISTS order_items_order_idx ON order_items (order_id);

-- ---------- assignments ----------
CREATE TABLE IF NOT EXISTS assignments (
  id          UUID               PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    UUID               NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  rider_id    UUID               NOT NULL REFERENCES riders(id),
  status      assignment_status  NOT NULL DEFAULT 'active',
  assigned_at TIMESTAMPTZ        NOT NULL DEFAULT now(),
  released_at TIMESTAMPTZ
);

-- An order can have many historical assignments, but at most one active.
CREATE UNIQUE INDEX IF NOT EXISTS assignments_one_active_per_order
  ON assignments (order_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS assignments_rider_idx   ON assignments (rider_id);
CREATE INDEX IF NOT EXISTS assignments_status_idx  ON assignments (status);

-- ---------- notifications ----------
CREATE TABLE IF NOT EXISTS notifications (
  id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       TEXT         NOT NULL,
  payload    JSONB        NOT NULL DEFAULT '{}'::jsonb,
  read_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_user_idx       ON notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_unread_idx      ON notifications (user_id) WHERE read_at IS NULL;

-- ---------- updated_at triggers ----------
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY['users', 'merchants', 'riders', 'restaurants', 'menu_items', 'orders'])
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS %I_updated_at ON %I; CREATE TRIGGER %I_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION set_updated_at();',
      t, t, t, t
    );
  END LOOP;
END $$;

COMMIT;
