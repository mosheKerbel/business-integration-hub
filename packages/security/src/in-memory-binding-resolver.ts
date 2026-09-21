import type { BindingRef, Uuid } from '@bih/contracts/v1';

import type { BindingResolver, ConsumerBindingRecord, ConsumerRecord } from './binding-resolver.js';

export type InMemoryBindingResolverSeed = {
  consumers: readonly ConsumerRecord[];
  bindings: readonly ConsumerBindingRecord[];
  organizationIds: readonly Uuid[];
};

export class InMemoryBindingResolver implements BindingResolver {
  readonly #consumersById = new Map<string, ConsumerRecord>();
  readonly #bindingsByConsumerAndRef = new Map<string, ConsumerBindingRecord>();
  readonly #organizationIds = new Set<string>();

  constructor(seed: InMemoryBindingResolverSeed) {
    for (const organizationId of seed.organizationIds) {
      this.#organizationIds.add(organizationId);
    }

    for (const consumer of seed.consumers) {
      this.#consumersById.set(consumer.consumerId, consumer);
    }

    for (const binding of seed.bindings) {
      const byIdKey = bindingKey(binding.consumerId, binding.bindingId);
      this.#bindingsByConsumerAndRef.set(byIdKey, binding);
    }
  }

  findConsumerById(consumerId: Uuid): ConsumerRecord | undefined {
    return this.#consumersById.get(consumerId);
  }

  findBindingByRef(consumerId: Uuid, bindingRef: BindingRef): ConsumerBindingRecord | undefined {
    return this.#bindingsByConsumerAndRef.get(bindingKey(consumerId, bindingRef));
  }

  isKnownOrganizationId(candidate: string): boolean {
    return this.#organizationIds.has(candidate);
  }
}

function bindingKey(consumerId: Uuid, bindingRef: BindingRef): string {
  return `${consumerId}\u0000${bindingRef}`;
}
