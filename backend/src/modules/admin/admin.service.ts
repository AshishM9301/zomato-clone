import AppError from '../../common/errors/AppError';
import * as repo from './admin.repository';
import type {
  ListOrdersQuery,
  ListRidersQuery,
  ListUsersQuery,
  SetMerchantStatusInput,
  SetRiderStatusInput,
} from './admin.validation';

export async function listOrders(query: ListOrdersQuery) {
  const items = await repo.listOrders({
    status: query.status,
    limit: query.limit,
    offset: (query.page - 1) * query.limit,
  });
  return { items, page: query.page, limit: query.limit };
}

export async function listUsers(query: ListUsersQuery) {
  const items = await repo.listUsers({
    role: query.role,
    limit: query.limit,
    offset: (query.page - 1) * query.limit,
  });
  return { items, page: query.page, limit: query.limit };
}

export async function listRiders(query: ListRidersQuery) {
  const items = await repo.listRiders({
    status: query.status,
    limit: query.limit,
    offset: (query.page - 1) * query.limit,
  });
  return { items, page: query.page, limit: query.limit };
}

export async function listMerchants(query: { status?: 'active' | 'disabled'; page: number; limit: number }) {
  const items = await repo.listMerchants({
    status: query.status,
    limit: query.limit,
    offset: (query.page - 1) * query.limit,
  });
  return { items, page: query.page, limit: query.limit };
}

export async function setMerchantStatus(
  merchantId: string,
  input: SetMerchantStatusInput,
) {
  if (input.status === 'disabled') {
    const open = await repo.countMerchantOpenOrders(merchantId);
    if (open > 0) {
      throw AppError.businessRule(
        `Cannot disable merchant with ${open} open order(s)`,
      );
    }
  }
  const updated = await repo.setMerchantStatus(merchantId, input.status);
  if (!updated) throw AppError.notFound('Merchant not found');
  return updated;
}

export async function setRiderStatus(riderId: string, input: SetRiderStatusInput) {
  if (input.status === 'offline') {
    const active = await repo.countRiderActiveAssignments(riderId);
    if (active > 0) {
      throw AppError.businessRule(
        `Cannot take rider offline while ${active} active assignment(s) exist`,
      );
    }
  }
  const updated = await repo.setRiderStatus(riderId, input.status);
  if (!updated) throw AppError.notFound('Rider not found');
  return updated;
}

export async function refundOrder(orderId: string) {
  const order = await repo.findOrderById(orderId);
  if (!order) throw AppError.notFound('Order not found');
  if (order.refunded_at) {
    throw AppError.conflict('Order is already refunded', {
      refunded_at: order.refunded_at,
    });
  }
  const result = await repo.setOrderRefunded(orderId);
  if (!result) {
    const fresh = await repo.findOrderById(orderId);
    throw AppError.conflict('Order is already refunded', {
      refunded_at: fresh?.refunded_at ?? null,
    });
  }
  return { id: orderId, ...result };
}
