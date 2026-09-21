import { z } from 'zod';

import { CanonicalEntityMetadataSchema, InboundEntityBaseSchema, ExternalIdSchema } from './common.js';
import { MoneySchema, UuidSchema } from './scalars.js';

export const CustomerPriceSchema = CanonicalEntityMetadataSchema.extend({
  customerId: UuidSchema,
  productId: UuidSchema,
  finalPrice: MoneySchema,
});

export type CustomerPrice = z.infer<typeof CustomerPriceSchema>;

/** Provider-normalized price row from `pullCustomerPrices`. */
export const CustomerPriceExternalSchema = InboundEntityBaseSchema.extend({
  customerExternalId: ExternalIdSchema,
  productExternalId: ExternalIdSchema,
  finalPrice: MoneySchema,
});

export type CustomerPriceExternal = z.infer<typeof CustomerPriceExternalSchema>;
