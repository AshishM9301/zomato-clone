import { api } from './client';
import type { MenuListResponse } from '../types';

export function getMenu(restaurantId: string, includeUnavailable = false) {
  return api.get<MenuListResponse>(`/restaurants/${restaurantId}/menu`, {
    include_unavailable: includeUnavailable,
  });
}
