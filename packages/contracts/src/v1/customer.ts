import { z } from 'zod';

import {
  CanonicalEntityMetadataSchema,
  ExternalIdSchema,
  InboundEntityBaseSchema,
} from './common.js';

export const CustomerContactSchema = z.object({
  externalId: ExternalIdSchema,
  displayName: z.string().min(1).max(256).optional(),
  email: z.string().email().max(320).optional(),
  phone: z.string().min(1).max(64).optional(),
  isPrimary: z.boolean().optional(),
});

export type CustomerContact = z.infer<typeof CustomerContactSchema>;

export const CustomerAddressSchema = z.object({
  externalId: ExternalIdSchema,
  line1: z.string().min(1).max(256),
  line2: z.string().max(256).optional(),
  city: z.string().max(128).optional(),
  region: z.string().max(128).optional(),
  postalCode: z.string().max(32).optional(),
  countryCode: z.string().length(2).optional(),
});

export type CustomerAddress = z.infer<typeof CustomerAddressSchema>;

export const CustomerSchema = CanonicalEntityMetadataSchema.extend({
  displayName: z.string().min(1).max(256),
  isActive: z.boolean(),
  contacts: z.array(CustomerContactSchema).default([]),
  addresses: z.array(CustomerAddressSchema).default([]),
});

export type Customer = z.infer<typeof CustomerSchema>;

/** Provider-normalized customer row from `pullCustomers`. */
export const CustomerExternalSchema = InboundEntityBaseSchema.extend({
  displayName: z.string().min(1).max(256),
  isActive: z.boolean(),
  contacts: z.array(CustomerContactSchema).default([]),
  addresses: z.array(CustomerAddressSchema).default([]),
});

export type CustomerExternal = z.infer<typeof CustomerExternalSchema>;
