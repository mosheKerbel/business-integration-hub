/**
 * Provider-neutral canonical entity contracts for Hub modules.
 * Runtime schemas remain authoritative in `@bih/contracts` v1.
 */
export { v1 as canonicalContractsV1 } from '@bih/contracts';
export type {
  Customer,
  CustomerAssortment,
  CustomerPrice,
  Product,
  CustomerFinancialSnapshot,
  OpenFinancialDocument,
  ExternalSalesDocument,
  ChangeFeedItem,
  CanonicalSalesOrderCommand,
  CanonicalReturnCommand,
  ExternalDocumentResult,
} from '@bih/contracts/v1';

export const CANONICAL_MODEL_PACKAGE = '@bih/canonical-model';
