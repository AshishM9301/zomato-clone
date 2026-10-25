import { z } from 'zod';
import AppError from '../errors/AppError';

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export interface Pagination {
  page: number;
  limit: number;
  offset: number;
}

/** Parse `?page=&limit=` from a request query, returning safe pagination. */
export function parsePagination(query: unknown): Pagination {
  const parsed = paginationSchema.safeParse(query);
  if (!parsed.success) {
    throw AppError.badRequest('Invalid pagination params', parsed.error.issues);
  }
  const { page, limit } = parsed.data;
  return { page, limit, offset: (page - 1) * limit };
}
