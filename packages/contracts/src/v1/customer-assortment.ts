import { z } from 'zod';

import {
  CanonicalEntityMetadataSchema,
  ExternalIdSchema,
  InboundEntityBaseSchema,
} from './common.js';
import { UuidSchema } from './scalars.js';

/**
 * Explicit Customer-to-Product membership (מגוון). Independent from CustomerPrice.
 */
export const CustomerAssortmentSchema = CanonicalEntityMetadataSchema.extend({
  customerId: UuidSchema,
  productId: UuidSchema,
  isActive: z.boolean(),
});

export type CustomerAssortment = z.infer<typeof CustomerAssortmentSchema>;

/** Provider-normalized assortment relation from `pullCustomerAssortments`. */
export const CustomerAssortmentExternalSchema = InboundEntityBaseSchema.extend({
  customerExternalId: ExternalIdSchema,
  productExternalId: ExternalIdSchema,
  isActive: z.boolean(),
});

export type CustomerAssortmentExternal = z.infer<typeof CustomerAssortmentExternalSchema>;
