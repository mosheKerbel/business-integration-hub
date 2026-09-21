import { z } from 'zod';

function containsAsciiControlCharacter(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code <= 0x1f || code === 0x7f) {
      return true;
    }
  }
  return false;
}

/** RFC 4122 UUID (any hex case). */
export const UuidSchema = z.string().uuid({ message: 'invalid_uuid' });

export type Uuid = z.infer<typeof UuidSchema>;

/** ISO-8601 instant with offset or `Z` (Hub timestamps). */
export const Iso8601TimestampSchema = z.string().datetime({ offset: true, message: 'invalid_timestamp' });

export type Iso8601Timestamp = z.infer<typeof Iso8601TimestampSchema>;

/**
 * Opaque consumer/sync cursor. Non-empty, bounded length, no control characters.
 */
export const CURSOR_MIN_LENGTH = 1;
export const CURSOR_MAX_LENGTH = 4096;

export const CursorSchema = z
  .string()
  .min(CURSOR_MIN_LENGTH, { message: 'invalid_cursor' })
  .max(CURSOR_MAX_LENGTH, { message: 'invalid_cursor' })
  .refine((value) => !containsAsciiControlCharacter(value), { message: 'invalid_cursor' });

export type Cursor = z.infer<typeof CursorSchema>;

/** Monotonic canonical entity version (`hub_version` / `canonical_version`). JSON-safe integer string. */
export const CanonicalVersionSchema = z
  .string()
  .regex(/^\d+$/, { message: 'invalid_canonical_version' })
  .refine((value) => {
    try {
      const asBig = BigInt(value);
      return asBig >= 0n;
    } catch {
      return false;
    }
  }, { message: 'invalid_canonical_version' });

export type CanonicalVersion = z.infer<typeof CanonicalVersionSchema>;

/** ISO 4217 alphabetic currency code. */
export const CurrencyCodeSchema = z
  .string()
  .length(3, { message: 'invalid_currency_code' })
  .regex(/^[A-Z]{3}$/, { message: 'invalid_currency_code' });

export type CurrencyCode = z.infer<typeof CurrencyCodeSchema>;

/** `numeric(18,4)` — decimal string, no floating point. */
export const MONEY_MAX_INTEGER_DIGITS = 14;
export const MONEY_MAX_FRACTION_DIGITS = 4;

const MONEY_AMOUNT_PATTERN = new RegExp(
  `^\\d{1,${MONEY_MAX_INTEGER_DIGITS}}(\\.\\d{1,${MONEY_MAX_FRACTION_DIGITS}})?$`,
);

export function isValidMoneyAmount(amount: string): boolean {
  return MONEY_AMOUNT_PATTERN.test(amount);
}

export const MoneyAmountSchema = z
  .string()
  .refine(isValidMoneyAmount, { message: 'invalid_money_amount' });

export type MoneyAmount = z.infer<typeof MoneyAmountSchema>;

export const MoneySchema = z.object({
  amount: MoneyAmountSchema,
  currency: CurrencyCodeSchema,
});

export type Money = z.infer<typeof MoneySchema>;

/** Request or correlation identifier (UUID or opaque trace id). */
export const REQUEST_ID_MIN_LENGTH = 1;
export const REQUEST_ID_MAX_LENGTH = 128;

export const RequestIdSchema = z
  .string()
  .min(REQUEST_ID_MIN_LENGTH, { message: 'invalid_request_id' })
  .max(REQUEST_ID_MAX_LENGTH, { message: 'invalid_request_id' })
  .refine((value) => !containsAsciiControlCharacter(value), { message: 'invalid_request_id' });

export type RequestId = z.infer<typeof RequestIdSchema>;

export const CorrelationIdSchema = RequestIdSchema;
export type CorrelationId = RequestId;

/** Serialize money for JSON without precision loss. */
export function serializeMoney(money: Money): Money {
  const parsed = MoneySchema.parse(money);
  return {
    amount: normalizeMoneyAmount(parsed.amount),
    currency: parsed.currency,
  };
}

/** Normalize a validated decimal amount (strip redundant leading zeros). */
export function normalizeMoneyAmount(amount: string): string {
  const validated = MoneyAmountSchema.parse(amount);
  const [wholePart = '0', fraction] = validated.split('.');
  const normalizedWhole = wholePart.replace(/^0+/, '') || '0';
  if (fraction === undefined) {
    return normalizedWhole;
  }
  const trimmedFraction = fraction.replace(/0+$/, '');
  return trimmedFraction.length > 0 ? `${normalizedWhole}.${trimmedFraction}` : normalizedWhole;
}
