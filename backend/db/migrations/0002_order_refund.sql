-- 0002_order_refund.sql — add `refunded_at` to orders for the admin refund flag.

BEGIN;

ALTER TABLE orders ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS orders_refunded_at_idx ON orders (refunded_at)
  WHERE refunded_at IS NOT NULL;

COMMIT;