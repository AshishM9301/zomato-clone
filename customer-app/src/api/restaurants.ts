import { api } from './client';
import type { Restaurant, RestaurantListResponse } from '../types';

export function listRestaurants(q?: string, page = 1, limit = 50) {
  return api.get<RestaurantListResponse>('/restaurants', {
    q: q?.trim() || undefined,
    page,
    limit,
  });
}

export function getRestaurant(id: string) {
  return api.get<Restaurant>(`/restaurants/${id}`);
}
