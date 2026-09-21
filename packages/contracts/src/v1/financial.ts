import { z } from 'zod';

import {
  CanonicalEntityMetadataSchema,
  ExternalIdSchema,
  InboundEntityBaseSchema,
} from './common.js';
import { CurrencyCodeSchema, Iso8601TimestampSchema, MoneySchema, UuidSchema } from './scalars.js';

function moneyMatchesSnapshotCurrency(
  money: { currency: string } | undefined,
  currency: string,
): boolean {
  return money === undefined || money.currency === currency;
}

export const CustomerFinancialSnapshotSchema = CanonicalEntityMetadataSchema.extend({
  customerId: UuidSchema,
  currency: CurrencyCodeSchema,
  balance: MoneySchema.optional(),
  creditLimit: MoneySchema.optional(),
}).superRefine((value, ctx) => {
  if (!moneyMatchesSnapshotCurrency(value.balance, value.currency)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'financial_snapshot_currency_mismatch',
      path: ['balance', 'currency'],
    });
  }
  if (!moneyMatchesSnapshotCurrency(value.creditLimit, value.currency)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'financial_snapshot_currency_mismatch',
      path: ['creditLimit', 'currency'],
    });
  }
});

export type CustomerFinancialSnapshot = z.infer<typeof CustomerFinancialSnapshotSchema>;

export const CustomerFinancialSnapshotExternalSchema = InboundEntityBaseSchema.extend({
  customerExternalId: ExternalIdSchema,
  currency: CurrencyCodeSchema,
  balance: MoneySchema.optional(),
  creditLimit: MoneySchema.optional(),
});

export type CustomerFinancialSnapshotExternal = z.infer<
  typeof CustomerFinancialSnapshotExternalSchema
>;

export const OpenFinancialDocumentSchema = CanonicalEntityMetadataSchema.extend({
  customerId: UuidSchema,
  documentType: z.string().min(1).max(64),
  documentNumber: z.string().min(1).max(128),
  issueDate: Iso8601TimestampSchema,
  dueDate: Iso8601TimestampSchema.nullable().optional(),
  openAmount: MoneySchema,
});

export type OpenFinancialDocument = z.infer<typeof OpenFinancialDocumentSchema>;

export const OpenFinancialDocumentExternalSchema = InboundEntityBaseSchema.extend({
  customerExternalId: ExternalIdSchema,
  documentType: z.string().min(1).max(64),
  documentNumber: z.string().min(1).max(128),
  issueDate: Iso8601TimestampSchema,
  dueDate: Iso8601TimestampSchema.nullable().optional(),
  openAmount: MoneySchema,
});

export type OpenFinancialDocumentExternal = z.infer<typeof OpenFinancialDocumentExternalSchema>;

/** Union tag for `pullFinancials` pages. */
export const FinancialExternalSchema = z.discriminatedUnion('kind', [
  CustomerFinancialSnapshotExternalSchema.extend({ kind: z.literal('snapshot') }),
  OpenFinancialDocumentExternalSchema.extend({ kind: z.literal('open_document') }),
]);

export type FinancialExternal = z.infer<typeof FinancialExternalSchema>;
