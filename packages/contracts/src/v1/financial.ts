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

/** Shared snapshot money fields (canonical and adapter pulls). */
export const CustomerFinancialSnapshotMoneyFieldsSchema = z.object({
  currency: CurrencyCodeSchema,
  balance: MoneySchema.optional(),
  creditLimit: MoneySchema.optional(),
});

export type CustomerFinancialSnapshotMoneyFields = z.infer<
  typeof CustomerFinancialSnapshotMoneyFieldsSchema
>;

export function refineSnapshotCurrency(
  value: CustomerFinancialSnapshotMoneyFields,
  ctx: z.RefinementCtx,
): void {
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
}

const CustomerFinancialSnapshotExternalBaseSchema = InboundEntityBaseSchema.extend({
  customerExternalId: ExternalIdSchema,
}).merge(CustomerFinancialSnapshotMoneyFieldsSchema);

export const CustomerFinancialSnapshotSchema = CanonicalEntityMetadataSchema.extend({
  customerId: UuidSchema,
})
  .merge(CustomerFinancialSnapshotMoneyFieldsSchema)
  .superRefine(refineSnapshotCurrency);

export type CustomerFinancialSnapshot = z.infer<typeof CustomerFinancialSnapshotSchema>;

export const CustomerFinancialSnapshotExternalSchema =
  CustomerFinancialSnapshotExternalBaseSchema.superRefine(refineSnapshotCurrency);

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

const CustomerFinancialSnapshotExternalSnapshotBranchSchema =
  CustomerFinancialSnapshotExternalBaseSchema.extend({
    kind: z.literal('snapshot'),
  });

const OpenFinancialDocumentExternalBranchSchema = OpenFinancialDocumentExternalSchema.extend({
  kind: z.literal('open_document'),
});

/** Union tag for `pullFinancials` pages. */
export const FinancialExternalSchema = z
  .discriminatedUnion('kind', [
    CustomerFinancialSnapshotExternalSnapshotBranchSchema,
    OpenFinancialDocumentExternalBranchSchema,
  ])
  .superRefine((value, ctx) => {
    if (value.kind === 'snapshot') {
      refineSnapshotCurrency(value, ctx);
    }
  });

export type FinancialExternal = z.infer<typeof FinancialExternalSchema>;
