import { describe, expect, it } from 'vitest';

import { v1 } from '@bih/contracts';
import * as v1Direct from '@bih/contracts/v1';

describe('@bih/contracts v1', () => {
  it('exposes a stable v1 namespace from the package root and /v1 entry', () => {
    expect(v1.CONTRACT_API_VERSION).toBe('v1');
    expect(v1Direct.CONTRACT_API_VERSION).toBe('v1');
    expect(v1.UuidSchema).toBe(v1Direct.UuidSchema);
  });

  describe('UuidSchema', () => {
    it('accepts valid UUIDs', () => {
      expect(v1.UuidSchema.safeParse('550e8400-e29b-41d4-a716-446655440000').success).toBe(true);
    });

    it('rejects invalid UUIDs', () => {
      expect(v1.UuidSchema.safeParse('not-a-uuid').success).toBe(false);
      expect(v1.UuidSchema.safeParse('').success).toBe(false);
    });
  });

  describe('Iso8601TimestampSchema', () => {
    it('accepts offset and Z timestamps', () => {
      expect(v1.Iso8601TimestampSchema.safeParse('2026-03-21T10:15:30Z').success).toBe(true);
      expect(v1.Iso8601TimestampSchema.safeParse('2026-03-21T10:15:30+03:00').success).toBe(true);
    });

    it('rejects invalid timestamps', () => {
      expect(v1.Iso8601TimestampSchema.safeParse('2026-03-21').success).toBe(false);
      expect(v1.Iso8601TimestampSchema.safeParse('not-a-date').success).toBe(false);
    });
  });

  describe('CursorSchema', () => {
    it('accepts opaque cursors', () => {
      expect(v1.CursorSchema.safeParse('seq:42:abc').success).toBe(true);
    });

    it('rejects empty, overlong, or control-character cursors', () => {
      expect(v1.CursorSchema.safeParse('').success).toBe(false);
      expect(v1.CursorSchema.safeParse('a'.repeat(v1.CURSOR_MAX_LENGTH + 1)).success).toBe(false);
      expect(v1.CursorSchema.safeParse('bad\u0001cursor').success).toBe(false);
    });
  });

  describe('CurrencyCodeSchema', () => {
    it('accepts ISO 4217 codes', () => {
      expect(v1.CurrencyCodeSchema.safeParse('USD').success).toBe(true);
      expect(v1.CurrencyCodeSchema.safeParse('ILS').success).toBe(true);
    });

    it('rejects invalid currency codes', () => {
      expect(v1.CurrencyCodeSchema.safeParse('usd').success).toBe(false);
      expect(v1.CurrencyCodeSchema.safeParse('US').success).toBe(false);
    });
  });

  describe('CanonicalVersionSchema', () => {
    it('accepts non-negative integer strings', () => {
      expect(v1.CanonicalVersionSchema.safeParse('0').success).toBe(true);
      expect(v1.CanonicalVersionSchema.safeParse('18446744073709551615').success).toBe(true);
    });

    it('rejects invalid versions', () => {
      expect(v1.CanonicalVersionSchema.safeParse('-1').success).toBe(false);
      expect(v1.CanonicalVersionSchema.safeParse('1.5').success).toBe(false);
    });
  });

  describe('money serialization', () => {
    it('validates and normalizes decimal-safe amounts', () => {
      expect(v1.MoneySchema.safeParse({ amount: '12.3400', currency: 'USD' }).success).toBe(true);
      expect(v1.serializeMoney({ amount: '12.3400', currency: 'USD' })).toEqual({
        amount: '12.34',
        currency: 'USD',
      });
    });

    it('rejects float-style invalid amounts', () => {
      expect(v1.MoneyAmountSchema.safeParse('12.34567').success).toBe(false);
      expect(v1.MoneyAmountSchema.safeParse('not-a-number').success).toBe(false);
    });
  });

  describe('PaginationRequestSchema', () => {
    it('applies default limit and bounds', () => {
      expect(v1.PaginationRequestSchema.parse({})).toEqual({ limit: v1.PAGINATION_DEFAULT_LIMIT });
      expect(v1.PaginationRequestSchema.parse({ limit: '250' })).toEqual({ limit: 250 });
    });

    it('rejects unbounded or malformed limits', () => {
      expect(v1.PaginationRequestSchema.safeParse({ limit: 0 }).success).toBe(false);
      expect(v1.PaginationRequestSchema.safeParse({ limit: 501 }).success).toBe(false);
      expect(v1.PaginationRequestSchema.safeParse({ limit: 'many' }).success).toBe(false);
    });
  });

  describe('safe API errors', () => {
    it('serializes contract-shaped errors', () => {
      const error = v1.toSafeApiError({
        code: 'VALIDATION_FAILED',
        message: 'Invalid request',
        requestId: 'req-123',
      });
      expect(v1.SafeApiErrorSchema.safeParse(error).success).toBe(true);
    });

    it('strips credentials, provider payloads, and stack traces from details', () => {
      const error = v1.toSafeApiError({
        code: 'PROVIDER_ERROR',
        message: 'Upstream failure',
        details: {
          field: 'customerId',
          password: 'secret',
          apiKey: 'key',
          providerPayload: { raw: true },
          stack: 'Error: boom\n    at foo',
          nested: { token: 'x', safeNote: 'ok' },
        },
      });

      expect(error.details).toEqual({
        field: 'customerId',
        nested: { safeNote: 'ok' },
      });
      expect(JSON.stringify(error)).not.toMatch(/secret|apiKey|providerPayload|stack/i);
    });

    it('re-sanitizes on serializeSafeApiError', () => {
      const leaked = v1.serializeSafeApiError({
        code: 'INTERNAL_ERROR',
        message: 'Failed',
        details: { authorization: 'Bearer x', count: 1 },
      });
      expect(leaked.details).toEqual({ count: 1 });
    });

    it('accepts primitive, null, and array details aligned with sanitizeErrorDetails', () => {
      const stringDetails = v1.toSafeApiError({
        code: 'VALIDATION_FAILED',
        message: 'Hint',
        details: 'field is required',
      });
      expect(stringDetails.details).toBe('field is required');
      expect(v1.SafeApiErrorSchema.safeParse(stringDetails).success).toBe(true);

      const nullDetails = v1.toSafeApiError({
        code: 'VALIDATION_FAILED',
        message: 'Empty',
        details: null,
      });
      expect(nullDetails.details).toBe(null);
      expect(v1.SafeApiErrorSchema.safeParse(nullDetails).success).toBe(true);

      const arrayDetails = v1.toSafeApiError({
        code: 'VALIDATION_FAILED',
        message: 'List',
        details: ['first', { code: 'REQUIRED' }],
      });
      expect(arrayDetails.details).toEqual(['first', { code: 'REQUIRED' }]);
      expect(v1.SafeApiErrorSchema.safeParse(arrayDetails).success).toBe(true);
    });

    it('rejects forbidden keys and unsupported values in SafeApiErrorSchema.safeParse', () => {
      expect(
        v1.SafeApiErrorSchema.safeParse({
          code: 'VALIDATION_FAILED',
          message: 'Bad',
          details: { password: 'secret' },
        }).success,
      ).toBe(false);

      expect(
        v1.SafeApiErrorSchema.safeParse({
          code: 'VALIDATION_FAILED',
          message: 'Bad',
          details: { field: () => undefined },
        }).success,
      ).toBe(false);

      expect(
        v1.SafeApiErrorSchema.safeParse({
          code: 'VALIDATION_FAILED',
          message: 'Bad',
          details: { field: 'customerId', nested: { safeNote: 'ok' } },
        }).success,
      ).toBe(true);
    });
  });
});
