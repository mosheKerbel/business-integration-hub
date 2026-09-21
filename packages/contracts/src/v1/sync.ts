import { z } from 'zod';

import { CustomerAssortmentExternalSchema } from './customer-assortment.js';
import { CustomerPriceExternalSchema } from './customer-price.js';
import { CustomerExternalSchema } from './customer.js';
import { FinancialExternalSchema } from './financial.js';
import { PaginationMetaSchema } from './pagination.js';
import { ProductExternalSchema } from './product.js';
import { SalesDocumentExternalSchema } from './sales-document.js';
import { CursorSchema, Iso8601TimestampSchema, UuidSchema } from './scalars.js';

export const PriceSyncInputSchema = z.object({
  customerId: UuidSchema.optional(),
});

export type PriceSyncInput = z.infer<typeof PriceSyncInputSchema>;

export const AssortmentSyncInputSchema = z.object({
  customerId: UuidSchema.optional(),
});

export type AssortmentSyncInput = z.infer<typeof AssortmentSyncInputSchema>;

export const FinancialSyncInputSchema = z.object({
  customerId: UuidSchema.optional(),
});

export type FinancialSyncInput = z.infer<typeof FinancialSyncInputSchema>;

export const HistorySyncInputSchema = z.object({
  customerId: UuidSchema.optional(),
  updatedAfter: Iso8601TimestampSchema.optional(),
});

export type HistorySyncInput = z.infer<typeof HistorySyncInputSchema>;

export function createSyncPageSchema<T extends z.ZodTypeAny>(itemSchema: T) {
  return z.object({
    items: z.array(itemSchema),
    pagination: PaginationMetaSchema,
    highWaterMark: CursorSchema.nullable().optional(),
  });
}

export type SyncPage<T> = {
  items: T[];
  pagination: z.infer<typeof PaginationMetaSchema>;
  highWaterMark?: string | null;
};

export const CustomerExternalSyncPageSchema = createSyncPageSchema(CustomerExternalSchema);
export const ProductExternalSyncPageSchema = createSyncPageSchema(ProductExternalSchema);
export const CustomerPriceExternalSyncPageSchema = createSyncPageSchema(CustomerPriceExternalSchema);
export const CustomerAssortmentExternalSyncPageSchema = createSyncPageSchema(
  CustomerAssortmentExternalSchema,
);
export const FinancialExternalSyncPageSchema = createSyncPageSchema(FinancialExternalSchema);
export const SalesDocumentExternalSyncPageSchema = createSyncPageSchema(SalesDocumentExternalSchema);
