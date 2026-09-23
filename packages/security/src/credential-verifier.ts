import type { AuthenticatedConsumerPrincipal } from '@bih/contracts/v1';

/**
 * Pluggable consumer service credential verification.
 * Transport (mTLS, signed tokens, etc.) is intentionally unresolved (Decision Required).
 */
export interface ConsumerCredentialVerifier<TCredential = unknown> {
  verify(credential: TCredential): Promise<AuthenticatedConsumerPrincipal>;
}
