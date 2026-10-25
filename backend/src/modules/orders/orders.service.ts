import { getPool } from '../../config/db';
import AppError from '../../common/errors/AppError';
import {
  ORDER_STATUS,
  canTransition,
  isTerminal,
  type OrderStatus,
} from '../../common/constants/orderStatus';
import { ROLES, type Role } from '../../common/constants/roles';
import * as restaurantRepo from '../restaurants/restaurants.repository';
import * as menuRepo from '../menus/menus.repository';
import * as repo from './orders.repository';
import type {
  CancelOrderInput,
  CreateOrderInput,
  ListOrdersQuery,
} from './orders.validation';

const DELIVERY_FEE_CENTS = 3000; // flat 30 INR for MVP.

export async function create(
  customerId: string,
  input: CreateOrderInput,
) {
  const restaurant = await restaurantRepo.findById(input.restaurant_id);
  if (!restaurant) throw AppError.notFound('Restaurant not found');
  if (!restaurant.is_open) throw AppError.businessRule('Restaurant is not accepting orders');

  // Load + validate all menu items belong to the restaurant.
  const items = [];
  for (const wanted of input.items) {
    const item = await menuRepo.findById(wanted.menu_item_id);
    if (!item) throw AppError.badRequest(`Menu item ${wanted.menu_item_id} not found`);
    if (item.restaurant_id !== input.restaurant_id) {
      throw AppError.badRequest(`Menu item ${wanted.menu_item_id} does not belong to this restaurant`);
    }
    if (!item.is_available) {
      throw AppError.businessRule(`Item ${item.name} is not available`);
    }
    items.push({
      menu_item_id: item.id,
      name_snapshot: item.name,
      unit_price_cents: item.price_cents,
      qty: wanted.qty,
    });
  }

  const subtotalCents = items.reduce(
    (sum, it) => sum + it.unit_price_cents * it.qty,
    0,
  );
  const totalCents = subtotalCents + DELIVERY_FEE_CENTS;

  const { order, items: createdItems } = await repo.createWithItems({
    customerId,
    restaurantId: input.restaurant_id,
    items,
    subtotalCents,
    deliveryFeeCents: DELIVERY_FEE_CENTS,
    totalCents,
    address: input.address,
    lat: input.lat ?? null,
    lng: input.lng ?? null,
    notes: input.notes ?? null,
  });
  return { order, items: createdItems };
}

interface Actor {
  id: string;
  role: Role;
  merchantId?: string;
  riderId?: string;
}

async function loadOrderForActor(orderId: string, actor: Actor) {
  const order = await repo.findById(orderId);
  if (!order) throw AppError.notFound('Order not found');

  switch (actor.role) {
    case ROLES.ADMIN:
      return order;
    case ROLES.CUSTOMER:
      if (order.customer_id !== actor.id) throw AppError.forbidden('Not your order');
      return order;
    case ROLES.MERCHANT: {
      if (!actor.merchantId) throw AppError.forbidden('Merchant identity missing');
      const restaurant = await restaurantRepo.findById(order.restaurant_id);
      if (!restaurant || restaurant.merchant_id !== actor.merchantId) {
        throw AppError.forbidden('Order is not from your restaurant');
      }
      return order;
    }
    case ROLES.RIDER: {
      if (!actor.riderId) throw AppError.forbidden('Rider identity missing');
      const a = await repo.findActiveAssignmentForOrder(order.id);
      if (!a || a.rider_id !== actor.riderId) {
        throw AppError.forbidden('You are not assigned to this order');
      }
      return order;
    }
    default:
      throw AppError.forbidden('Unsupported role');
  }
}

export async function getById(orderId: string, actor: Actor) {
  const order = await loadOrderForActor(orderId, actor);
  const items = await repo.findItemsByOrderId(order.id);
  return { order, items };
}

export async function list(query: ListOrdersQuery, actor: Actor) {
  const filters = {
    status: query.status,
    limit: query.limit,
    offset: (query.page - 1) * query.limit,
  };
  switch (actor.role) {
    case ROLES.CUSTOMER:
      return { items: await repo.listForCustomer(actor.id, filters), page: query.page, limit: query.limit };
    case ROLES.MERCHANT:
      if (!actor.merchantId) throw AppError.forbidden('Merchant identity missing');
      return { items: await repo.listForMerchant(actor.merchantId, filters), page: query.page, limit: query.limit };
    case ROLES.RIDER:
      if (!actor.riderId) throw AppError.forbidden('Rider identity missing');
      return { items: await repo.listForRider(actor.riderId, filters), page: query.page, limit: query.limit };
    case ROLES.ADMIN:
      return { items: await repo.listAll(filters), page: query.page, limit: query.limit };
    default:
      throw AppError.forbidden('Unsupported role');
  }
}

async function transition(
  orderId: string,
  to: OrderStatus,
  actor: Actor,
  options: { cancellationReason?: string } = {},
) {
  const order = await loadOrderForActor(orderId, actor);
  if (isTerminal(order.status)) {
    throw AppError.conflict(`Order is already in terminal state: ${order.status}`);
  }
  if (!canTransition(order.status, to)) {
    throw AppError.businessRule(`Cannot transition from ${order.status} to ${to}`);
  }
  return repo.updateStatus(order.id, to, options.cancellationReason);
}

// ---------- merchant transitions ----------

async function requireOwningMerchant(orderId: string, actor: Actor) {
  const order = await loadOrderForActor(orderId, actor);
  if (actor.role !== ROLES.MERCHANT) {
    throw AppError.forbidden('Only merchants can perform this action');
  }
  if (isTerminal(order.status)) {
    throw AppError.conflict(`Order is already in terminal state: ${order.status}`);
  }
  return order;
}

export async function confirm(orderId: string, actor: Actor) {
  await requireOwningMerchant(orderId, actor);
  return transition(orderId, ORDER_STATUS.CONFIRMED, actor);
}

export async function preparing(orderId: string, actor: Actor) {
  await requireOwningMerchant(orderId, actor);
  return transition(orderId, ORDER_STATUS.PREPARING, actor);
}

export async function ready(orderId: string, actor: Actor) {
  await requireOwningMerchant(orderId, actor);
  return transition(orderId, ORDER_STATUS.READY_FOR_PICKUP, actor);
}

// ---------- rider transitions ----------

export async function markDelivered(orderId: string, actor: Actor) {
  if (actor.role !== ROLES.RIDER) {
    throw AppError.forbidden('Only riders can mark an order as delivered');
  }
  const order = await loadOrderForActor(orderId, actor);
  if (order.status !== ORDER_STATUS.PICKED_UP) {
    throw AppError.businessRule(
      `Cannot mark delivered from ${order.status}; rider must pick up first`,
    );
  }
  const assignment = await repo.findActiveAssignmentForOrder(order.id);
  if (!assignment) {
    throw AppError.conflict('No active assignment for this order');
  }
  const updated = await repo.updateStatus(order.id, ORDER_STATUS.DELIVERED);
  await repo.completeAssignment(assignment.id);
  return updated;
}

export async function markPickedUp(orderId: string, actor: Actor) {
  if (actor.role !== ROLES.RIDER) {
    throw AppError.forbidden('Only riders can mark an order as picked up');
  }
  const order = await loadOrderForActor(orderId, actor);
  if (order.status !== ORDER_STATUS.ASSIGNED) {
    throw AppError.businessRule(
      `Cannot mark picked up from ${order.status}; order must be assigned first`,
    );
  }
  const assignment = await repo.findActiveAssignmentForOrder(order.id);
  if (!assignment) {
    throw AppError.conflict('No active assignment for this order');
  }
  return repo.updateStatus(order.id, ORDER_STATUS.PICKED_UP);
}

// ---------- cancellation (role-aware) ----------

const CUSTOMER_CANCEL_FROM: ReadonlySet<OrderStatus> = new Set([ORDER_STATUS.PLACED]);
const MERCHANT_CANCEL_FROM: ReadonlySet<OrderStatus> = new Set([
  ORDER_STATUS.PLACED,
  ORDER_STATUS.CONFIRMED,
  ORDER_STATUS.PREPARING,
]);

export async function cancel(
  orderId: string,
  input: CancelOrderInput,
  actor: Actor,
) {
  const order = await loadOrderForActor(orderId, actor);
  if (isTerminal(order.status)) {
    throw AppError.conflict(`Order is already in terminal state: ${order.status}`);
  }

  switch (actor.role) {
    case ROLES.CUSTOMER:
      if (!CUSTOMER_CANCEL_FROM.has(order.status)) {
        throw AppError.businessRule(
          `Customers can only cancel orders in 'placed' state (current: ${order.status})`,
        );
      }
      break;
    case ROLES.MERCHANT:
      if (!MERCHANT_CANCEL_FROM.has(order.status)) {
        throw AppError.businessRule(
          `Merchants cannot cancel orders in '${order.status}' state`,
        );
      }
      break;
    case ROLES.ADMIN:
      // Can cancel any non-terminal.
      break;
    default:
      throw AppError.forbidden('Unsupported role for cancellation');
  }

  // Release any active assignment.
  const assignment = await repo.findActiveAssignmentForOrder(order.id);
  if (assignment) {
    await repo.releaseAssignment(assignment.id);
  }

  return repo.updateStatus(order.id, ORDER_STATUS.CANCELLED, input.reason);
}

// Re-exported for dispatch service: transition without role checks.
export async function adminTransitionStatus(
  orderId: string,
  to: OrderStatus,
  reason?: string,
) {
  const order = await repo.findById(orderId);
  if (!order) throw AppError.notFound('Order not found');
  if (!canTransition(order.status, to)) {
    throw AppError.businessRule(`Cannot transition from ${order.status} to ${to}`);
  }
  return repo.updateStatus(order.id, to, reason);
}

export { repo as orderRepo };
