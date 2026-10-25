import * as repo from './notifications.repository';
import type {
  ListNotificationsQuery,
  TestNotificationInput,
} from './notifications.validation';

export async function listForUser(userId: string, query: ListNotificationsQuery) {
  const items = await repo.listForUser(userId, {
    unreadOnly: query.unread_only ?? false,
    limit: query.limit,
    offset: (query.page - 1) * query.limit,
  });
  return { items, page: query.page, limit: query.limit };
}

export async function createTest(
  userId: string,
  input: TestNotificationInput,
) {
  return repo.insert(userId, 'test', input.payload ?? {});
}

export async function markAllRead(userId: string) {
  const n = await repo.markAllRead(userId);
  return { updated: n };
}
