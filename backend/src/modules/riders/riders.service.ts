import AppError from '../../common/errors/AppError';
import * as repo from './riders.repository';
import type { UpdateRiderStatusInput } from './riders.validation';

export async function getMeForUser(userId: string) {
  const rider = await repo.findByUserId(userId);
  if (!rider) throw AppError.notFound('Rider profile not found');
  const user = await repo.findUserSummaryByRiderId(rider.id);
  if (!user) throw AppError.internal('Rider user missing');
  return { rider, user };
}

export async function updateStatus(
  userId: string,
  input: UpdateRiderStatusInput,
) {
  const rider = await repo.findByUserId(userId);
  if (!rider) throw AppError.notFound('Rider profile not found');
  return repo.updateStatus(rider.id, input.status);
}
