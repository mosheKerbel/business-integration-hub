import { z } from 'zod';

import {
  ConsumerCommandRefSchema,
  ExternalIdSchema,
  IdempotencyKeySchema,
  QuantitySchema,
} from './common.js';
import { SafeApiErrorSchema } from './errors.js';
import { CurrencyCodeSchema, Iso8601TimestampSchema, MoneySchema, UuidSchema } from './scalars.js';

/** Immutable consumer-approved revision snapshot (B2B / Sales boundary). */
export const ApprovedRevisionSnapshotSchema = z.object({
  revisionId: z.string().min(1).max(256),
  approvedAt: Iso8601TimestampSchema,
});

export type ApprovedRevisionSnapshot = z.infer<typeof ApprovedRevisionSnapshotSchema>;

export const CanonicalOrderLineSchema = z.object({
  productId: UuidSchema,
  quantity: QuantitySchema,
  unitPrice: MoneySchema,
  uomCode: z.string().min(1).max(32).optional(),
});

export type CanonicalOrderLine = z.infer<typeof CanonicalOrderLineSchema>;

export const CanonicalSalesOrderCommandSchema = z
  .object({
    consumerCommandRef: ConsumerCommandRefSchema,
    idempotencyKey: IdempotencyKeySchema,
    customerId: UuidSchema,
    currency: CurrencyCodeSchema,
    lines: z.array(CanonicalOrderLineSchema).min(1),
    approvedRevision: ApprovedRevisionSnapshotSchema,
    customerReference: z.string().max(128).optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    for (const [index, line] of value.lines.entries()) {
      if (line.unitPrice.currency !== value.currency) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'order_line_currency_mismatch',
          path: ['lines', index, 'unitPrice', 'currency'],
        });
      }
    }
  });

export type CanonicalSalesOrderCommand = z.infer<typeof CanonicalSalesOrderCommandSchema>;

export const CanonicalReturnLineSchema = z.object({
  productId: UuidSchema,
  quantity: QuantitySchema,
  unitPrice: MoneySchema,
  uomCode: z.string().min(1).max(32).optional(),
});

export type CanonicalReturnLine = z.infer<typeof CanonicalReturnLineSchema>;

export const CanonicalReturnCommandSchema = z
  .object({
    consumerCommandRef: ConsumerCommandRefSchema,
    idempotencyKey: IdempotencyKeySchema,
    customerId: UuidSchema,
    currency: CurrencyCodeSchema,
    lines: z.array(CanonicalReturnLineSchema).min(1),
    approvedRevision: ApprovedRevisionSnapshotSchema,
    relatedExternalDocumentId: ExternalIdSchema.optional(),
    customerReference: z.string().max(128).optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    for (const [index, line] of value.lines.entries()) {
      if (line.unitPrice.currency !== value.currency) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'return_line_currency_mismatch',
          path: ['lines', index, 'unitPrice', 'currency'],
        });
      }
    }
  });

export type CanonicalReturnCommand = z.infer<typeof CanonicalReturnCommandSchema>;

/** Adapter/provider outcome for createOrder / createReturn (no raw provider payloads). */
export const ExternalDocumentResultSchema = z.object({
  externalDocumentId: ExternalIdSchema.nullable(),
  retryable: z.boolean().nullable(),
  error: SafeApiErrorSchema.nullable().optional(),
});

export type ExternalDocumentResult = z.infer<typeof ExternalDocumentResultSchema>;
