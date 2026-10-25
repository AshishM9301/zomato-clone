import { api } from './client';
import type {
  CreateOrderInput,
  Order,
  OrderDetailResponse,
  OrderListResponse,
} from '../types';

export function createOrder(input: CreateOrderInput) {
  return api.post<OrderDetailResponse>('/orders', input);
}

export function listOrders(status?: string, page = 1, limit = 50) {
  return api.get<OrderListResponse>('/orders', { status, page, limit });
}

export function getOrder(id: string) {
  return api.get<OrderDetailResponse>(`/orders/${id}`);
}

export function cancelOrder(id: string, reason: string) {
  return api.post<Order>(`/orders/${id}/cancel`, { reason });
}
