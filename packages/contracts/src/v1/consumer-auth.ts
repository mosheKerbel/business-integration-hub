import { z } from 'zod';

import { UuidSchema } from './scalars.js';

function containsAsciiControlCharacter(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code <= 0x1f || code === 0x7f) {
      return true;
    }
  }
  return false;
}

/** Hub-registered consumer product keys (Technical Spec §3.1). */
export const CONSUMER_KEY_MAX_LENGTH = 64;

export const ConsumerKeySchema = z
  .string()
  .min(1, { message: 'invalid_consumer_key' })
  .max(CONSUMER_KEY_MAX_LENGTH, { message: 'invalid_consumer_key' })
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { message: 'invalid_consumer_key' });

export type ConsumerKey = z.infer<typeof ConsumerKeySchema>;

export const ConsumerStatusSchema = z.enum(['active', 'disabled']);

export type ConsumerStatus = z.infer<typeof ConsumerStatusSchema>;

export const BindingStatusSchema = z.enum(['active', 'disabled']);

export type BindingStatus = z.infer<typeof BindingStatusSchema>;

/**
 * Opaque consumer-owned tenant identifier stored on a binding.
 * Mapping metadata only — never treated as authorization authority by itself.
 */
export const CONSUMER_TENANT_REF_MAX_LENGTH = 256;

export const ConsumerTenantRefSchema = z
  .string()
  .min(1, { message: 'invalid_consumer_tenant_ref' })
  .max(CONSUMER_TENANT_REF_MAX_LENGTH, { message: 'invalid_consumer_tenant_ref' })
  .refine((value) => !containsAsciiControlCharacter(value), { message: 'invalid_consumer_tenant_ref' });

export type ConsumerTenantRef = z.infer<typeof ConsumerTenantRefSchema>;

/**
 * Server-resolved binding reference from routes (for example `:bindingRef`).
 * Must resolve through authenticated consumer bindings — not a raw organization id.
 */
export const BINDING_REF_MAX_LENGTH = 128;

export const BindingRefSchema = z
  .string()
  .min(1, { message: 'invalid_binding_ref' })
  .max(BINDING_REF_MAX_LENGTH, { message: 'invalid_binding_ref' })
  .refine((value) => !containsAsciiControlCharacter(value), { message: 'invalid_binding_ref' });

export type BindingRef = z.infer<typeof BindingRefSchema>;

/** Consumer authorization scopes granted on a binding (distinct from ERP adapter capability keys). */
export const CONSUMER_SCOPE_VALUES = [
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
] as const;

export const ConsumerScopeSchema = z.enum(CONSUMER_SCOPE_VALUES);

export type ConsumerScope = z.infer<typeof ConsumerScopeSchema>;

export const ConsumerScopesSchema = z
  .array(ConsumerScopeSchema)
  .min(1, { message: 'invalid_consumer_scopes' });

export type ConsumerScopes = z.infer<typeof ConsumerScopesSchema>;

/**
 * Trusted authorization context for consumer request handlers.
 * `organizationId` is always server-resolved from the binding — never from caller-supplied org scope.
 */
export const ConsumerContextSchema = z.object({
  consumerId: UuidSchema,
  consumerKey: ConsumerKeySchema,
  bindingId: UuidSchema,
  bindingRef: BindingRefSchema,
  organizationId: UuidSchema,
  consumerTenantRef: ConsumerTenantRefSchema,
  scopes: ConsumerScopesSchema,
});

export type ConsumerContext = z.infer<typeof ConsumerContextSchema>;

export const AuthenticatedConsumerPrincipalSchema = z.object({
  consumerId: UuidSchema,
  consumerKey: ConsumerKeySchema,
  status: ConsumerStatusSchema,
});

export type AuthenticatedConsumerPrincipal = z.infer<typeof AuthenticatedConsumerPrincipalSchema>;

export function consumerHasScope(scopes: readonly ConsumerScope[], requiredScope: ConsumerScope): boolean {
  return scopes.includes(requiredScope);
}
