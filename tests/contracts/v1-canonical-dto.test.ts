import { describe, expect, it } from 'vitest';

import { v1 } from '@bih/contracts';

const ORG_ID = '550e8400-e29b-41d4-a716-446655440001';
const CONNECTION_ID = '550e8400-e29b-41d4-a716-446655440002';
const CUSTOMER_ID = '550e8400-e29b-41d4-a716-446655440003';
const PRODUCT_ID = '550e8400-e29b-41d4-a716-446655440004';
const ENTITY_ID = '550e8400-e29b-41d4-a716-446655440005';
const NOW = '2026-03-21T10:15:30Z';

const canonicalMeta = {
  id: ENTITY_ID,
  organizationId: ORG_ID,
  sourceConnectionId: CONNECTION_ID,
  externalId: 'ext-customer-1',
  sourceUpdatedAt: NOW,
  hubVersion: '1',
  lastSyncedAt: NOW,
};

describe('@bih/contracts v1 canonical DTOs', () => {
  it('smoke-imports canonical types from @bih/canonical-model', async () => {
    const model = await import('@bih/canonical-model');
    expect(model.CANONICAL_MODEL_PACKAGE).toBe('@bih/canonical-model');
    expect(model.canonicalContractsV1.CONTRACT_API_VERSION).toBe('v1');
  });

  describe('Customer', () => {
    const validCustomer = {
      ...canonicalMeta,
      displayName: 'Acme Ltd',
      isActive: true,
      contacts: [{ externalId: 'c1', email: 'buyer@acme.example' }],
      addresses: [
        {
          externalId: 'a1',
          line1: '1 Main St',
          city: 'Tel Aviv',
          countryCode: 'IL',
        },
      ],
    };

    it('accepts B2B minimum customer fixture', () => {
      expect(v1.CustomerSchema.safeParse(validCustomer).success).toBe(true);
    });

    it('rejects missing external id on inbound customer', () => {
      const result = v1.CustomerExternalSchema.safeParse({
        organizationId: ORG_ID,
        sourceConnectionId: CONNECTION_ID,
        externalId: '',
        sourceUpdatedAt: null,
        displayName: 'Acme',
        isActive: true,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('Product and UOM', () => {
    it('accepts Sales minimum product fixture', () => {
      const result = v1.ProductSchema.safeParse({
        ...canonicalMeta,
        externalId: 'ext-product-1',
        sku: 'SKU-100',
        name: 'Widget',
        isActive: true,
        uoms: [{ externalId: 'u1', code: 'EA', isBase: true }],
      });
      expect(result.success).toBe(true);
    });
  });

  describe('CustomerAssortment vs CustomerPrice', () => {
    it('models assortment membership independently from price', () => {
      const assortment = v1.CustomerAssortmentSchema.safeParse({
        ...canonicalMeta,
        externalId: 'rel-1',
        customerId: CUSTOMER_ID,
        productId: PRODUCT_ID,
        isActive: true,
      });
      const price = v1.CustomerPriceSchema.safeParse({
        ...canonicalMeta,
        externalId: 'price-1',
        customerId: CUSTOMER_ID,
        productId: PRODUCT_ID,
        finalPrice: { amount: '10.00', currency: 'ILS' },
      });
      expect(assortment.success).toBe(true);
      expect(price.success).toBe(true);
    });

    it('allows in-assortment without price and price without assortment in external pulls', () => {
      const assortmentOnly = v1.CustomerAssortmentExternalSchema.safeParse({
        organizationId: ORG_ID,
        sourceConnectionId: CONNECTION_ID,
        externalId: 'rel-2',
        sourceUpdatedAt: null,
        customerExternalId: 'cust-a',
        productExternalId: 'prod-a',
        isActive: true,
      });
      const priceOnly = v1.CustomerPriceExternalSchema.safeParse({
        organizationId: ORG_ID,
        sourceConnectionId: CONNECTION_ID,
        externalId: 'price-2',
        sourceUpdatedAt: null,
        customerExternalId: 'cust-b',
        productExternalId: 'prod-b',
        finalPrice: { amount: '5.00', currency: 'ILS' },
      });
      expect(assortmentOnly.success).toBe(true);
      expect(priceOnly.success).toBe(true);
    });
  });

  describe('money and identifiers', () => {
    it('rejects invalid money on customer price', () => {
      const result = v1.CustomerPriceSchema.safeParse({
        ...canonicalMeta,
        externalId: 'price-bad',
        customerId: CUSTOMER_ID,
        productId: PRODUCT_ID,
        finalPrice: { amount: 'not-money', currency: 'ILS' },
      });
      expect(result.success).toBe(false);
    });

    it('round-trips money serialization on order lines', () => {
      const command = {
        consumerCommandRef: 'b2b-order-99',
        idempotencyKey: 'idem-99',
        customerId: CUSTOMER_ID,
        currency: 'ILS',
        approvedRevision: { revisionId: 'rev-1', approvedAt: NOW },
        lines: [
          {
            productId: PRODUCT_ID,
            quantity: '2',
            unitPrice: { amount: '12.3400', currency: 'ILS' },
          },
        ],
      };
      const parsed = v1.CanonicalSalesOrderCommandSchema.safeParse(command);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(v1.serializeMoney(parsed.data.lines[0].unitPrice)).toEqual({
          amount: '12.34',
          currency: 'ILS',
        });
      }
    });
  });

  describe('SyncPage', () => {
    it('validates cursor pagination metadata on sync pages', () => {
      const page = v1.CustomerExternalSyncPageSchema.safeParse({
        items: [],
        pagination: { limit: 100, hasMore: false, nextCursor: null },
        highWaterMark: 'hwm:1',
      });
      expect(page.success).toBe(true);
    });

    it('rejects malformed cursor in sync page', () => {
      const page = v1.ProductExternalSyncPageSchema.safeParse({
        items: [],
        pagination: { limit: 100, hasMore: true, nextCursor: '' },
      });
      expect(page.success).toBe(false);
    });
  });

  describe('change feed', () => {
    it('accepts change item with freshness metadata', () => {
      const item = v1.ChangeFeedItemSchema.safeParse({
        cursor: '100',
        organizationId: ORG_ID,
        entityType: 'customer_assortment',
        entityId: ENTITY_ID,
        operation: 'upsert',
        canonicalVersion: '42',
        sourceUpdatedAt: NOW,
        committedAt: NOW,
      });
      expect(item.success).toBe(true);
    });
  });

  describe('outbound commands and external document result', () => {
    it('rejects provider-specific fields on sales order command', () => {
      const result = v1.CanonicalSalesOrderCommandSchema.safeParse({
        consumerCommandRef: 'order-1',
        idempotencyKey: 'idem-1',
        customerId: CUSTOMER_ID,
        currency: 'ILS',
        approvedRevision: { revisionId: 'r1', approvedAt: NOW },
        lines: [
          {
            productId: PRODUCT_ID,
            quantity: '1',
            unitPrice: { amount: '1.00', currency: 'ILS' },
          },
        ],
        heshbonitDocType: 'should-not-exist',
      });
      expect(result.success).toBe(false);
    });

    it('serializes safe external document errors without provider payloads', () => {
      const unsafe = v1.ExternalDocumentResultSchema.safeParse({
        externalDocumentId: null,
        retryable: true,
        error: v1.toSafeApiError({
          code: 'PROVIDER_ERROR',
          message: 'Provider rejected document',
          requestId: 'req-1',
          details: {
            providerRaw: { secret: 'token', stack: 'Error\n at foo' },
            password: 'hunter2',
          },
        }),
      });
      expect(unsafe.success).toBe(true);
      if (unsafe.success && unsafe.data.error) {
        const serialized = v1.serializeSafeApiError(unsafe.data.error);
        expect(serialized.details).toBeUndefined();
        expect(JSON.stringify(serialized)).not.toContain('hunter2');
        expect(JSON.stringify(serialized)).not.toContain('token');
      }
    });
  });
});
