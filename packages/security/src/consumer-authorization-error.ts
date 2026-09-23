import type { ErrorCode } from '@bih/contracts/v1';

/** Authorization failures when resolving trusted consumer context. */
export const ConsumerAuthorizationErrorCode = {
  CONSUMER_UNKNOWN: 'CONSUMER_UNKNOWN',
  CONSUMER_DISABLED: 'CONSUMER_DISABLED',
  BINDING_NOT_FOUND: 'BINDING_NOT_FOUND',
  BINDING_DISABLED: 'BINDING_DISABLED',
  BINDING_CONSUMER_MISMATCH: 'BINDING_CONSUMER_MISMATCH',
  INSUFFICIENT_SCOPE: 'INSUFFICIENT_SCOPE',
  ORGANIZATION_SCOPE_DENIED: 'ORGANIZATION_SCOPE_DENIED',
  INVALID_BINDING_REF: 'INVALID_BINDING_REF',
} as const satisfies Record<string, ErrorCode>;

export type ConsumerAuthorizationErrorCode =
  (typeof ConsumerAuthorizationErrorCode)[keyof typeof ConsumerAuthorizationErrorCode];

export class ConsumerAuthorizationError extends Error {
  readonly code: ConsumerAuthorizationErrorCode;

  constructor(code: ConsumerAuthorizationErrorCode, message: string) {
    super(message);
    this.name = 'ConsumerAuthorizationError';
    this.code = code;
  }
}
