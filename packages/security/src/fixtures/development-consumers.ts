import type { AuthenticatedConsumerPrincipal, ConsumerScope } from '@bih/contracts/v1';

import {
  InMemoryBindingResolver,
  type InMemoryBindingResolverSeed,
} from '../in-memory-binding-resolver.js';

/** Deterministic Hub organization ids for development and contract tests. */
export const DEV_ORGANIZATION_IDS = {
  b2b: '11111111-1111-4111-8111-111111111101',
  sales: '11111111-1111-4111-8111-111111111102',
  /** Organization with no consumer bindings — used for isolation tests. */
  unbound: '11111111-1111-4111-8111-111111111199',
} as const;

export const DEV_CONSUMER_IDS = {
  b2b: '22222222-2222-4222-8222-222222222201',
  sales: '22222222-2222-4222-8222-222222222202',
} as const;

export const DEV_BINDING_REFS = {
  b2b: '33333333-3333-4333-8333-333333333301',
  sales: '33333333-3333-4333-8333-333333333302',
} as const;

export const DEV_CONSUMER_TENANT_REFS = {
  b2b: 'nofar-b2b-tenant-dev',
  sales: 'sales-platform-tenant-dev',
} as const;

const ALL_DEV_SCOPES: readonly ConsumerScope[] = [
  'read.capabilities',
  'read.customers',
  'read.products',
  'read.customer_prices',
  'read.customer_assortments',
  'read.financials',
  'read.sales_documents',
  'read.changes',
  'sync.run',
  'sync.read_runs',
  'outbound.orders.create',
  'outbound.returns.create',
  'outbound.commands.read',
  'operations.read',
];

const SALES_DEV_SCOPES: readonly ConsumerScope[] = [
  'read.capabilities',
  'read.customers',
  'read.products',
  'read.customer_prices',
  'read.financials',
  'read.sales_documents',
  'read.changes',
  'sync.run',
  'sync.read_runs',
  'outbound.orders.create',
  'outbound.returns.create',
  'outbound.commands.read',
  'operations.read',
];

export const developmentConsumerSeed: InMemoryBindingResolverSeed = {
  organizationIds: Object.values(DEV_ORGANIZATION_IDS),
  consumers: [
    {
      consumerId: DEV_CONSUMER_IDS.b2b,
      consumerKey: 'b2b-commerce',
      status: 'active',
    },
    {
      consumerId: DEV_CONSUMER_IDS.sales,
      consumerKey: 'sales-platform',
      status: 'active',
    },
  ],
  bindings: [
    {
      bindingId: DEV_BINDING_REFS.b2b,
      consumerId: DEV_CONSUMER_IDS.b2b,
      organizationId: DEV_ORGANIZATION_IDS.b2b,
      consumerTenantRef: DEV_CONSUMER_TENANT_REFS.b2b,
      scopes: ALL_DEV_SCOPES,
      status: 'active',
    },
    {
      bindingId: DEV_BINDING_REFS.sales,
      consumerId: DEV_CONSUMER_IDS.sales,
      organizationId: DEV_ORGANIZATION_IDS.sales,
      consumerTenantRef: DEV_CONSUMER_TENANT_REFS.sales,
      scopes: SALES_DEV_SCOPES,
      status: 'active',
    },
  ],
};

export function createDevelopmentBindingResolver(): InMemoryBindingResolver {
  return new InMemoryBindingResolver(developmentConsumerSeed);
}

export const B2B_TEST_PRINCIPAL: AuthenticatedConsumerPrincipal = {
  consumerId: DEV_CONSUMER_IDS.b2b,
  consumerKey: 'b2b-commerce',
  status: 'active',
};

export const SALES_TEST_PRINCIPAL: AuthenticatedConsumerPrincipal = {
  consumerId: DEV_CONSUMER_IDS.sales,
  consumerKey: 'sales-platform',
  status: 'active',
};
