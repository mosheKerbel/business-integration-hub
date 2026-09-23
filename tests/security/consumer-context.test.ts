import { describe, expect, it } from 'vitest';

import { v1 } from '@bih/contracts';
import {
  B2B_TEST_PRINCIPAL,
  ConsumerAuthorizationError,
  ConsumerAuthorizationErrorCode,
  DEV_BINDING_REFS,
  DEV_CONSUMER_IDS,
  DEV_ORGANIZATION_IDS,
  InMemoryBindingResolver,
  SALES_TEST_PRINCIPAL,
  createDevelopmentBindingResolver,
  developmentConsumerSeed,
  resolveConsumerContext,
} from '@bih/security';

function expectAuthorizationError(fn: () => void, code: string): void {
  try {
    fn();
    expect.fail('Expected ConsumerAuthorizationError');
  } catch (error) {
    expect(error).toBeInstanceOf(ConsumerAuthorizationError);
    expect((error as ConsumerAuthorizationError).code).toBe(code);
  }
}

describe('consumer context resolution', () => {
  const resolver = createDevelopmentBindingResolver();

  it('resolves B2B binding with required read scope', () => {
    const context = resolveConsumerContext(resolver, {
      principal: B2B_TEST_PRINCIPAL,
      bindingRef: DEV_BINDING_REFS.b2b,
      requiredScope: 'read.customers',
    });

    expect(context.consumerKey).toBe('b2b-commerce');
    expect(context.organizationId).toBe(DEV_ORGANIZATION_IDS.b2b);
    expect(context.consumerTenantRef).toBe('nofar-b2b-tenant-dev');
    expect(v1.ConsumerContextSchema.safeParse(context).success).toBe(true);
  });

  it('resolves Sales binding with outbound scope', () => {
    const context = resolveConsumerContext(resolver, {
      principal: SALES_TEST_PRINCIPAL,
      bindingRef: DEV_BINDING_REFS.sales,
      requiredScope: 'outbound.orders.create',
    });

    expect(context.consumerKey).toBe('sales-platform');
    expect(context.organizationId).toBe(DEV_ORGANIZATION_IDS.sales);
  });

  it('denies when binding belongs to another consumer', () => {
    expectAuthorizationError(
      () =>
        resolveConsumerContext(resolver, {
          principal: B2B_TEST_PRINCIPAL,
          bindingRef: DEV_BINDING_REFS.sales,
          requiredScope: 'read.customers',
        }),
      ConsumerAuthorizationErrorCode.BINDING_NOT_FOUND,
    );
  });

  it('denies when required scope is missing on binding', () => {
    expectAuthorizationError(
      () =>
        resolveConsumerContext(resolver, {
          principal: SALES_TEST_PRINCIPAL,
          bindingRef: DEV_BINDING_REFS.sales,
          requiredScope: 'read.customer_assortments',
        }),
      ConsumerAuthorizationErrorCode.INSUFFICIENT_SCOPE,
    );
  });

  it('denies raw organization id used as binding reference', () => {
    expectAuthorizationError(
      () =>
        resolveConsumerContext(resolver, {
          principal: B2B_TEST_PRINCIPAL,
          bindingRef: DEV_ORGANIZATION_IDS.sales,
          requiredScope: 'read.customers',
        }),
      ConsumerAuthorizationErrorCode.ORGANIZATION_SCOPE_DENIED,
    );
  });

  it('denies unbound organization id even for authenticated consumer', () => {
    expectAuthorizationError(
      () =>
        resolveConsumerContext(resolver, {
          principal: B2B_TEST_PRINCIPAL,
          bindingRef: DEV_ORGANIZATION_IDS.unbound,
          requiredScope: 'read.customers',
        }),
      ConsumerAuthorizationErrorCode.ORGANIZATION_SCOPE_DENIED,
    );
  });

  it('denies disabled consumer principal', () => {
    expectAuthorizationError(
      () =>
        resolveConsumerContext(resolver, {
          principal: { ...B2B_TEST_PRINCIPAL, status: 'disabled' },
          bindingRef: DEV_BINDING_REFS.b2b,
          requiredScope: 'read.customers',
        }),
      ConsumerAuthorizationErrorCode.CONSUMER_DISABLED,
    );
  });

  it('denies disabled binding', () => {
    const disabledBindingResolver = new InMemoryBindingResolver({
      ...developmentConsumerSeed,
      bindings: developmentConsumerSeed.bindings.map((binding) =>
        binding.bindingId === DEV_BINDING_REFS.b2b ? { ...binding, status: 'disabled' } : binding,
      ),
    });

    expectAuthorizationError(
      () =>
        resolveConsumerContext(disabledBindingResolver, {
          principal: B2B_TEST_PRINCIPAL,
          bindingRef: DEV_BINDING_REFS.b2b,
          requiredScope: 'read.customers',
        }),
      ConsumerAuthorizationErrorCode.BINDING_DISABLED,
    );
  });

  it('denies unknown consumer id', () => {
    expectAuthorizationError(
      () =>
        resolveConsumerContext(resolver, {
          principal: {
            consumerId: '99999999-9999-4999-8999-999999999999',
            consumerKey: 'b2b-commerce',
            status: 'active',
          },
          bindingRef: DEV_BINDING_REFS.b2b,
          requiredScope: 'read.customers',
        }),
      ConsumerAuthorizationErrorCode.CONSUMER_UNKNOWN,
    );
  });

  it('detects binding consumer mismatch defensively', () => {
    const mismatchedResolver = new InMemoryBindingResolver({
      ...developmentConsumerSeed,
      bindings: [
        {
          ...developmentConsumerSeed.bindings[0]!,
          consumerId: DEV_CONSUMER_IDS.sales,
        },
        developmentConsumerSeed.bindings[1]!,
      ],
    });

    expectAuthorizationError(
      () =>
        resolveConsumerContext(mismatchedResolver, {
          principal: B2B_TEST_PRINCIPAL,
          bindingRef: DEV_BINDING_REFS.b2b,
          requiredScope: 'read.customers',
        }),
      ConsumerAuthorizationErrorCode.BINDING_NOT_FOUND,
    );
  });
});

describe('@bih/contracts consumer authorization schemas', () => {
  it('accepts stable consumer scope names', () => {
    for (const scope of v1.CONSUMER_SCOPE_VALUES) {
      expect(v1.ConsumerScopeSchema.safeParse(scope).success).toBe(true);
    }
  });

  it('rejects invalid binding references', () => {
    expect(v1.BindingRefSchema.safeParse('').success).toBe(false);
    expect(v1.BindingRefSchema.safeParse('ref\u0001bad').success).toBe(false);
  });
});
