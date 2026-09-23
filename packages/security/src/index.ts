export {
  ConsumerAuthorizationError,
  ConsumerAuthorizationErrorCode,
} from './consumer-authorization-error.js';

export type {
  BindingResolver,
  ConsumerBindingRecord,
  ConsumerRecord,
} from './binding-resolver.js';

export {
  InMemoryBindingResolver,
  type InMemoryBindingResolverSeed,
} from './in-memory-binding-resolver.js';

export {
  resolveConsumerContext,
  type ResolveConsumerContextInput,
} from './resolve-consumer-context.js';

export type { ConsumerCredentialVerifier } from './credential-verifier.js';

export {
  B2B_TEST_PRINCIPAL,
  DEV_BINDING_REFS,
  DEV_CONSUMER_IDS,
  DEV_CONSUMER_TENANT_REFS,
  DEV_ORGANIZATION_IDS,
  SALES_TEST_PRINCIPAL,
  createDevelopmentBindingResolver,
  developmentConsumerSeed,
} from './fixtures/development-consumers.js';
