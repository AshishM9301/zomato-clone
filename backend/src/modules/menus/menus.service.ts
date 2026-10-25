import AppError from '../../common/errors/AppError';
import * as restaurantRepo from '../restaurants/restaurants.repository';
import * as repo from './menus.repository';
import type {
  CreateMenuItemInput,
  UpdateMenuItemInput,
} from './menus.validation';

export async function listForRestaurant(
  restaurantId: string,
  includeUnavailable: boolean,
) {
  // Existence check for a nicer 404 vs empty list.
  const r = await restaurantRepo.findById(restaurantId);
  if (!r) throw AppError.notFound('Restaurant not found');
  return repo.listForRestaurant(restaurantId, { includeUnavailable });
}

export async function create(
  restaurantId: string,
  input: CreateMenuItemInput,
  actor: { role: string; merchantId?: string },
) {
  const r = await restaurantRepo.findById(restaurantId);
  if (!r) throw AppError.notFound('Restaurant not found');
  if (actor.role === 'merchant' && actor.merchantId !== r.merchant_id) {
    throw AppError.forbidden('Cannot modify a restaurant you do not own');
  }
  return repo.create(restaurantId, input);
}

async function loadItemOr404(itemId: string) {
  const item = await repo.findById(itemId);
  if (!item) throw AppError.notFound('Menu item not found');
  return item;
}

export async function update(
  itemId: string,
  patch: UpdateMenuItemInput,
  actor: { role: string; merchantId?: string },
) {
  const item = await loadItemOr404(itemId);
  const r = await restaurantRepo.findById(item.restaurant_id);
  if (!r) throw AppError.notFound('Restaurant not found');
  if (actor.role === 'merchant' && actor.merchantId !== r.merchant_id) {
    throw AppError.forbidden('Cannot modify a restaurant you do not own');
  }
  return repo.update(itemId, patch);
}

export async function remove(
  itemId: string,
  actor: { role: string; merchantId?: string },
) {
  const item = await loadItemOr404(itemId);
  const r = await restaurantRepo.findById(item.restaurant_id);
  if (!r) throw AppError.notFound('Restaurant not found');
  if (actor.role === 'merchant' && actor.merchantId !== r.merchant_id) {
    throw AppError.forbidden('Cannot modify a restaurant you do not own');
  }
  await repo.remove(itemId);
  return { id: itemId, deleted: true };
}
