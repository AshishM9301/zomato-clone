import AppError from '../../common/errors/AppError';
import * as repo from './restaurants.repository';
import type {
  CreateRestaurantInput,
  ListRestaurantsQuery,
  UpdateRestaurantInput,
} from './restaurants.validation';

export async function list(query: ListRestaurantsQuery) {
  const near = query.near
    ? (() => {
        const [latStr, lngStr] = query.near!.split(',');
        return { lat: Number(latStr), lng: Number(lngStr) };
      })()
    : undefined;
  return repo.list({
    q: query.q,
    near,
    includeClosed: query.include_closed ?? false,
    limit: query.limit,
    offset: (query.page - 1) * query.limit,
  });
}

export async function getById(id: string) {
  const r = await repo.findById(id);
  if (!r) throw AppError.notFound('Restaurant not found');
  return r;
}

export async function create(input: CreateRestaurantInput) {
  const { restaurant } = await repo.createWithMerchant({
    restaurant: {
      name: input.name,
      address: input.address,
      lat: input.lat,
      lng: input.lng,
    },
    merchant: {
      email: input.merchant_email,
      password: input.merchant_password,
      business_name: input.business_name,
    },
  });
  return restaurant;
}

export async function update(
  id: string,
  patch: UpdateRestaurantInput,
  actor: { role: string; merchantId?: string },
) {
  const existing = await repo.findById(id);
  if (!existing) throw AppError.notFound('Restaurant not found');

  if (actor.role === 'merchant') {
    if (!actor.merchantId || existing.merchant_id !== actor.merchantId) {
      throw AppError.forbidden('Cannot modify a restaurant you do not own');
    }
  }

  return repo.update(id, patch);
}
