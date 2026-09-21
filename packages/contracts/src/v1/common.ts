import { z } from 'zod';

import { CanonicalVersionSchema, Iso8601TimestampSchema, UuidSchema } from './scalars.js';

function containsAsciiControlCharacter(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code <= 0x1f || code === 0x7f) {
      return true;
    }
  }
  return false;
}

/** Provider-scoped stable identifier within a connection. */
export const EXTERNAL_ID_MAX_LENGTH = 512;

export const ExternalIdSchema = z
  .string()
  .min(1, { message: 'invalid_external_id' })
  .max(EXTERNAL_ID_MAX_LENGTH, { message: 'invalid_external_id' })
  .refine((value) => !containsAsciiControlCharacter(value), { message: 'invalid_external_id' });

export type ExternalId = z.infer<typeof ExternalIdSchema>;

export const COMMAND_REF_MAX_LENGTH = 256;

export const ConsumerCommandRefSchema = z
  .string()
  .min(1, { message: 'invalid_consumer_command_ref' })
  .max(COMMAND_REF_MAX_LENGTH, { message: 'invalid_consumer_command_ref' })
  .refine((value) => !containsAsciiControlCharacter(value), { message: 'invalid_consumer_command_ref' });

export type ConsumerCommandRef = z.infer<typeof ConsumerCommandRefSchema>;

export const IdempotencyKeySchema = z
  .string()
  .min(1, { message: 'invalid_idempotency_key' })
  .max(COMMAND_REF_MAX_LENGTH, { message: 'invalid_idempotency_key' })
  .refine((value) => !containsAsciiControlCharacter(value), { message: 'invalid_idempotency_key' });

export type IdempotencyKey = z.infer<typeof IdempotencyKeySchema>;

/** Positive decimal quantity (no floating point). */
export const QUANTITY_MAX_INTEGER_DIGITS = 14;
export const QUANTITY_MAX_FRACTION_DIGITS = 6;

const QUANTITY_PATTERN = new RegExp(
  `^\\d{1,${QUANTITY_MAX_INTEGER_DIGITS}}(\\.\\d{1,${QUANTITY_MAX_FRACTION_DIGITS}})?$`,
);

export const QuantitySchema = z
  .string()
  .refine((value) => QUANTITY_PATTERN.test(value) && Number(value) > 0, { message: 'invalid_quantity' });

export type Quantity = z.infer<typeof QuantitySchema>;

/**
 * Freshness and identity fields shared by persisted canonical entities.
 * Matches Technical Spec §4 canonical row metadata.
 */
export const CanonicalEntityMetadataSchema = z.object({
  id: UuidSchema,
  organizationId: UuidSchema,
  sourceConnectionId: UuidSchema,
  externalId: ExternalIdSchema,
  sourceUpdatedAt: Iso8601TimestampSchema.nullable(),
  hubVersion: CanonicalVersionSchema,
  lastSyncedAt: Iso8601TimestampSchema,
  payloadHash: z
    .string()
    .max(128, { message: 'invalid_payload_hash' })
    .nullable()
    .optional(),
});

export type CanonicalEntityMetadata = z.infer<typeof CanonicalEntityMetadataSchema>;

/** Adapter-normalized inbound record before Hub assigns canonical `id`. */
export const InboundEntityBaseSchema = z.object({
  organizationId: UuidSchema,
  sourceConnectionId: UuidSchema,
  externalId: ExternalIdSchema,
  sourceUpdatedAt: Iso8601TimestampSchema.nullable(),
});

export type InboundEntityBase = z.infer<typeof InboundEntityBaseSchema>;
