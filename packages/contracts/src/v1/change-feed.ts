import { z } from 'zod';

import { CanonicalVersionSchema, CursorSchema, Iso8601TimestampSchema, UuidSchema } from './scalars.js';
import { PaginationMetaSchema } from './pagination.js';

export const ChangeFeedEntityTypeSchema = z.enum([
  'customer',
  'product',
  'customer_assortment',
  'customer_price',
  'customer_financial_snapshot',
  'open_financial_document',
  'external_sales_document',
]);

export type ChangeFeedEntityType = z.infer<typeof ChangeFeedEntityTypeSchema>;

export const ChangeFeedOperationSchema = z.enum(['upsert', 'deactivate', 'delete']);

export type ChangeFeedOperation = z.infer<typeof ChangeFeedOperationSchema>;

/**
 * One committed change visible to consumers (PRD §6 / Technical Spec §8).
 */
export const ChangeFeedItemSchema = z.object({
  cursor: CursorSchema,
  organizationId: UuidSchema,
  entityType: ChangeFeedEntityTypeSchema,
  entityId: UuidSchema,
  operation: ChangeFeedOperationSchema,
  canonicalVersion: CanonicalVersionSchema,
  sourceUpdatedAt: Iso8601TimestampSchema.nullable(),
  committedAt: Iso8601TimestampSchema,
});

export type ChangeFeedItem = z.infer<typeof ChangeFeedItemSchema>;

export const ChangeFeedPageSchema = z.object({
  items: z.array(ChangeFeedItemSchema),
  pagination: PaginationMetaSchema,
});

export type ChangeFeedPage = z.infer<typeof ChangeFeedPageSchema>;
