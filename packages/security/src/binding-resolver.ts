import type {
  BindingRef,
  BindingStatus,
  ConsumerKey,
  ConsumerScope,
  ConsumerStatus,
  ConsumerTenantRef,
  Uuid,
} from '@bih/contracts/v1';

export type ConsumerRecord = {
  consumerId: Uuid;
  consumerKey: ConsumerKey;
  status: ConsumerStatus;
};

export type ConsumerBindingRecord = {
  bindingId: Uuid;
  consumerId: Uuid;
  organizationId: Uuid;
  consumerTenantRef: ConsumerTenantRef;
  scopes: readonly ConsumerScope[];
  status: BindingStatus;
};

/**
 * Resolves consumer bindings from trusted persistence.
 * TASK-2.1 will back this with PostgreSQL; development uses in-memory fixtures.
 */
export interface BindingResolver {
  findConsumerById(consumerId: Uuid): ConsumerRecord | undefined;
  findBindingByRef(consumerId: Uuid, bindingRef: BindingRef): ConsumerBindingRecord | undefined;
  /** Returns true when `candidate` matches a Hub organization id (used to block org-id-as-bindingRef). */
  isKnownOrganizationId(candidate: string): boolean;
}
