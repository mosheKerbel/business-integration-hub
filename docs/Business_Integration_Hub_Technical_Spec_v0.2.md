# Business Integration Hub — Technical Specification

**Version:** 0.2  
**Product baseline:** Business Integration Hub PRD v0.2  
**Document language:** English  
**Document date:** 2026-09-18  
**Architecture:** TypeScript/Node services + PostgreSQL + adapter packages + HTTP/JSON contracts

---

## 1. Goals and Architecture Decisions

The Business Integration Hub is the single integration boundary between consuming products and ERP/business systems.

The primary rule is:

> **Consumers own business intent; the Hub owns provider connectivity, canonical external data, synchronization, retries, idempotency, and provider-specific mapping.**

### 1.1 Decisions

| Decision | Choice |
|---|---|
| Deployment | Independent project/service with its own database |
| Runtime | Node.js + TypeScript strict |
| Database | PostgreSQL; schema/migrations remain PostgreSQL-compatible |
| API | Versioned HTTP/JSON + shared generated/TypeScript contracts |
| Inbound sync | Shared sync engine for scheduled and on-demand runs |
| Incremental delivery | Cursor-based consumer change feed for MVP |
| Outbound effects | Transactional outbox + worker |
| ERP abstraction | Capability-based ports + adapter registry |
| Test ERP | Standalone HTTP + SQLite Mock ERP plus in-process Fake adapter |
| Isolation key | Hub `organization_id`, independent from consumer `tenant_id` |
| Consumer coupling | API/change-feed only; no cross-project DB access |

### 1.2 Trust boundaries

```text
B2B Commerce -----------\
                         \        +---------------------------+
                          +------> | Business Integration Hub |
                         /        | API + DB + Workers        |
Sales Platform --------/         +-------------+-------------+
                                                |
                           +--------------------+-------------------+
                           |                    |                   |
                           v                    v                   v
                       Heshbonit          Hashavshevet          Mock ERP
```

Consumer authentication is independent from provider credentials. ERP credentials never leave the Hub.

---

## 2. Repository Structure

```text
business-integration-hub/
  apps/
    api/                      # HTTP API, consumer auth, admin/ops endpoints
    worker/                   # inbound sync + outbound command workers
    mock-erp/                 # dev/test-only HTTP + minimal UI + SQLite

  packages/
    contracts/                # canonical DTOs + API schemas
    canonical-model/          # provider-neutral entities/value objects
    db/                       # migrations, query layer, transaction helpers
    sync-engine/              # SyncRun/checkpoint/full+incremental orchestration
    change-feed/              # canonical committed changes + cursor delivery
    outbound/                 # command/outbox/idempotency engine
    integrations/
      erp/
        ports/                # capability interfaces
        registry/             # provider/capability resolver
        adapters/
          heshbonit/
          hashavshevet/
          mock/
    security/
    observability/
    testing/
      fake-erp/
      adapter-contract/

  migrations/
  tests/
    integration/
    e2e/
    security/
```

Provider adapter packages may depend on provider SDK/protocol details. `canonical-model`, `sync-engine`, `outbound`, and public contracts MUST NOT.

---

## 3. Identity and Mapping Model

The Hub does not reuse consumer tenant IDs as its root identity.

### 3.1 Core identity tables

```text
organizations
  id uuid pk
  key text unique
  name text
  status text
  created_at timestamptz
  updated_at timestamptz

consumers
  id uuid pk
  key text unique                 # b2b-commerce, sales-platform
  name text
  status text

consumer_organization_bindings
  id uuid pk
  consumer_id uuid
  organization_id uuid
  consumer_tenant_ref text        # opaque ID owned by consumer
  scopes text[] / normalized rows
  status text
  unique(consumer_id, consumer_tenant_ref)
```

`consumer_tenant_ref` is mapping metadata, not authorization authority by itself. Requests authenticate a consumer credential and resolve the allowed binding server-side.

### 3.2 Integration connection

```text
integration_connections
  id uuid pk
  organization_id uuid not null
  provider_key text not null
  connection_key text not null
  encrypted_credentials bytea not null
  credential_key_version text
  config_json jsonb not null
  status text not null
  last_validated_at timestamptz
  unique(organization_id, connection_key)

connection_capabilities
  organization_id
  connection_id
  capability_key
  enabled boolean
```

One organization MAY later use different connections/providers by capability.

---

## 4. Canonical Data Schema

Canonical tables represent external-system facts required by current consumers, not consumer business workflows.

Every canonical row includes:

```text
id uuid
organization_id uuid not null
source_connection_id uuid not null
external_id text not null
source_updated_at timestamptz null
hub_version bigint not null
last_synced_at timestamptz not null
payload_hash text null
is_active boolean where applicable
created_at / updated_at
```

### 4.1 Customers

```text
customers
customer_contacts
customer_addresses
```

`customers`: unique `(organization_id, source_connection_id, external_id)`.

### 4.2 Products and UOM

```text
products
product_uoms
```

Product canonical data includes external product ID, SKU, name, active status and provider-neutral operational attributes required by consumers.

### 4.3 Customer prices

```text
customer_prices
  organization_id
  customer_id
  product_id
  final_price numeric(18,4)
  currency char(3)
  source_updated_at
  last_synced_at
```

Unique `(organization_id, customer_id, product_id, source_connection_id)` unless future source-composition rules require an explicit resolved-price table.

### 4.4 Customer assortment (`CustomerAssortment` / מגוון)

Customer assortment is an ERP-owned Customer-to-Product membership fact and MUST be modeled independently from CustomerPrice.

```text
customer_assortments
  id uuid
  organization_id uuid not null
  source_connection_id uuid not null
  customer_id uuid not null
  product_id uuid not null
  external_id text not null
  is_active boolean not null
  source_updated_at timestamptz null
  hub_version bigint not null
  last_synced_at timestamptz not null
  payload_hash text null
  created_at / updated_at
```

Unique `(organization_id, customer_id, product_id, source_connection_id)`. `external_id` may be a stable provider relationship ID when one exists; otherwise the adapter SHALL derive a deterministic provider-scoped relationship key from the source Customer/Product identifiers.

Semantics:

- `is_active = true` means the Product is in the Customer's current source-defined assortment;
- absence/inactive relation means no current assortment membership;
- CustomerPrice absence MUST NOT be used to infer assortment membership;
- CustomerPrice presence MUST NOT grant assortment membership;
- provider adapters normalize positive-list, exclusion-list, group/range, or other provider-specific assortment mechanisms into this explicit canonical membership relation;
- full-sync deactivation of unseen assortment rows is allowed only after a successful authoritative full run for the relevant assortment scope.

### 4.5 Financials

```text
customer_financial_snapshots
open_financial_documents
```

The canonical contract preserves source freshness/definition metadata. Consumer products decide how to display or interpret business warnings.

### 4.6 Historical external documents

```text
external_sales_documents
external_sales_document_lines
```

Implemented only for adapters/consumers that require history.

---

## 5. Synchronization Schema

```text
sync_policies
  id
  organization_id
  connection_id
  capability_key
  enabled
  schedule_expression null
  preferred_mode full|incremental
  config_json

sync_runs
  id
  organization_id
  connection_id
  capability_key
  trigger scheduled|on_demand|recovery|bootstrap
  requested_by_consumer_id null
  mode full|incremental
  status pending|running|success|partial|failed
  cursor_before text null
  cursor_after text null
  pages_read int
  records_read int
  records_upserted int
  records_deactivated int
  errors_count int
  started_at
  completed_at

sync_checkpoints
  organization_id
  connection_id
  capability_key
  cursor text null
  high_water_mark text null
  last_successful_run_id
  updated_at

sync_errors
  id
  sync_run_id
  external_ref_safe text null
  error_code text
  safe_message text
  retryable boolean
  created_at
```

The checkpoint is advanced only after the canonical transaction(s) represented by it are committed.

---

## 6. Capability-Based ERP Ports

Use small provider-neutral ports.

```ts
export interface CustomerPort {
  pullCustomers(ctx: IntegrationContext, cursor?: string): Promise<SyncPage<CustomerExternal>>
}

export interface CatalogPort {
  pullProducts(ctx: IntegrationContext, cursor?: string): Promise<SyncPage<ProductExternal>>
}

export interface PricingPort {
  pullCustomerPrices(ctx: IntegrationContext, input: PriceSyncInput, cursor?: string): Promise<SyncPage<CustomerPriceExternal>>
}

export interface AssortmentPort {
  pullCustomerAssortments(
    ctx: IntegrationContext,
    input: AssortmentSyncInput,
    cursor?: string
  ): Promise<SyncPage<CustomerAssortmentExternal>>
}

export interface FinancialPort {
  pullFinancials(ctx: IntegrationContext, input: FinancialSyncInput, cursor?: string): Promise<SyncPage<FinancialExternal>>
}

export interface HistoryPort {
  pullSalesDocuments(ctx: IntegrationContext, input: HistorySyncInput, cursor?: string): Promise<SyncPage<SalesDocumentExternal>>
}

export interface SalesOrderPort {
  createOrder(ctx: IntegrationContext, command: CanonicalSalesOrderCommand): Promise<ExternalDocumentResult>
}

export interface ReturnPort {
  createReturn(ctx: IntegrationContext, command: CanonicalReturnCommand): Promise<ExternalDocumentResult>
}
```

The adapter registry resolves `(organization, capability)` to one configured connection/adapter and validates required capabilities before activation.

---

## 7. Inbound Sync Engine

### 7.1 Entry points

Both scheduler and API call:

```ts
runSync({ organizationId, capability, trigger, requestedBy? })
```

No separate implementation exists for manual sync.

### 7.2 Algorithm

1. authorize trigger;
2. resolve connection and adapter capability;
3. acquire an organization/capability run lock;
4. create `sync_runs` row;
5. load checkpoint;
6. pull provider page;
7. validate and normalize records;
8. transactionally upsert canonical records and append `change_events`;
9. continue paging;
10. advance checkpoint only after committed pages;
11. finalize counts/status;
12. emit operational metrics.

### 7.3 Full sync deletion/deactivation

A full sync MUST NOT blindly delete rows while paging. Use a run marker/generation or equivalent strategy and deactivate missing source records only after a successful complete source traversal.

### 7.4 Concurrency

Only one active sync for the same `(organization_id, connection_id, capability_key)` is permitted unless an adapter explicitly supports safely partitioned execution.

---

## 8. Change Feed

```text
change_events
  sequence bigint generated always as identity
  organization_id uuid
  entity_type text
  entity_id uuid
  operation upsert|deactivate|delete
  canonical_version bigint
  committed_at timestamptz
```

Consumer endpoint example:

```text
GET /api/v1/organizations/:bindingRef/changes?after=<cursor>&limit=500
```

The server resolves `bindingRef` from the authenticated consumer and never accepts arbitrary organization scope.

Consumers persist their own cursor. Replay is supported. A consumer can bootstrap from canonical list endpoints then continue from a captured change cursor.

---

## 9. Outbound Command Model

```text
outbound_commands
  id uuid pk
  organization_id uuid
  consumer_id uuid
  consumer_command_ref text
  capability_key text                 # sales_order.create / return.create
  idempotency_key text
  canonical_payload jsonb
  status accepted|pending|processing|succeeded|failed|cancelled
  retryable boolean null
  external_document_id text null
  last_error_code text null
  last_error_safe text null
  available_at timestamptz
  created_at
  updated_at
  unique(organization_id, consumer_id, consumer_command_ref)
  unique(organization_id, capability_key, idempotency_key)

outbound_attempts
  id
  outbound_command_id
  attempt_number
  status processing|succeeded|failed
  provider_request_snapshot jsonb null
  provider_response_snapshot jsonb null
  error_code text null
  safe_message text null
  retryable boolean null
  started_at
  completed_at
```

Sensitive provider payload fields are redacted before snapshot persistence.

### 9.1 Acceptance

`POST /api/v1/outbound/orders` validates the canonical contract and consumer scope, then commits the command. The response confirms **Hub acceptance**, not ERP success.

### 9.2 Worker

The worker:

1. leases a pending command with `FOR UPDATE SKIP LOCKED`;
2. resolves the adapter;
3. creates attempt row;
4. calls provider with the same logical idempotency key on every retry;
5. records success/external ID or classified failure;
6. schedules retry with backoff+jitter when retryable;
7. publishes a command-status change event.

The Hub does not change the consumer's Order/Payment state.

---

## 10. Public Consumer API

Representative endpoints:

```text
GET  /api/v1/capabilities
GET  /api/v1/customers
GET  /api/v1/products
GET  /api/v1/customer-prices
GET  /api/v1/customer-assortments
GET  /api/v1/financials/customers/:externalOrCanonicalRef
GET  /api/v1/sales-documents
GET  /api/v1/changes

POST /api/v1/sync/:capability/run
GET  /api/v1/sync/runs/:id

POST /api/v1/outbound/orders
POST /api/v1/outbound/returns
GET  /api/v1/outbound/commands/:consumerCommandRef
GET  /api/v1/outbound/commands/:consumerCommandRef/attempts
```

Exact paths may change, but contracts are versioned and runtime-validated.

---

## 11. Consumer Contract — B2B Commerce

### 11.1 Inbound

B2B projects locally:

- Customer;
- Product identity/operational master fields;
- CustomerAssortment (`Customer ↔ Product`, מגוון);
- CustomerPrice;
- optional history later.

`CustomerAssortment` and `CustomerPrice` are separate contracts. B2B MUST NOT infer catalog entitlement from price presence/absence. For the Nofar consumer, authenticated catalog visibility is restricted to active assortment membership plus B2B-owned Product visibility rules.

Payload-owned `ProductContent`, `ProductCommerceConfig`, Promotions, Cart, Payment and Order remain B2B-only.

### 11.2 Outbound

B2B sends `CanonicalSalesOrderCommand` only after its own order is approved and payment is eligible. The command includes an immutable approved revision snapshot and stable idempotency key.

B2B stores Hub command reference/status locally for UI and audit. Provider attempt history is retrieved from the Hub when needed.

---

## 12. Consumer Contract — Sales Platform

### 12.1 Inbound

Sales projects locally:

- Customer/contact/address data required by the app;
- Product/UOM data;
- supported price/commercial reference data;
- financial snapshots/open documents;
- supported order/history data.

Excel inventory remains outside the Hub in the initial extraction.

### 12.2 Outbound

Sales sends canonical Sales Order and Return commands after its own domain transitions authorize submission. Sales retains its product-visible state machine and maps Hub/ERP command status into it.

---

## 13. Mock ERP and Fake Adapter

### 13.1 Fake adapter

Fast in-process adapter with programmable outcomes. No HTTP/database.

### 13.2 Mock ERP application

`apps/mock-erp`:

- Node/TypeScript;
- own SQLite database;
- separate wire model from Hub canonical tables;
- minimal UI;
- deterministic seed/reset;
- supports multiple simulated companies;
- customer/product/customer-assortment/price/financial fixtures, including two customers with intentionally different assortments;
- received orders/returns;
- latency, 4xx/5xx, business rejection, fail-next-N;
- `timeout_before_persist`;
- mandatory `timeout_after_persist`;
- same idempotency key returns the same external document.

Hub adapter contract tests run against the Fake adapter and Mock ERP adapter. Real adapter sandboxes run the same conformance suite where possible.

---

## 14. Database Security

- every organization-owned row carries `organization_id`;
- cross-organization composite foreign keys are used where relevant;
- provider secrets are encrypted application-side using a key/KMS reference outside the DB;
- consumer service credentials are scoped to allowed bindings/capabilities;
- normal runtime role does not bypass row policies if RLS is used;
- privileged operations are server-only and audited;
- no consumer receives ERP credentials.

The Hub SHOULD enable PostgreSQL RLS as defense in depth even though browsers do not access its database directly.

---

## 15. Observability

Structured events include:

```text
request_id
correlation_id
organization_id
consumer_id
connection_id
sync_run_id
outbound_command_id
outbound_attempt_id
provider_key
capability_key
duration
outcome
```

Metrics:

- sync age/duration/count/errors by organization/capability;
- canonical upsert/deactivation counts;
- change-feed lag;
- outbound queue depth/age;
- provider latency/errors;
- retries and permanent failures;
- duplicate/idempotency conflict attempts.

No credentials or unsafe raw provider payloads are logged.

---

## 16. Testing Strategy

| Layer | Required coverage |
|---|---|
| Unit | normalization, mapping helpers, checkpoint behavior, idempotency keys, error classification |
| DB integration | migrations, org isolation, upserts, checkpoints, outbox leasing, concurrency |
| Adapter contract | paging/cursors, nulls, mapping, timeout, retry classification, external ID stability |
| Mock ERP integration | real HTTP serialization, latency/failure, idempotency, timeout-after-persist |
| Consumer contract | B2B and Sales DTO compatibility, including CustomerAssortment separate from CustomerPrice |
| E2E | ERP seed -> Hub sync -> consumer projection; consumer command -> Hub -> Mock ERP |
| Security | consumer binding isolation, org isolation, secret non-exposure |

Mandatory E2E scenarios include two organizations and two consumers.

---

## 17. Migration / Extraction Plan

### Phase 0 — Contracts

1. create Hub project and schema;
2. define canonical DTOs and consumer service authentication;
3. define Customer/Product/CustomerAssortment/Price/Financial and outbound Order/Return contracts;
4. define consumer tenant-to-Hub organization bindings.

### Phase 1 — Test infrastructure

1. move/merge Fake ERP behavior into Hub `testing/fake-erp`;
2. move/merge Mock/Dummy ERP into Hub `apps/mock-erp`;
3. implement shared adapter contract suite;
4. prove timeout-after-persist idempotency.

### Phase 2 — Inbound adapters/sync

1. move Heshbonit provider mapping to Hub;
2. move Hashavshevet provider mapping to Hub;
3. implement canonical sync engine;
4. expose bootstrap + change-feed APIs.

### Phase 3 — B2B cutover

1. add Hub client;
2. bootstrap B2B Customer/Product/CustomerAssortment/CustomerPrice projections;
3. replace direct ERP sync with Hub projection sync;
4. route approved/payment-eligible orders through Hub;
5. remove B2B Heshbonit/Dummy/Fake implementation.

### Phase 4 — Sales cutover

1. add Hub client;
2. bootstrap Sales ERP-owned projections;
3. replace direct ERP sync jobs with Hub projection sync;
4. route Sales Order/Return commands through Hub;
5. remove Sales ERP adapter/Mock ERP implementation.

### Phase 5 — Cleanup

1. confirm no provider secrets in consumers;
2. remove duplicate adapter contracts;
3. run both product E2E suites through Hub + Mock ERP;
4. document operational ownership and deployment/runbooks.

---

## 18. Definition of Done

- Hub DB rebuilds from migrations + seed.
- Scheduled and on-demand sync execute the same sync engine.
- Heshbonit/Hashavshevet code exists only in Hub adapters.
- Mock ERP exists only in Hub and is production-disabled.
- Both consumers can bootstrap and incrementally maintain local projections.
- Consumer retries/restarts do not duplicate accepted Hub commands.
- Hub retry after `timeout_after_persist` does not duplicate external documents.
- B2B order/payment/approval behavior is unchanged.
- CustomerAssortment is synchronized as a first-class canonical relation independently from CustomerPrice, and B2B contract tests prove different customers can receive different product sets.
- Sales offline/order/return behavior is unchanged.
- Provider credentials never reach B2B or Sales.
- Cross-organization and cross-consumer isolation tests pass.
- Operational sync/command diagnostics are available with sanitized errors.
