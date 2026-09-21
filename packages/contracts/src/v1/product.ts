import { z } from 'zod';

import {
  CanonicalEntityMetadataSchema,
  ExternalIdSchema,
  InboundEntityBaseSchema,
  QuantitySchema,
} from './common.js';

export const ProductUomSchema = z.object({
  externalId: ExternalIdSchema,
  code: z.string().min(1).max(32),
  description: z.string().max(256).optional(),
  conversionFactor: QuantitySchema.optional(),
  isBase: z.boolean(),
});

export type ProductUom = z.infer<typeof ProductUomSchema>;

export const ProductSchema = CanonicalEntityMetadataSchema.extend({
  sku: z.string().min(1).max(128),
  name: z.string().min(1).max(256),
  isActive: z.boolean(),
  uoms: z.array(ProductUomSchema).default([]),
});

export type Product = z.infer<typeof ProductSchema>;

/** Provider-normalized product row from `pullProducts`. */
export const ProductExternalSchema = InboundEntityBaseSchema.extend({
  sku: z.string().min(1).max(128),
  name: z.string().min(1).max(256),
  isActive: z.boolean(),
  uoms: z.array(ProductUomSchema).default([]),
});

export type ProductExternal = z.infer<typeof ProductExternalSchema>;
