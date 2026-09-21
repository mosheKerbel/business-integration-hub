import { z } from 'zod';

import { CorrelationIdSchema, RequestIdSchema } from './scalars.js';

/** Machine-readable Hub error code (SCREAMING_SNAKE). */
export const ErrorCodeSchema = z
  .string()
  .min(1, { message: 'invalid_error_code' })
  .max(64, { message: 'invalid_error_code' })
  .regex(/^[A-Z][A-Z0-9_]*$/, { message: 'invalid_error_code' });

export type ErrorCode = z.infer<typeof ErrorCodeSchema>;

export type SafeDetailValue =
  | string
  | number
  | boolean
  | null
  | SafeDetailValue[]
  | { [key: string]: SafeDetailValue };

const FORBIDDEN_DETAIL_KEY = /^(?:.*(?:password|secret|token|credential|authorization|api[_-]?key)|stack(?:trace)?|raw(?:response|payload)?|provider(?:payload|response)?)$/i;

const MAX_SAFE_DETAIL_DEPTH = 4;
const MAX_SAFE_DETAIL_KEYS = 32;
const MAX_SAFE_STRING_LENGTH = 500;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Recursively strip unsafe keys and non-JSON-safe values from error details.
 * Never pass provider raw payloads or secrets through this boundary.
 */
export function sanitizeErrorDetails(value: unknown, depth = 0): SafeDetailValue | undefined {
  if (depth > MAX_SAFE_DETAIL_DEPTH) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (typeof value === 'string') {
    return value.length > MAX_SAFE_STRING_LENGTH ? value.slice(0, MAX_SAFE_STRING_LENGTH) : value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  if (Array.isArray(value)) {
    const items = value
      .slice(0, MAX_SAFE_DETAIL_KEYS)
      .map((item) => sanitizeErrorDetails(item, depth + 1))
      .filter((item): item is SafeDetailValue => item !== undefined);
    return items;
  }

  if (!isPlainObject(value)) {
    return undefined;
  }

  const result: Record<string, SafeDetailValue> = {};
  let keyCount = 0;

  for (const [key, nested] of Object.entries(value)) {
    if (FORBIDDEN_DETAIL_KEY.test(key)) {
      continue;
    }
    if (keyCount >= MAX_SAFE_DETAIL_KEYS) {
      break;
    }
    const sanitized = sanitizeErrorDetails(nested, depth + 1);
    if (sanitized !== undefined) {
      result[key] = sanitized;
      keyCount += 1;
    }
  }

  return Object.keys(result).length > 0 ? result : undefined;
}

function isForbiddenDetailKey(key: string): boolean {
  return FORBIDDEN_DETAIL_KEY.test(key);
}

function validateSafeDetailValue(value: unknown, depth: number): boolean {
  if (depth > MAX_SAFE_DETAIL_DEPTH) {
    return false;
  }

  if (value === null) {
    return true;
  }

  if (typeof value === 'string') {
    return value.length <= MAX_SAFE_STRING_LENGTH;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return true;
  }

  if (Array.isArray(value)) {
    if (value.length > MAX_SAFE_DETAIL_KEYS) {
      return false;
    }
    return value.every((item) => validateSafeDetailValue(item, depth + 1));
  }

  if (!isPlainObject(value)) {
    return false;
  }

  const entries = Object.entries(value);
  if (entries.length > MAX_SAFE_DETAIL_KEYS) {
    return false;
  }

  return entries.every(([key, nested]) => {
    if (isForbiddenDetailKey(key)) {
      return false;
    }
    return validateSafeDetailValue(nested, depth + 1);
  });
}

/** Public error `details` — JSON-safe value with no forbidden object keys (validated, not stripped). */
export const SafeErrorDetailsSchema = z.custom<SafeDetailValue>(
  (value) => validateSafeDetailValue(value, 0),
  { message: 'invalid_error_details' },
);

export const SafeApiErrorSchema = z.object({
  code: ErrorCodeSchema,
  message: z.string().min(1).max(500),
  details: SafeErrorDetailsSchema.optional(),
  requestId: RequestIdSchema.optional(),
  correlationId: CorrelationIdSchema.optional(),
});

export type SafeApiError = z.infer<typeof SafeApiErrorSchema>;

export type SafeApiErrorInput = {
  code: ErrorCode;
  message: string;
  details?: unknown;
  requestId?: string;
  correlationId?: string;
};

/**
 * Build a public-safe API error object and validate it against the contract.
 * Internal fields (stack traces, provider payloads, credentials) are stripped from `details`.
 */
export function toSafeApiError(input: SafeApiErrorInput): SafeApiError {
  const sanitizedDetails = sanitizeErrorDetails(input.details);
  const candidate = {
    code: input.code,
    message: input.message,
    ...(sanitizedDetails !== undefined ? { details: sanitizedDetails } : {}),
    ...(input.requestId !== undefined ? { requestId: input.requestId } : {}),
    ...(input.correlationId !== undefined ? { correlationId: input.correlationId } : {}),
  };

  return SafeApiErrorSchema.parse(candidate);
}

/** JSON serialization safe for HTTP responses (no stack traces or forbidden keys). */
export function serializeSafeApiError(error: SafeApiErrorInput): SafeApiError {
  return toSafeApiError(error);
}
