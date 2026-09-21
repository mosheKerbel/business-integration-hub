import { z } from 'zod';

import { CursorSchema } from './scalars.js';

/** Default list page size for Hub list/change endpoints. */
export const PAGINATION_DEFAULT_LIMIT = 100;

/** Hard upper bound (see Technical Spec change-feed example `limit=500`). */
export const PAGINATION_MAX_LIMIT = 500;

export const PAGINATION_MIN_LIMIT = 1;

export const PageLimitSchema = z
  .number()
  .int({ message: 'invalid_page_limit' })
  .min(PAGINATION_MIN_LIMIT, { message: 'invalid_page_limit' })
  .max(PAGINATION_MAX_LIMIT, { message: 'invalid_page_limit' });

export type PageLimit = z.infer<typeof PageLimitSchema>;

/**
 * Query-style pagination input (`after` cursor + bounded `limit`).
 * Coerces string query params where applicable.
 */
export const PaginationRequestSchema = z.object({
  after: CursorSchema.optional(),
  limit: z
    .union([z.number(), z.string()])
    .optional()
    .transform((value, ctx) => {
      if (value === undefined) {
        return PAGINATION_DEFAULT_LIMIT;
      }
      const asNumber = typeof value === 'number' ? value : Number(value);
      if (!Number.isFinite(asNumber)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'invalid_page_limit' });
        return z.NEVER;
      }
      return asNumber;
    })
    .pipe(PageLimitSchema),
});

export type PaginationRequest = z.infer<typeof PaginationRequestSchema>;

export const PaginationMetaSchema = z.object({
  limit: PageLimitSchema,
  hasMore: z.boolean(),
  nextCursor: CursorSchema.nullable(),
});

export type PaginationMeta = z.infer<typeof PaginationMetaSchema>;
