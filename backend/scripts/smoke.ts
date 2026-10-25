/**
 * End-to-end smoke test for the backend API.
 *
 * Drives the full order lifecycle: customer auth → browse → order → merchant
 * confirm/prepare/ready → rider accept → pickup → delivered. Exits non-zero
 * on the first failure.
 *
 * Usage: tsx scripts/smoke.ts [base_url]
 *   default base_url: http://localhost:4000
 */

const BASE = process.argv[2] || 'http://localhost:4000';

interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
}
interface ApiError {
  success: false;
  error: { code: string; message: string; details?: unknown };
}

let failed = 0;
const steps: string[] = [];

function logStep(name: string, ok: boolean, extra?: unknown) {
  const marker = ok ? '✓' : '✗';
  // eslint-disable-next-line no-console
  console.log(`${marker} ${name}${extra !== undefined ? '  ' + JSON.stringify(extra) : ''}`);
  steps.push(`${marker} ${name}`);
  if (!ok) failed++;
}

async function call<T>(
  method: string,
  path: string,
  opts: { token?: string; body?: unknown } = {},
): Promise<{ status: number; body: ApiSuccess<T> | ApiError }> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  const body = (await res.json()) as ApiSuccess<T> | ApiError;
  return { status: res.status, body };
}

function isSuccess<T>(b: ApiSuccess<T> | ApiError): b is ApiSuccess<T> {
  return b.success === true;
}

async function main() {
  // eslint-disable-next-line no-console
  console.log(`smoke test → ${BASE}\n`);

  // 1. Health
  {
    const r = await call<{ status: string }>('GET', '/healthz');
    logStep('GET /healthz', r.status === 200 && isSuccess(r.body) && r.body.data.status === 'ok');
  }
  {
    const r = await call<{ status: string; checks: { db: boolean; redis: boolean } }>(
      'GET', '/readyz',
    );
    logStep('GET /readyz (db+redis)', r.status === 200 && isSuccess(r.body) && r.body.data.checks.db && r.body.data.checks.redis);
  }

  // 2. Customer OTP
  let customerToken = '';
  {
    const r = await call<{ sent: true; devCode?: string }>(
      'POST', '/api/v1/auth/customer/request-otp', { body: { phone: '+10000000000' } },
    );
    const ok = r.status === 200 && isSuccess(r.body) && Boolean(r.body.data.devCode);
    logStep('POST /auth/customer/request-otp', ok);
    if (!ok || !isSuccess(r.body)) return;
    const code = r.body.data.devCode!;
    const v = await call<{ token: string; user: { id: string } }>(
      'POST', '/api/v1/auth/customer/verify-otp',
      { body: { phone: '+10000000000', otp: code } },
    );
    logStep('POST /auth/customer/verify-otp', v.status === 201 && isSuccess(v.body));
    if (!isSuccess(v.body)) return;
    customerToken = v.body.data.token;
  }

  // 3. Browse (find a restaurant owned by merchant1 to keep the flow consistent)
  let firstRestaurantId = '';
  let firstMenuItemId = '';
  {
    const r = await call<{ items: Array<{ id: string; name: string; merchant_id: string }> }>(
      'GET', '/api/v1/restaurants?q=Spice',
    );
    logStep('GET /restaurants?q=Spice', r.status === 200 && isSuccess(r.body) && r.body.data.items.length >= 1);
    if (!isSuccess(r.body) || r.body.data.items.length < 1) return;
    firstRestaurantId = r.body.data.items[0]!.id;

    const m = await call<{ items: Array<{ id: string; name: string; price_cents: number }> }>(
      'GET', `/api/v1/restaurants/${firstRestaurantId}/menu`,
    );
    logStep('GET /restaurants/:id/menu', m.status === 200 && isSuccess(m.body) && m.body.data.items.length >= 1);
    if (!isSuccess(m.body) || m.body.data.items.length < 1) return;
    firstMenuItemId = m.body.data.items[0]!.id;
  }

  // 4. Place order
  let orderId = '';
  {
    const r = await call<{ order: { id: string; status: string } }>(
      'POST', '/api/v1/orders',
      {
        token: customerToken,
        body: {
          restaurant_id: firstRestaurantId,
          items: [{ menu_item_id: firstMenuItemId, qty: 2 }],
          address: 'Customer Address, Bengaluru',
          lat: 12.97,
          lng: 77.59,
        },
      },
    );
    logStep('POST /orders → placed',
      r.status === 201 && isSuccess(r.body) && r.body.data.order.status === 'placed',
      isSuccess(r.body) ? r.body.data : r.body);
    if (!isSuccess(r.body)) return;
    orderId = r.body.data.order.id;
  }

  // 5. Merchant login + transitions
  let merchantToken = '';
  {
    const r = await call<{ token: string }>(
      'POST', '/api/v1/auth/merchant/login',
      { body: { email: 'merchant1@local', password: 'merchant123' } },
    );
    logStep('POST /auth/merchant/login', r.status === 200 && isSuccess(r.body));
    if (!isSuccess(r.body)) return;
    merchantToken = r.body.data.token;
  }
  {
    const r = await call<{ status: string }>(
      'POST', `/api/v1/orders/${orderId}/confirm`,
      { token: merchantToken },
    );
    logStep('POST /orders/:id/confirm → confirmed',
      r.status === 200 && isSuccess(r.body) && r.body.data.status === 'confirmed',
      isSuccess(r.body) ? r.body.data : r.body);
  }
  {
    const r = await call<{ status: string }>(
      'POST', `/api/v1/orders/${orderId}/preparing`,
      { token: merchantToken },
    );
    logStep('POST /orders/:id/preparing → preparing',
      r.status === 200 && isSuccess(r.body) && r.body.data.status === 'preparing',
      isSuccess(r.body) ? r.body.data : r.body);
  }
  {
    const r = await call<{ status: string }>(
      'POST', `/api/v1/orders/${orderId}/ready`,
      { token: merchantToken },
    );
    logStep('POST /orders/:id/ready → ready_for_pickup',
      r.status === 200 && isSuccess(r.body) && r.body.data.status === 'ready_for_pickup',
      isSuccess(r.body) ? r.body.data : r.body);
  }

  // 6. Rider login, take online, accept order
  let riderToken = '';
  {
    const r = await call<{ token: string }>(
      'POST', '/api/v1/auth/rider/login',
      { body: { email: 'rider1@local', password: 'rider123' } },
    );
    logStep('POST /auth/rider/login', r.status === 200 && isSuccess(r.body));
    if (!isSuccess(r.body)) return;
    riderToken = r.body.data.token;
  }
  {
    const r = await call<{ status: string }>(
      'PATCH', '/api/v1/riders/me/status',
      { token: riderToken, body: { status: 'online' } },
    );
    logStep('PATCH /riders/me/status → online',
      r.status === 200 && isSuccess(r.body) && r.body.data.status === 'online',
      isSuccess(r.body) ? r.body.data : r.body);
  }
  {
    const r = await call<{ orderId: string; assignmentId: string }>(
      'POST', `/api/v1/dispatch/accept/${orderId}`,
      { token: riderToken },
    );
    logStep('POST /dispatch/accept/:orderId → assigned',
      r.status === 201 && isSuccess(r.body),
      isSuccess(r.body) ? r.body.data : r.body);
  }
  {
    const r = await call<{ status: string }>(
      'POST', `/api/v1/orders/${orderId}/picked-up`,
      { token: riderToken },
    );
    logStep('POST /orders/:id/picked-up → picked_up',
      r.status === 200 && isSuccess(r.body) && r.body.data.status === 'picked_up',
      isSuccess(r.body) ? r.body.data : r.body);
  }
  {
    const r = await call<{ status: string }>(
      'POST', `/api/v1/orders/${orderId}/delivered`,
      { token: riderToken },
    );
    logStep('POST /orders/:id/delivered → delivered',
      r.status === 200 && isSuccess(r.body) && r.body.data.status === 'delivered',
      isSuccess(r.body) ? r.body.data : r.body);
  }

  // 7. Admin login + admin list
  let adminToken = '';
  {
    const r = await call<{ token: string }>(
      'POST', '/api/v1/auth/admin/login',
      { body: { email: 'admin@local', password: 'admin123' } },
    );
    logStep('POST /auth/admin/login', r.status === 200 && isSuccess(r.body));
    if (!isSuccess(r.body)) return;
    adminToken = r.body.data.token;
  }
  {
    const r = await call<{ items: Array<{ id: string }> }>(
      'GET', '/api/v1/admin/orders',
      { token: adminToken },
    );
    logStep('GET /admin/orders contains delivered order',
      r.status === 200 && isSuccess(r.body) && r.body.data.items.some((o) => o.id === orderId),
      isSuccess(r.body) ? { count: r.body.data.items.length } : r.body);
  }
  {
    const r = await call<{ items: Array<{ id: string }> }>(
      'GET', '/api/v1/admin/users',
      { token: adminToken },
    );
    logStep('GET /admin/users',
      r.status === 200 && isSuccess(r.body) && r.body.data.items.length >= 1,
      isSuccess(r.body) ? { count: r.body.data.items.length } : r.body);
  }
  {
    const r = await call<{ items: Array<{ id: string; status: string; active_assignments: number }> }>(
      'GET', '/api/v1/admin/riders',
      { token: adminToken },
    );
    logStep('GET /admin/riders',
      r.status === 200 && isSuccess(r.body) && r.body.data.items.length >= 1
        && r.body.data.items.every((x) => typeof x.active_assignments === 'number'),
      isSuccess(r.body) ? { count: r.body.data.items.length, sample: r.body.data.items[0] } : r.body);
  }
  {
    const r = await call<{ id: string; refunded_at: string }>(
      'POST', `/api/v1/admin/orders/${orderId}/refund`,
      { token: adminToken },
    );
    logStep('POST /admin/orders/:id/refund',
      r.status === 201 && isSuccess(r.body) && Boolean(r.body.data.refunded_at),
      isSuccess(r.body) ? r.body.data : r.body);
  }
  {
    // Second refund attempt should fail with 409 CONFLICT.
    const r = await call<{ id: string; refunded_at: string }>(
      'POST', `/api/v1/admin/orders/${orderId}/refund`,
      { token: adminToken },
    );
    logStep('POST /admin/orders/:id/refund (idempotent: 409 on repeat)',
      r.status === 409 && !isSuccess(r.body),
      r.body);
  }

  // 8. Customer: list own orders
  {
    const r = await call<{ items: Array<{ id: string; status: string }> }>(
      'GET', '/api/v1/orders',
      { token: customerToken },
    );
    logStep('GET /orders (customer scope)',
      r.status === 200 && isSuccess(r.body) && r.body.data.items.some((o) => o.id === orderId));
  }

  // eslint-disable-next-line no-console
  console.log(`\nresult: ${steps.length - failed}/${steps.length} passed`);
  if (failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('smoke test crashed:', err);
  process.exitCode = 1;
});
