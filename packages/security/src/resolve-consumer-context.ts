import {
  BindingRefSchema,
  ConsumerContextSchema,
  consumerHasScope,
  type AuthenticatedConsumerPrincipal,
  type BindingRef,
  type ConsumerContext,
  type ConsumerScope,
} from '@bih/contracts/v1';

import {
  ConsumerAuthorizationError,
  ConsumerAuthorizationErrorCode,
} from './consumer-authorization-error.js';
import type { BindingResolver } from './binding-resolver.js';

export type ResolveConsumerContextInput = {
  principal: AuthenticatedConsumerPrincipal;
  bindingRef: BindingRef;
  requiredScope: ConsumerScope;
};

/**
 * Resolve trusted {@link ConsumerContext} for a consumer request.
 * Credential transport verification stays pluggable until the auth mechanism decision lands.
 */
export function resolveConsumerContext(
  resolver: BindingResolver,
  input: ResolveConsumerContextInput,
): ConsumerContext {
  const bindingRefResult = BindingRefSchema.safeParse(input.bindingRef);
  if (!bindingRefResult.success) {
    throw new ConsumerAuthorizationError(
      ConsumerAuthorizationErrorCode.INVALID_BINDING_REF,
      'Binding reference is invalid',
    );
  }

  const bindingRef = bindingRefResult.data;
  const consumer = resolver.findConsumerById(input.principal.consumerId);

  if (consumer === undefined) {
    throw new ConsumerAuthorizationError(
      ConsumerAuthorizationErrorCode.CONSUMER_UNKNOWN,
      'Consumer is not registered',
    );
  }

  if (consumer.consumerKey !== input.principal.consumerKey) {
    throw new ConsumerAuthorizationError(
      ConsumerAuthorizationErrorCode.CONSUMER_UNKNOWN,
      'Consumer principal does not match registered consumer',
    );
  }

  if (consumer.status === 'disabled' || input.principal.status === 'disabled') {
    throw new ConsumerAuthorizationError(
      ConsumerAuthorizationErrorCode.CONSUMER_DISABLED,
      'Consumer is disabled',
    );
  }

  const binding = resolver.findBindingByRef(input.principal.consumerId, bindingRef);

  if (binding === undefined) {
    if (resolver.isKnownOrganizationId(bindingRef)) {
      throw new ConsumerAuthorizationError(
        ConsumerAuthorizationErrorCode.ORGANIZATION_SCOPE_DENIED,
        'Organization id cannot be used as a binding reference',
      );
    }

    throw new ConsumerAuthorizationError(
      ConsumerAuthorizationErrorCode.BINDING_NOT_FOUND,
      'Binding was not found for this consumer',
    );
  }

  if (binding.status === 'disabled') {
    throw new ConsumerAuthorizationError(
      ConsumerAuthorizationErrorCode.BINDING_DISABLED,
      'Binding is disabled',
    );
  }

  if (binding.consumerId !== input.principal.consumerId) {
    throw new ConsumerAuthorizationError(
      ConsumerAuthorizationErrorCode.BINDING_CONSUMER_MISMATCH,
      'Binding belongs to another consumer',
    );
  }

  if (!consumerHasScope(binding.scopes, input.requiredScope)) {
    throw new ConsumerAuthorizationError(
      ConsumerAuthorizationErrorCode.INSUFFICIENT_SCOPE,
      'Required consumer scope is not granted on this binding',
    );
  }

  return ConsumerContextSchema.parse({
    consumerId: consumer.consumerId,
    consumerKey: consumer.consumerKey,
    bindingId: binding.bindingId,
    bindingRef,
    organizationId: binding.organizationId,
    consumerTenantRef: binding.consumerTenantRef,
    scopes: [...binding.scopes],
  });
}
