import { z } from 'zod';

import {
  CanonicalEntityMetadataSchema,
  ExternalIdSchema,
  InboundEntityBaseSchema,
  QuantitySchema,
} from './common.js';
import { Iso8601TimestampSchema, MoneySchema, UuidSchema } from './scalars.js';

export const ExternalSalesDocumentLineSchema = z
  .object({
    externalId: ExternalIdSchema,
    productId: UuidSchema.optional(),
    productExternalId: ExternalIdSchema.optional(),
    description: z.string().max(512).optional(),
    quantity: QuantitySchema,
    unitPrice: MoneySchema,
    lineTotal: MoneySchema,
  })
  .superRefine((line, ctx) => {
    if (!line.productId && !line.productExternalId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'sales_document_line_product_ref_required',
        path: ['productId'],
      });
    }
  });

export type ExternalSalesDocumentLine = z.infer<typeof ExternalSalesDocumentLineSchema>;

export const ExternalSalesDocumentSchema = CanonicalEntityMetadataSchema.extend({
  customerId: UuidSchema,
  documentNumber: z.string().min(1).max(128),
  documentDate: Iso8601TimestampSchema,
  totalAmount: MoneySchema,
  lines: z.array(ExternalSalesDocumentLineSchema).min(1),
});

export type ExternalSalesDocument = z.infer<typeof ExternalSalesDocumentSchema>;

/** Provider-normalized history document from `pullSalesDocuments`. */
export const SalesDocumentExternalSchema = InboundEntityBaseSchema.extend({
  customerExternalId: ExternalIdSchema,
  documentNumber: z.string().min(1).max(128),
  documentDate: Iso8601TimestampSchema,
  totalAmount: MoneySchema,
  lines: z
    .array(
      z.object({
        externalId: ExternalIdSchema,
        productExternalId: ExternalIdSchema,
        description: z.string().max(512).optional(),
        quantity: QuantitySchema,
        unitPrice: MoneySchema,
        lineTotal: MoneySchema,
      }),
    )
    .min(1),
});

export type SalesDocumentExternal = z.infer<typeof SalesDocumentExternalSchema>;
