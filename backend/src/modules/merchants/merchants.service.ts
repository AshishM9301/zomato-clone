import AppError from '../../common/errors/AppError';
import * as repo from './merchants.repository';
import type { UpdateMerchantInput } from './merchants.validation';

export async function getMeForUser(userId: string) {
  const merchant = await repo.findByUserId(userId);
  if (!merchant) throw AppError.notFound('Merchant profile not found');
  const user = await repo.findUserSummaryByMerchantId(merchant.id);
  if (!user) throw AppError.internal('Merchant user missing');
  const restaurants = await repo.listRestaurantsForMerchant(merchant.id);
  return { merchant, user, restaurants };
}

export async function getPublicById(id: string) {
  const merchant = await repo.findById(id);
  if (!merchant) throw AppError.notFound('Merchant not found');
  const user = await repo.findUserSummaryByMerchantId(merchant.id);
  const restaurants = await repo.listRestaurantsForMerchant(merchant.id);
  return { merchant, user, restaurants };
}

export async function updateMe(
  userId: string,
  input: UpdateMerchantInput,
) {
  const merchant = await repo.findByUserId(userId);
  if (!merchant) throw AppError.notFound('Merchant profile not found');
  if (merchant.status === 'disabled') {
    throw AppError.forbidden('Merchant is disabled');
  }
  if (input.business_name !== undefined) {
    return repo.updateBusinessName(merchant.id, input.business_name);
  }
  return merchant;
}
