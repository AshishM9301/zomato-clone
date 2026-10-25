import AppError from '../../common/errors/AppError';
import * as repo from './users.repository';
import type { UpdateMeInput } from './users.validation';

export async function getMe(userId: string) {
  const user = await repo.findById(userId);
  if (!user) throw AppError.notFound('User not found');
  return user;
}

export async function updateMe(userId: string, input: UpdateMeInput) {
  if (input.name === undefined) {
    // Nothing to update — return current state.
    return getMe(userId);
  }
  const updated = await repo.updateName(userId, input.name);
  return updated;
}
