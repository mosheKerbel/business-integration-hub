# Implementation Plan

**Version:** 0.2  
**Sources:** Business Integration Hub PRD v0.2; Technical Specification v0.2  
**Change in v0.2:** Adds first-class CustomerAssortment / מגוון synchronization as an independent canonical Customer-to-Product fact for B2B.

## Architecture & Scope Summary

The Business Integration Hub is a separately deployable TypeScript/Node platform service with its own PostgreSQL database. It is the single integration boundary between consuming products and ERP/business systems.

The architectural rule is: consumers own business intent; the Hub owns provider connectivity, canonical external data, synchronization, provider-specific mapping, retries, idempotency, provider credentials, and integration diagnostics.

Initial consumers are Nofar B2B Commerce and the Smart Sales & Distribution Platform. Consumers use only versioned HTTP/JSON APIs and a cursor-based change feed and keep their own local projections. For B2B, the canonical inbound contract includes CustomerAssortment (`Customer ↔ Product`, מגוון) independently from CustomerPrice. They never access the Hub database directly.

Implementation is contract-first. The preferred dependency shape is:

`Contracts -> { Persistence || Fake/Mock ERP || API stubs } -> { Sync Engine || Outbound Engine || Real Adapters } -> Consumer Contract Tests -> E2E/Hardening`

The Hub must not absorb B2B Cart/Promotion/Payment/approval rules, Sales offline/inventory/AI/risk/field-work logic, consumer end-user authentication, or product-specific UI behavior.

## Open Questions / Decisions Required

1. **Decision Required - Consumer authentication mechanism.** The Hub requires authenticated consumer service credentials scoped to bindings/capabilities, but the transport/security mechanism is unspecified. This affects middleware, credential lifecycle, local fixtures, and rotation.
2. **Decision Required - Public contract source of truth.** The Technical Design says "shared generated/TypeScript contracts" but does not choose OpenAPI, direct TypeScript runtime schemas, or another generator. This plan treats `packages/contracts` as authoritative and does not add a generator without approval.
3. **Decision Required - Exact change-feed route.** The Technical Design shows both `GET /api/v1/organizations/:bindingRef/changes` and `GET /api/v1/changes`. Authorization semantics are compatible, but the path must be finalized before implementation.
4. **Decision Required - Scheduler technology and schedule expression.** Periodic sync and `schedule_expression` are required; scheduler runtime/hosting/expression syntax are not.
5. **Decision Required - Credential encryption/KMS implementation.** Application-side encryption with external key/KMS reference is required; provider, rotation, and local-key strategy are not specified.
6. **Decision Required - PostgreSQL RLS requirement.** The Technical Design says the Hub SHOULD enable RLS as defense in depth. Least-privilege DB access and isolation tests are mandatory, but whether RLS itself blocks release must be decided.
7. **Decision Required - Heshbonit mapping pack.** Actual provider schema/protocol, paging, Customer Assortment / מגוון mapping, order mapping, error mapping, and idempotency strategy are not supplied. TASK-5.1 must not infer assortment from price rows.
8. **Decision Required - Hashavshevet mapping pack.** Actual customer/product/UOM/finance/history/order/return mappings, paging, errors, and idempotency are not supplied.
9. **Decision Required - Canonical field-level detail.** Entity areas are defined, but not every contact/address/financial/history field. Only current consumer-backed fields should be added.
10. **Decision Required - Operations UI boundary.** Operational views/APIs are required, but no Hub UI framework is specified. This backlog implements APIs first and does not invent a dedicated UI.
11. **Decision Required - Historical document scope.** History is only required where provider/consumer support exists. Richer history is deferred.

# Epics

## EPIC-1: Foundation and Public Contracts

**Goal:**  
Create the independent repository foundation and stable provider-neutral contracts that unblock parallel work.

**Depends on:**  
None.

### TASK-1.1: Bootstrap Hub repository and local runtime

**Type:** Infrastructure

**Objective:**  
Create the independent TypeScript/Node project skeleton and reproducible local runtime.

**Task Context:**  
The Hub is an independent service with apps/api, apps/worker, apps/mock-erp and shared packages. PostgreSQL is the Hub database; Mock ERP is isolated and later uses SQLite.

**Implementation Goal:**  
A clean checkout installs, type-checks, starts API/worker development entry points, and connects to local PostgreSQL through environment configuration.

**Scope:**
- Create the workspace structure from the Technical Design.
- Enable TypeScript strict mode across apps/packages.
- Add root build, lint, type-check, test and development scripts using existing project conventions.
- Add local PostgreSQL configuration and environment templates without real secrets.
- Create minimal API/worker entry points needed to prove workspace wiring.


**Out of Scope:**
- Business endpoints.
- Database domain schema beyond a connectivity smoke test.
- Mock ERP behavior.
- Provider adapters.
- Cloud vendor selection.


**Expected Code Areas:**
- `apps/api/`
- `apps/worker/`
- `apps/mock-erp/`
- `packages/`
- `migrations/`
- `tests/`


**Inputs:**  
Repository configuration and environment values such as DATABASE_URL.

**Outputs:**  
Buildable workspace, runnable API/worker development processes, and documented local bootstrap steps.

**API / Interface Contract:**  
No external business API contract is introduced in this task.

**Error Cases / Edge Cases:**
- Missing DATABASE_URL.
- Workspace package fails strict compilation.
- Environment template accidentally includes a real secret.


**Implementation Constraints:**
- Use Node.js and TypeScript strict.
- Keep Hub PostgreSQL separate from Mock ERP SQLite.
- Do not select a deployment vendor.
- Inspect existing codebase patterns before introducing tooling.


**Testing Requirements:**
- Workspace type-check smoke test.
- API and worker startup smoke tests.
- Local PostgreSQL connectivity smoke test.


**Acceptance Criteria:**
- Clean clone installs with documented commands.
- All workspaces compile under strict TypeScript.
- API and worker start without provider credentials.
- No production secret is committed.


**Dependencies:**

**Hard Dependencies:**
- None


**Contract Dependencies:**
- None


**Can Run in Parallel With:**
- TASK-1.2


**Definition of Done:**
- Implementation is complete for the stated scope.
- Required tests pass.
- Type-check and lint pass.
- Public interfaces match the agreed contract.
- Supported failure cases are handled without leaking credentials or unsafe provider payloads.
- No unrelated consumer-product behavior is changed.
- Relevant contract/operations documentation is updated.
- Existing project patterns are followed; no unnecessary framework, library, or abstraction is introduced.

#### Cursor Handoff

**Task:**  
Bootstrap Hub repository and local runtime

**Goal:**  
A clean checkout installs, type-checks, starts API/worker development entry points, and connects to local PostgreSQL through environment configuration.

**Relevant Context:**  
The Hub is an independent service with apps/api, apps/worker, apps/mock-erp and shared packages. PostgreSQL is the Hub database; Mock ERP is isolated and later uses SQLite.

**Implement:**
- Create the workspace structure from the Technical Design.
- Enable TypeScript strict mode across apps/packages.
- Add root build, lint, type-check, test and development scripts using existing project conventions.
- Add local PostgreSQL configuration and environment templates without real secrets.
- Create minimal API/worker entry points needed to prove workspace wiring.


**Do Not Implement:**
- Business endpoints.
- Database domain schema beyond a connectivity smoke test.
- Mock ERP behavior.
- Provider adapters.
- Cloud vendor selection.


**Interfaces / Contracts:**  
No external business API contract is introduced in this task.

**Expected Code Areas:**  
`apps/api/`, `apps/worker/`, `apps/mock-erp/`, `packages/`, `migrations/`, `tests/`

**Testing:**
- Workspace type-check smoke test.
- API and worker startup smoke tests.
- Local PostgreSQL connectivity smoke test.


**Definition of Done:**
- Meet all acceptance criteria above.
- Tests, type-check, and lint pass.
- Preserve contract compatibility.
- Avoid unrelated refactors and new dependencies.

**Dependencies:**  
Hard: None. Contract: None.

**Implementation Guidance:**  
Inspect the existing codebase first and follow existing project patterns. Avoid unrelated refactors or new dependencies unless required. Do not introduce new libraries, frameworks, abstractions, or architectural layers unless explicitly required by the Technical Design or necessary to complete this task.

### TASK-1.2: Define versioned shared contract package

**Type:** Backend

**Objective:**  
Establish the runtime-validated source of truth for Hub public contracts.

**Task Context:**  
The architecture explicitly includes packages/contracts and versioned HTTP/JSON contracts. It does not mandate OpenAPI or another generator.

**Implementation Goal:**  
packages/contracts exports a stable v1 namespace for shared scalars, cursor/pagination metadata, safe errors, and compatibility rules.

**Scope:**
- Create packages/contracts.
- Define runtime schemas/types for UUIDs, timestamps, cursors, canonical versions, currency/money serialization, request IDs, and safe errors.
- Define bounded list/page metadata.
- Create a v1 namespace.
- Document additive versus breaking contract-change rules.


**Out of Scope:**
- Entity DTOs; TASK-1.3.
- Concrete consumer authentication implementation.
- OpenAPI/code-generation tooling unless separately approved.


**Expected Code Areas:**
- `packages/contracts/`


**Inputs:**  
Technical Design contract requirements.

**Outputs:**  
Reusable runtime schemas and TypeScript types.

**API / Interface Contract:**  
packages/contracts is the initial contract source. Breaking public changes require a new version; additive backward-compatible fields may remain in v1.

**Error Cases / Edge Cases:**
- Invalid UUID/timestamp/cursor.
- Unbounded page size.
- Accidental breaking change inside v1.


**Implementation Constraints:**
- Contracts must be runtime-validatable.
- Do not add provider-specific fields.
- Do not introduce a second contract-management architecture without an approved decision.


**Testing Requirements:**
- Valid/invalid scalar schema tests.
- Safe-error serialization tests.
- Consumer import/compile smoke test.


**Acceptance Criteria:**
- v1 contracts are importable by apps/packages.
- Invalid common values fail validation.
- Safe errors contain no provider raw payload/credential fields.
- Versioning guidance is documented.


**Dependencies:**

**Hard Dependencies:**
- None


**Contract Dependencies:**
- None


**Can Run in Parallel With:**
- TASK-1.1
- TASK-2.1


**Definition of Done:**
- Implementation is complete for the stated scope.
- Required tests pass.
- Type-check and lint pass.
- Public interfaces match the agreed contract.
- Supported failure cases are handled without leaking credentials or unsafe provider payloads.
- No unrelated consumer-product behavior is changed.
- Relevant contract/operations documentation is updated.
- Existing project patterns are followed; no unnecessary framework, library, or abstraction is introduced.

#### Cursor Handoff

**Task:**  
Define versioned shared contract package

**Goal:**  
packages/contracts exports a stable v1 namespace for shared scalars, cursor/pagination metadata, safe errors, and compatibility rules.

**Relevant Context:**  
The architecture explicitly includes packages/contracts and versioned HTTP/JSON contracts. It does not mandate OpenAPI or another generator.

**Implement:**
- Create packages/contracts.
- Define runtime schemas/types for UUIDs, timestamps, cursors, canonical versions, currency/money serialization, request IDs, and safe errors.
- Define bounded list/page metadata.
- Create a v1 namespace.
- Document additive versus breaking contract-change rules.


**Do Not Implement:**
- Entity DTOs; TASK-1.3.
- Concrete consumer authentication implementation.
- OpenAPI/code-generation tooling unless separately approved.


**Interfaces / Contracts:**  
packages/contracts is the initial contract source. Breaking public changes require a new version; additive backward-compatible fields may remain in v1.

**Expected Code Areas:**  
`packages/contracts/`

**Testing:**
- Valid/invalid scalar schema tests.
- Safe-error serialization tests.
- Consumer import/compile smoke test.


**Definition of Done:**
- Meet all acceptance criteria above.
- Tests, type-check, and lint pass.
- Preserve contract compatibility.
- Avoid unrelated refactors and new dependencies.

**Dependencies:**  
Hard: None. Contract: None.

**Implementation Guidance:**  
Inspect the existing codebase first and follow existing project patterns. Avoid unrelated refactors or new dependencies unless required. Do not introduce new libraries, frameworks, abstractions, or architectural layers unless explicitly required by the Technical Design or necessary to complete this task.

### TASK-1.3: Define canonical data and outbound DTO contracts

**Type:** Backend

**Objective:**  
Define provider-neutral DTOs used by adapters, sync, outbound delivery, and consumers.

**Task Context:**  
The PRD requires canonical Customer, Product, CustomerAssortment, CustomerPrice, Financial, history, Order and Return contracts. Missing provider fields must not be guessed.

**Implementation Goal:**  
Runtime schemas/types exist for all required canonical entities, sync pages, change items, canonical Order/Return commands, and external document results.

**Scope:**
- Define Customer plus supported contacts/addresses.
- Define Product and UOM.
- Define CustomerAssortment as explicit Customer-to-Product active membership with canonical ID/version/source timestamps.
- Define CustomerPrice with exact decimal/currency representation.
- Define financial snapshot/open-document DTOs.
- Define supported external sales-document history DTOs.
- Define SyncPage<T> with cursor/high-water metadata.
- Define CanonicalSalesOrderCommand and CanonicalReturnCommand.
- Define ExternalDocumentResult with external document ID, safe error, and retryability.
- Define change-feed item contract.


**Out of Scope:**
- Heshbonit/Hashavshevet wire fields.
- B2B approval/payment logic.
- Sales order/return workflow.
- Unsupported optional fields without consumer evidence.


**Expected Code Areas:**
- `packages/contracts/`
- `packages/canonical-model/`


**Inputs:**  
Current consumer requirements and provider-neutral Technical Design interfaces.

**Outputs:**  
Canonical v1 DTOs usable by all Hub modules.

**API / Interface Contract:**  
Use ports named pullCustomers, pullProducts, pullCustomerAssortments, pullCustomerPrices, pullFinancials, pullSalesDocuments, createOrder and createReturn. All request/response schemas are runtime-validatable.

**Error Cases / Edge Cases:**
- Missing external identifier.
- Invalid decimal/currency.
- Null optional source data.
- Malformed cursor/page metadata.


**Implementation Constraints:**
- Keep provider-neutral.
- Do not encode consumer workflow states.
- Preserve source freshness.
- Do not use JavaScript floating point for money.


**Testing Requirements:**
- Schema tests with valid/invalid fixtures.
- Serialization round-trip tests for money, timestamps and cursors.
- B2B and Sales minimum-field fixture tests.


**Acceptance Criteria:**
- All current canonical entities have v1 schemas.
- Order/Return commands contain no provider-specific field.
- Invalid identifiers and money values are rejected.
- Freshness metadata is represented.


**Dependencies:**

**Hard Dependencies:**
- TASK-1.2


**Contract Dependencies:**
- None


**Can Run in Parallel With:**
- TASK-1.4
- TASK-2.2
- TASK-3.1


**Definition of Done:**
- Implementation is complete for the stated scope.
- Required tests pass.
- Type-check and lint pass.
- Public interfaces match the agreed contract.
- Supported failure cases are handled without leaking credentials or unsafe provider payloads.
- No unrelated consumer-product behavior is changed.
- Relevant contract/operations documentation is updated.
- Existing project patterns are followed; no unnecessary framework, library, or abstraction is introduced.

#### Cursor Handoff

**Task:**  
Define canonical data and outbound DTO contracts

**Goal:**  
Runtime schemas/types exist for all required canonical entities, sync pages, change items, canonical Order/Return commands, and external document results.

**Relevant Context:**  
The PRD requires canonical Customer, Product, CustomerAssortment, CustomerPrice, Financial, history, Order and Return contracts. Missing provider fields must not be guessed.

**Implement:**
- Define Customer plus supported contacts/addresses.
- Define Product and UOM.
- Define CustomerAssortment as explicit Customer-to-Product active membership with canonical ID/version/source timestamps.
- Define CustomerPrice with exact decimal/currency representation.
- Define financial snapshot/open-document DTOs.
- Define supported external sales-document history DTOs.
- Define SyncPage<T> with cursor/high-water metadata.
- Define CanonicalSalesOrderCommand and CanonicalReturnCommand.
- Define ExternalDocumentResult with external document ID, safe error, and retryability.
- Define change-feed item contract.


**Do Not Implement:**
- Heshbonit/Hashavshevet wire fields.
- B2B approval/payment logic.
- Sales order/return workflow.
- Unsupported optional fields without consumer evidence.


**Interfaces / Contracts:**  
Use ports named pullCustomers, pullProducts, pullCustomerAssortments, pullCustomerPrices, pullFinancials, pullSalesDocuments, createOrder and createReturn. All request/response schemas are runtime-validatable.

**Expected Code Areas:**  
`packages/contracts/`, `packages/canonical-model/`

**Testing:**
- Schema tests with valid/invalid fixtures.
- Serialization round-trip tests for money, timestamps and cursors.
- B2B and Sales minimum-field fixture tests.


**Definition of Done:**
- Meet all acceptance criteria above.
- Tests, type-check, and lint pass.
- Preserve contract compatibility.
- Avoid unrelated refactors and new dependencies.

**Dependencies:**  
Hard: TASK-1.2. Contract: None.

**Implementation Guidance:**  
Inspect the existing codebase first and follow existing project patterns. Avoid unrelated refactors or new dependencies unless required. Do not introduce new libraries, frameworks, abstractions, or architectural layers unless explicitly required by the Technical Design or necessary to complete this task.

### TASK-1.4: Define consumer context, binding, and authorization contract

**Type:** Backend

**Objective:**  
Define the trusted authorization context for all consumer requests.

**Task Context:**  
Consumer tenant references are mapping metadata, never authorization authority. The exact service credential mechanism is unresolved, but the context/scopes can be defined.

**Implementation Goal:**  
Request handlers can depend on ConsumerContext containing authenticated consumer, resolved binding/organization, and allowed scopes/capabilities.

**Scope:**
- Define ConsumerContext.
- Define binding-resolution interface.
- Define scope/capability naming for reads, sync trigger, outbound, and operations.
- Define bindingRef/consumerTenantRef handling without raw organization authority.
- Create B2B and Sales test consumer principals.


**Out of Scope:**
- Choosing mTLS/token/signing mechanism.
- End-user authentication.
- Provider credential authorization.


**Expected Code Areas:**
- `packages/security/`
- `packages/contracts/`
- `apps/api/`


**Inputs:**  
Authenticated service principal from future middleware plus binding reference and required scope.

**Outputs:**  
Resolved trusted ConsumerContext.

**API / Interface Contract:**  
Conceptual interface: resolveConsumerContext(principal, bindingRef, requiredScope) -> ConsumerContext. Credential verification is pluggable until Decision Required is resolved.

**Error Cases / Edge Cases:**
- Unknown/disabled consumer.
- Unknown/disabled binding.
- Binding belongs to another consumer.
- Missing scope.
- Raw organization ID supplied to widen access.


**Implementation Constraints:**
- Authorization is server-resolved.
- Consumer credentials remain separate from ERP credentials.
- Do not model B2B/Sales end-user permissions.


**Testing Requirements:**
- Binding resolution unit tests.
- Cross-consumer denial tests.
- Raw organization ID cannot widen scope.


**Acceptance Criteria:**
- Stable ConsumerContext exists.
- Disabled/unbound consumers are denied.
- B2B and Sales fixtures resolve only seeded bindings.


**Dependencies:**

**Hard Dependencies:**
- TASK-1.2


**Contract Dependencies:**
- None


**Can Run in Parallel With:**
- TASK-1.3
- TASK-2.1


**Definition of Done:**
- Implementation is complete for the stated scope.
- Required tests pass.
- Type-check and lint pass.
- Public interfaces match the agreed contract.
- Supported failure cases are handled without leaking credentials or unsafe provider payloads.
- No unrelated consumer-product behavior is changed.
- Relevant contract/operations documentation is updated.
- Existing project patterns are followed; no unnecessary framework, library, or abstraction is introduced.

#### Cursor Handoff

**Task:**  
Define consumer context, binding, and authorization contract

**Goal:**  
Request handlers can depend on ConsumerContext containing authenticated consumer, resolved binding/organization, and allowed scopes/capabilities.

**Relevant Context:**  
Consumer tenant references are mapping metadata, never authorization authority. The exact service credential mechanism is unresolved, but the context/scopes can be defined.

**Implement:**
- Define ConsumerContext.
- Define binding-resolution interface.
- Define scope/capability naming for reads, sync trigger, outbound, and operations.
- Define bindingRef/consumerTenantRef handling without raw organization authority.
- Create B2B and Sales test consumer principals.


**Do Not Implement:**
- Choosing mTLS/token/signing mechanism.
- End-user authentication.
- Provider credential authorization.


**Interfaces / Contracts:**  
Conceptual interface: resolveConsumerContext(principal, bindingRef, requiredScope) -> ConsumerContext. Credential verification is pluggable until Decision Required is resolved.

**Expected Code Areas:**  
`packages/security/`, `packages/contracts/`, `apps/api/`

**Testing:**
- Binding resolution unit tests.
- Cross-consumer denial tests.
- Raw organization ID cannot widen scope.


**Definition of Done:**
- Meet all acceptance criteria above.
- Tests, type-check, and lint pass.
- Preserve contract compatibility.
- Avoid unrelated refactors and new dependencies.

**Dependencies:**  
Hard: TASK-1.2. Contract: None.

**Implementation Guidance:**  
Inspect the existing codebase first and follow existing project patterns. Avoid unrelated refactors or new dependencies unless required. Do not introduce new libraries, frameworks, abstractions, or architectural layers unless explicitly required by the Technical Design or necessary to complete this task.

## EPIC-2: Persistence, Isolation, and Secrets

**Goal:**  
Create PostgreSQL persistence, organization boundaries, and encrypted credential handling.

**Depends on:**  
EPIC-1 contract baseline.

### TASK-2.1: Create organization, consumer, binding, and connection schema

**Type:** Database

**Objective:**  
Persist Hub identity, consumer bindings, provider connections, and capabilities.

**Task Context:**  
Hub organization_id is independent from consumer tenant IDs. Integration credentials/configuration belong to organization-scoped connections.

**Implementation Goal:**  
Versioned migrations create organizations, consumers, bindings, integration_connections, and connection_capabilities with required integrity.

**Scope:**
- Create all identity/config tables from Technical Design section 3.
- Add uniqueness and foreign-key constraints.
- Represent scopes using the approved project pattern.
- Seed two organizations plus B2B and Sales consumer bindings with non-secret development data.


**Out of Scope:**
- Canonical data tables.
- Sync/outbound tables.
- Production provider credentials.
- Admin APIs.


**Expected Code Areas:**
- `migrations/`
- `packages/db/`


**Inputs:**  
Repository migration runner and schema conventions.

**Outputs:**  
Rebuildable identity/configuration schema.

**API / Interface Contract:**  
Enforce unique consumer keys, unique (consumer_id, consumer_tenant_ref), and unique (organization_id, connection_key).

**Error Cases / Edge Cases:**
- Duplicate binding reference.
- Cross-organization connection relation.
- Invalid status.
- Plaintext secret fixture.


**Implementation Constraints:**
- Every organization-owned row carries organization_id.
- Use DB constraints, not application checks alone.
- Do not store plaintext provider credentials.


**Testing Requirements:**
- Migration-from-zero.
- Duplicate constraint tests.
- Two-organization FK/isolation tests.


**Acceptance Criteria:**
- Fresh DB rebuild succeeds.
- Seed is deterministic.
- Duplicate binding/connection keys fail.
- No plaintext provider secret is stored.


**Dependencies:**

**Hard Dependencies:**
- TASK-1.1


**Contract Dependencies:**
- TASK-1.4


**Can Run in Parallel With:**
- TASK-2.2
- TASK-2.3
- TASK-2.4


**Definition of Done:**
- Implementation is complete for the stated scope.
- Required tests pass.
- Type-check and lint pass.
- Public interfaces match the agreed contract.
- Supported failure cases are handled without leaking credentials or unsafe provider payloads.
- No unrelated consumer-product behavior is changed.
- Relevant contract/operations documentation is updated.
- Existing project patterns are followed; no unnecessary framework, library, or abstraction is introduced.

#### Cursor Handoff

**Task:**  
Create organization, consumer, binding, and connection schema

**Goal:**  
Versioned migrations create organizations, consumers, bindings, integration_connections, and connection_capabilities with required integrity.

**Relevant Context:**  
Hub organization_id is independent from consumer tenant IDs. Integration credentials/configuration belong to organization-scoped connections.

**Implement:**
- Create all identity/config tables from Technical Design section 3.
- Add uniqueness and foreign-key constraints.
- Represent scopes using the approved project pattern.
- Seed two organizations plus B2B and Sales consumer bindings with non-secret development data.


**Do Not Implement:**
- Canonical data tables.
- Sync/outbound tables.
- Production provider credentials.
- Admin APIs.


**Interfaces / Contracts:**  
Enforce unique consumer keys, unique (consumer_id, consumer_tenant_ref), and unique (organization_id, connection_key).

**Expected Code Areas:**  
`migrations/`, `packages/db/`

**Testing:**
- Migration-from-zero.
- Duplicate constraint tests.
- Two-organization FK/isolation tests.


**Definition of Done:**
- Meet all acceptance criteria above.
- Tests, type-check, and lint pass.
- Preserve contract compatibility.
- Avoid unrelated refactors and new dependencies.

**Dependencies:**  
Hard: TASK-1.1. Contract: TASK-1.4.

**Implementation Guidance:**  
Inspect the existing codebase first and follow existing project patterns. Avoid unrelated refactors or new dependencies unless required. Do not introduce new libraries, frameworks, abstractions, or architectural layers unless explicitly required by the Technical Design or necessary to complete this task.

### TASK-2.2: Create canonical data schema and repositories

**Type:** Database

**Objective:**  
Persist provider-neutral external-system facts required by current consumers.

**Task Context:**  
Canonical rows include organization/source identity, external ID, source freshness, hub_version, last_synced_at, payload hash and active state where relevant.

**Implementation Goal:**  
Customer/contact/address, Product/UOM, CustomerAssortment, CustomerPrice, Financial and supported historical-document repositories support idempotent organization-scoped upserts and reads.

**Scope:**
- Create canonical tables from Technical Design section 4.
- Add CustomerAssortment with organization/customer/product/source uniqueness, active state, canonical metadata and tenant-safe relationships.
- Add organization-safe uniqueness and composite relationships.
- Use numeric(18,4) for customer price as specified; price presence/absence MUST NOT be used as assortment membership.
- Implement upsert-by-stable-external-key and organization-scoped reads.
- Increment hub_version when canonical content actually changes using the approved comparison strategy.


**Out of Scope:**
- Sync orchestration.
- Change-feed HTTP endpoint.
- Consumer-owned business tables.


**Expected Code Areas:**
- `migrations/`
- `packages/db/`
- `packages/canonical-model/`


**Inputs:**  
Validated canonical DTOs.

**Outputs:**  
Stable canonical rows and repositories.

**API / Interface Contract:**  
Repository methods require trusted organizationId and canonical DTOs; no repository method treats a consumer-supplied organization ID as authorization.

**Error Cases / Edge Cases:**
- Same external ID across organizations.
- Cross-org relation.
- Missing source timestamp.
- Deactivated record, including CustomerAssortment deactivate/reactivate ordering.
- Price row exists without active assortment membership.
- Decimal overflow.


**Implementation Constraints:**
- Provider-neutral schema.
- DB constraints prevent cross-org relations.
- Do not delete rows just because a full-sync page omitted them.


**Testing Requirements:**
- Idempotent upsert DB tests.
- CustomerAssortment membership/deactivation and assortment-vs-price independence tests.
- Same external ID in separate orgs.
- Cross-org relationship rejection.
- Money precision tests.


**Acceptance Criteria:**
- Canonical tables rebuild from migrations.
- CustomerAssortment is persisted as a first-class relation independent from CustomerPrice.
- Repeated identical upsert converges.
- Cross-org references fail.
- Money is preserved exactly.


**Dependencies:**

**Hard Dependencies:**
- TASK-2.1


**Contract Dependencies:**
- TASK-1.3


**Can Run in Parallel With:**
- TASK-2.3
- TASK-2.4
- TASK-3.1


**Definition of Done:**
- Implementation is complete for the stated scope.
- Required tests pass.
- Type-check and lint pass.
- Public interfaces match the agreed contract.
- Supported failure cases are handled without leaking credentials or unsafe provider payloads.
- No unrelated consumer-product behavior is changed.
- Relevant contract/operations documentation is updated.
- Existing project patterns are followed; no unnecessary framework, library, or abstraction is introduced.

#### Cursor Handoff

**Task:**  
Create canonical data schema and repositories

**Goal:**  
Customer/contact/address, Product/UOM, CustomerAssortment, CustomerPrice, Financial and supported historical-document repositories support idempotent organization-scoped upserts and reads.

**Relevant Context:**  
Canonical rows include organization/source identity, external ID, source freshness, hub_version, last_synced_at, payload hash and active state where relevant.

**Implement:**
- Create canonical tables from Technical Design section 4.
- Add CustomerAssortment with organization/customer/product/source uniqueness, active state, canonical metadata and tenant-safe relationships.
- Add organization-safe uniqueness and composite relationships.
- Use numeric(18,4) for customer price as specified; price presence/absence MUST NOT be used as assortment membership.
- Implement upsert-by-stable-external-key and organization-scoped reads.
- Increment hub_version when canonical content actually changes using the approved comparison strategy.


**Do Not Implement:**
- Sync orchestration.
- Change-feed HTTP endpoint.
- Consumer-owned business tables.


**Interfaces / Contracts:**  
Repository methods require trusted organizationId and canonical DTOs; no repository method treats a consumer-supplied organization ID as authorization.

**Expected Code Areas:**  
`migrations/`, `packages/db/`, `packages/canonical-model/`

**Testing:**
- Idempotent upsert DB tests.
- CustomerAssortment membership/deactivation and assortment-vs-price independence tests.
- Same external ID in separate orgs.
- Cross-org relationship rejection.
- Money precision tests.


**Definition of Done:**
- Meet all acceptance criteria above.
- Tests, type-check, and lint pass.
- Preserve contract compatibility.
- Avoid unrelated refactors and new dependencies.

**Dependencies:**  
Hard: TASK-2.1. Contract: TASK-1.3.

**Implementation Guidance:**  
Inspect the existing codebase first and follow existing project patterns. Avoid unrelated refactors or new dependencies unless required. Do not introduce new libraries, frameworks, abstractions, or architectural layers unless explicitly required by the Technical Design or necessary to complete this task.

### TASK-2.3: Create sync, checkpoint, error, and change-event persistence

**Type:** Database

**Objective:**  
Persist sync policies/runs/checkpoints/errors and ordered change events.

**Task Context:**  
Scheduled and on-demand runs share one engine. Checkpoints advance only after canonical changes commit. Consumers replay ordered changes using their own cursor.

**Implementation Goal:**  
Database repositories support run lifecycle, checkpoints, safe errors, locking, and monotonically ordered change delivery.

**Scope:**
- Create sync_policies, sync_runs, sync_checkpoints, sync_errors, change_events.
- Add indexes for organization/connection/capability active-run access.
- Implement run lifecycle repository.
- Implement checkpoint repository.
- Append change events within canonical transactions.
- Implement ordered cursor queries.


**Out of Scope:**
- Sync engine.
- Scheduler.
- Public change-feed endpoint.


**Expected Code Areas:**
- `migrations/`
- `packages/db/`
- `packages/change-feed/`
- `packages/sync-engine/`


**Inputs:**  
Organization, connection, capability, canonical entity changes.

**Outputs:**  
Durable runs/checkpoints/errors and ordered change events.

**API / Interface Contract:**  
change_events contains identity sequence, organization_id, entity_type, entity_id, operation, canonical_version, committed_at.

**Error Cases / Edge Cases:**
- Rollback after page processing.
- Duplicate checkpoint.
- Partial run.
- Very large requested change page.


**Implementation Constraints:**
- Checkpoint update follows committed data only.
- Change events are append-only.
- Org-scoped queries never cross organizations.


**Testing Requirements:**
- Rollback leaves checkpoint unchanged.
- Cursor ordering/replay tests.
- Run state transition tests.
- Two-org isolation.


**Acceptance Criteria:**
- Schema matches Technical Design.
- Checkpoint does not advance on rollback.
- Sequence is monotonic.
- Cross-org events are inaccessible.


**Dependencies:**

**Hard Dependencies:**
- TASK-2.1


**Contract Dependencies:**
- TASK-1.3


**Can Run in Parallel With:**
- TASK-2.2
- TASK-2.4


**Definition of Done:**
- Implementation is complete for the stated scope.
- Required tests pass.
- Type-check and lint pass.
- Public interfaces match the agreed contract.
- Supported failure cases are handled without leaking credentials or unsafe provider payloads.
- No unrelated consumer-product behavior is changed.
- Relevant contract/operations documentation is updated.
- Existing project patterns are followed; no unnecessary framework, library, or abstraction is introduced.

#### Cursor Handoff

**Task:**  
Create sync, checkpoint, error, and change-event persistence

**Goal:**  
Database repositories support run lifecycle, checkpoints, safe errors, locking, and monotonically ordered change delivery.

**Relevant Context:**  
Scheduled and on-demand runs share one engine. Checkpoints advance only after canonical changes commit. Consumers replay ordered changes using their own cursor.

**Implement:**
- Create sync_policies, sync_runs, sync_checkpoints, sync_errors, change_events.
- Add indexes for organization/connection/capability active-run access.
- Implement run lifecycle repository.
- Implement checkpoint repository.
- Append change events within canonical transactions.
- Implement ordered cursor queries.


**Do Not Implement:**
- Sync engine.
- Scheduler.
- Public change-feed endpoint.


**Interfaces / Contracts:**  
change_events contains identity sequence, organization_id, entity_type, entity_id, operation, canonical_version, committed_at.

**Expected Code Areas:**  
`migrations/`, `packages/db/`, `packages/change-feed/`, `packages/sync-engine/`

**Testing:**
- Rollback leaves checkpoint unchanged.
- Cursor ordering/replay tests.
- Run state transition tests.
- Two-org isolation.


**Definition of Done:**
- Meet all acceptance criteria above.
- Tests, type-check, and lint pass.
- Preserve contract compatibility.
- Avoid unrelated refactors and new dependencies.

**Dependencies:**  
Hard: TASK-2.1. Contract: TASK-1.3.

**Implementation Guidance:**  
Inspect the existing codebase first and follow existing project patterns. Avoid unrelated refactors or new dependencies unless required. Do not introduce new libraries, frameworks, abstractions, or architectural layers unless explicitly required by the Technical Design or necessary to complete this task.

### TASK-2.4: Create outbound command and attempt persistence

**Type:** Database

**Objective:**  
Persist outbound work before provider effects and support stable retries.

**Task Context:**  
Commands are durably accepted before provider calls. Uniqueness is by consumer command reference and logical idempotency key.

**Implementation Goal:**  
outbound_commands/outbound_attempts support accept/find, leasing, retry scheduling, status history and external document identity.

**Scope:**
- Create tables/indexes from Technical Design section 9.
- Enforce unique (organization_id, consumer_id, consumer_command_ref).
- Enforce unique (organization_id, capability_key, idempotency_key).
- Implement accept/find and FOR UPDATE SKIP LOCKED lease operations.
- Implement attempt creation/result update/retry schedule.
- Persist only redacted snapshots.


**Out of Scope:**
- HTTP acceptance routes.
- Provider calls.
- Consumer state mutation.


**Expected Code Areas:**
- `migrations/`
- `packages/db/`
- `packages/outbound/`


**Inputs:**  
Trusted organization/consumer context and validated canonical command.

**Outputs:**  
Durable command/attempt rows and leasing primitives.

**API / Interface Contract:**  
Command states accepted|pending|processing|succeeded|failed|cancelled; attempts processing|succeeded|failed.

**Error Cases / Edge Cases:**
- Duplicate exact command.
- Same key with conflicting payload.
- Lease contention.
- Retryable/permanent failure.


**Implementation Constraints:**
- Persistence precedes provider call.
- Retries reuse the same idempotency key.
- Do not mutate product Order/Payment/Return state.


**Testing Requirements:**
- Duplicate acceptance.
- Concurrent lease.
- Attempt numbering.
- Snapshot sanitization.


**Acceptance Criteria:**
- Exact replay is deterministic.
- Only one worker lease processes a command.
- Retry schedule persists.
- External document ID can be stored.


**Dependencies:**

**Hard Dependencies:**
- TASK-2.1


**Contract Dependencies:**
- TASK-1.3


**Can Run in Parallel With:**
- TASK-2.2
- TASK-2.3


**Definition of Done:**
- Implementation is complete for the stated scope.
- Required tests pass.
- Type-check and lint pass.
- Public interfaces match the agreed contract.
- Supported failure cases are handled without leaking credentials or unsafe provider payloads.
- No unrelated consumer-product behavior is changed.
- Relevant contract/operations documentation is updated.
- Existing project patterns are followed; no unnecessary framework, library, or abstraction is introduced.

#### Cursor Handoff

**Task:**  
Create outbound command and attempt persistence

**Goal:**  
outbound_commands/outbound_attempts support accept/find, leasing, retry scheduling, status history and external document identity.

**Relevant Context:**  
Commands are durably accepted before provider calls. Uniqueness is by consumer command reference and logical idempotency key.

**Implement:**
- Create tables/indexes from Technical Design section 9.
- Enforce unique (organization_id, consumer_id, consumer_command_ref).
- Enforce unique (organization_id, capability_key, idempotency_key).
- Implement accept/find and FOR UPDATE SKIP LOCKED lease operations.
- Implement attempt creation/result update/retry schedule.
- Persist only redacted snapshots.


**Do Not Implement:**
- HTTP acceptance routes.
- Provider calls.
- Consumer state mutation.


**Interfaces / Contracts:**  
Command states accepted|pending|processing|succeeded|failed|cancelled; attempts processing|succeeded|failed.

**Expected Code Areas:**  
`migrations/`, `packages/db/`, `packages/outbound/`

**Testing:**
- Duplicate acceptance.
- Concurrent lease.
- Attempt numbering.
- Snapshot sanitization.


**Definition of Done:**
- Meet all acceptance criteria above.
- Tests, type-check, and lint pass.
- Preserve contract compatibility.
- Avoid unrelated refactors and new dependencies.

**Dependencies:**  
Hard: TASK-2.1. Contract: TASK-1.3.

**Implementation Guidance:**  
Inspect the existing codebase first and follow existing project patterns. Avoid unrelated refactors or new dependencies unless required. Do not introduce new libraries, frameworks, abstractions, or architectural layers unless explicitly required by the Technical Design or necessary to complete this task.

### TASK-2.5: Implement credential encryption and organization isolation

**Type:** Backend

**Objective:**  
Protect provider credentials and enforce least-privilege organization boundaries.

**Task Context:**  
Provider credentials are encrypted application-side and never returned. Concrete KMS and whether RLS is a release requirement are unresolved decisions.

**Implementation Goal:**  
Secrets are encapsulated behind a version-aware vault interface; runtime data access is organization-scoped and least privilege; RLS status is explicit.

**Scope:**
- Define credential vault interface with key versioning.
- Wire approved local-development encryption mechanism after decision.
- Ensure serializers never expose encrypted/plain credentials.
- Apply least-privilege DB roles/grants.
- Add organization isolation guardrails and RLS policies if approved.
- Create two-org security test helpers.


**Out of Scope:**
- Choosing production KMS vendor without approval.
- Consumer authentication transport.
- Provider mapping.


**Expected Code Areas:**
- `packages/security/`
- `packages/db/`
- `migrations/`
- `tests/security/`


**Inputs:**  
Provider credential at configuration time, external key reference, trusted organization context.

**Outputs:**  
Encrypted credential storage and server-only decryption for adapter construction.

**API / Interface Contract:**  
CredentialVault encrypt/decrypt operations with credential_key_version metadata. No public API returns secret material.

**Error Cases / Edge Cases:**
- Missing key.
- Unknown key version.
- Decrypt failure.
- Cross-org connection read.
- Secret in logs.


**Implementation Constraints:**
- Never hardcode production keys.
- Never log secrets.
- RLS implementation must match explicit decision; do not silently claim it.


**Testing Requirements:**
- Encrypt/decrypt tests.
- Key-version tests.
- Cross-org access tests.
- Log redaction.
- RLS tests if enabled.


**Acceptance Criteria:**
- No plaintext credential at rest.
- Unauthorized org access fails.
- Secrets absent from responses/logs.
- Least-privilege grants documented and tested.


**Dependencies:**

**Hard Dependencies:**
- TASK-2.1


**Contract Dependencies:**
- TASK-1.4


**Can Run in Parallel With:**
- TASK-3.1
- TASK-4.1


**Definition of Done:**
- Implementation is complete for the stated scope.
- Required tests pass.
- Type-check and lint pass.
- Public interfaces match the agreed contract.
- Supported failure cases are handled without leaking credentials or unsafe provider payloads.
- No unrelated consumer-product behavior is changed.
- Relevant contract/operations documentation is updated.
- Existing project patterns are followed; no unnecessary framework, library, or abstraction is introduced.

#### Cursor Handoff

**Task:**  
Implement credential encryption and organization isolation

**Goal:**  
Secrets are encapsulated behind a version-aware vault interface; runtime data access is organization-scoped and least privilege; RLS status is explicit.

**Relevant Context:**  
Provider credentials are encrypted application-side and never returned. Concrete KMS and whether RLS is a release requirement are unresolved decisions.

**Implement:**
- Define credential vault interface with key versioning.
- Wire approved local-development encryption mechanism after decision.
- Ensure serializers never expose encrypted/plain credentials.
- Apply least-privilege DB roles/grants.
- Add organization isolation guardrails and RLS policies if approved.
- Create two-org security test helpers.


**Do Not Implement:**
- Choosing production KMS vendor without approval.
- Consumer authentication transport.
- Provider mapping.


**Interfaces / Contracts:**  
CredentialVault encrypt/decrypt operations with credential_key_version metadata. No public API returns secret material.

**Expected Code Areas:**  
`packages/security/`, `packages/db/`, `migrations/`, `tests/security/`

**Testing:**
- Encrypt/decrypt tests.
- Key-version tests.
- Cross-org access tests.
- Log redaction.
- RLS tests if enabled.


**Definition of Done:**
- Meet all acceptance criteria above.
- Tests, type-check, and lint pass.
- Preserve contract compatibility.
- Avoid unrelated refactors and new dependencies.

**Dependencies:**  
Hard: TASK-2.1. Contract: TASK-1.4.

**Implementation Guidance:**  
Inspect the existing codebase first and follow existing project patterns. Avoid unrelated refactors or new dependencies unless required. Do not introduce new libraries, frameworks, abstractions, or architectural layers unless explicitly required by the Technical Design or necessary to complete this task.

## EPIC-3: ERP Abstraction and Test Infrastructure

**Goal:**  
Implement provider-neutral ports, including an explicit CustomerAssortment capability, plus deterministic Fake and HTTP/SQLite Mock ERP infrastructure.

**Depends on:**  
EPIC-1 contracts and repository bootstrap.

### TASK-3.1: Implement capability-based ERP ports and adapter registry

**Type:** Integration

**Objective:**  
Create the provider-neutral boundary used by sync and outbound engines.

**Task Context:**  
Core packages depend only on small capability ports. MVP resolves one active configured connection per organization/capability; cross-provider composition is deferred.

**Implementation Goal:**  
Required ports exist and registry resolves an adapter from trusted organization/capability configuration.

**Scope:**
- Implement CustomerPort, CatalogPort, AssortmentPort, PricingPort, FinancialPort, HistoryPort, SalesOrderPort, ReturnPort.
- Define IntegrationContext.
- Implement adapter registration by provider key.
- Resolve one enabled connection for an organization/capability.
- Fail early on unsupported/disabled capability.


**Out of Scope:**
- Real provider mapping.
- Future cross-provider composition.
- Consumer business rules.


**Expected Code Areas:**
- `packages/integrations/erp/ports/`
- `packages/integrations/erp/registry/`


**Inputs:**  
Trusted organization/capability plus persisted connection config.

**Outputs:**  
Resolved adapter capability.

**API / Interface Contract:**  
Ports use TASK-1.3 canonical types only.

**Error Cases / Edge Cases:**
- No connection.
- Connection disabled.
- Capability disabled.
- Provider key unregistered.
- Credential retrieval failure.


**Implementation Constraints:**
- Core canonical/sync/outbound code must not import provider modules.
- No branching on Nofar/B2B/Sales/provider in core.
- No cross-provider composition.


**Testing Requirements:**
- Registry resolution.
- Disabled/unsupported capability.
- Dependency-boundary/import check.


**Acceptance Criteria:**
- All ports compile against canonical contracts.
- Registry resolves seeded configuration.
- Unsupported capability fails before provider call.
- No provider-specific branch exists in core.


**Dependencies:**

**Hard Dependencies:**
- TASK-1.3
- TASK-2.1


**Contract Dependencies:**
- None


**Can Run in Parallel With:**
- TASK-3.2
- TASK-3.3
- TASK-4.1


**Definition of Done:**
- Implementation is complete for the stated scope.
- Required tests pass.
- Type-check and lint pass.
- Public interfaces match the agreed contract.
- Supported failure cases are handled without leaking credentials or unsafe provider payloads.
- No unrelated consumer-product behavior is changed.
- Relevant contract/operations documentation is updated.
- Existing project patterns are followed; no unnecessary framework, library, or abstraction is introduced.

#### Cursor Handoff

**Task:**  
Implement capability-based ERP ports and adapter registry

**Goal:**  
Required ports exist and registry resolves an adapter from trusted organization/capability configuration.

**Relevant Context:**  
Core packages depend only on small capability ports. MVP resolves one active configured connection per organization/capability; cross-provider composition is deferred.

**Implement:**
- Implement CustomerPort, CatalogPort, AssortmentPort, PricingPort, FinancialPort, HistoryPort, SalesOrderPort, ReturnPort.
- Define IntegrationContext.
- Implement adapter registration by provider key.
- Resolve one enabled connection for an organization/capability.
- Fail early on unsupported/disabled capability.


**Do Not Implement:**
- Real provider mapping.
- Future cross-provider composition.
- Consumer business rules.


**Interfaces / Contracts:**  
Ports use TASK-1.3 canonical types only.

**Expected Code Areas:**  
`packages/integrations/erp/ports/`, `packages/integrations/erp/registry/`

**Testing:**
- Registry resolution.
- Disabled/unsupported capability.
- Dependency-boundary/import check.


**Definition of Done:**
- Meet all acceptance criteria above.
- Tests, type-check, and lint pass.
- Preserve contract compatibility.
- Avoid unrelated refactors and new dependencies.

**Dependencies:**  
Hard: TASK-1.3, TASK-2.1. Contract: None.

**Implementation Guidance:**  
Inspect the existing codebase first and follow existing project patterns. Avoid unrelated refactors or new dependencies unless required. Do not introduce new libraries, frameworks, abstractions, or architectural layers unless explicitly required by the Technical Design or necessary to complete this task.

### TASK-3.2: Implement in-process Fake ERP adapter

**Type:** Testing

**Objective:**  
Provide deterministic fast test behavior with no HTTP/database.

**Task Context:**  
The Fake supports programmable success, timeout, retryable and non-retryable failure and may capture calls in memory.

**Implementation Goal:**  
Tests can configure inbound pages and outbound outcomes for every supported generic port.

**Scope:**
- Implement in-memory inbound fixtures for all supported inbound ports, including CustomerAssortment independently from CustomerPrice.
- Provide two-customer assortment fixtures plus in-assortment/no-price and out-of-assortment/price-present cases.
- Implement paging/cursors.
- Implement outbound success, retryable failure, permanent failure and timeout.
- Capture commands/idempotency keys.
- Expose reset/config helpers only from testing package.


**Out of Scope:**
- HTTP behavior.
- SQLite.
- Production registration.
- Provider wire mapping.


**Expected Code Areas:**
- `packages/testing/fake-erp/`


**Inputs:**  
Test fixture configuration and canonical calls.

**Outputs:**  
Deterministic port results and captured history.

**API / Interface Contract:**  
Implements TASK-3.1 ports.

**Error Cases / Edge Cases:**
- Empty page.
- Assortment deactivate/reactivate and independent price fixture.
- Repeated cursor.
- Null optional field.
- Timeout.
- Repeated idempotency key.


**Implementation Constraints:**
- Testing-only.
- No network/database.
- Must not be enabled in production.


**Testing Requirements:**
- Every outcome mode.
- CustomerAssortment membership and assortment-vs-price independence.
- Paging/cursor.
- Captured idempotency key.


**Acceptance Criteria:**
- Fake conforms to ports, including AssortmentPort.
- CustomerAssortment and CustomerPrice fixtures can vary independently.
- All required outcomes configurable.
- Reset prevents cross-test state.


**Dependencies:**

**Hard Dependencies:**
- TASK-3.1


**Contract Dependencies:**
- None


**Can Run in Parallel With:**
- TASK-3.3
- TASK-4.1


**Definition of Done:**
- Implementation is complete for the stated scope.
- Required tests pass.
- Type-check and lint pass.
- Public interfaces match the agreed contract.
- Supported failure cases are handled without leaking credentials or unsafe provider payloads.
- No unrelated consumer-product behavior is changed.
- Relevant contract/operations documentation is updated.
- Existing project patterns are followed; no unnecessary framework, library, or abstraction is introduced.

#### Cursor Handoff

**Task:**  
Implement in-process Fake ERP adapter

**Goal:**  
Tests can configure inbound pages and outbound outcomes for every supported generic port.

**Relevant Context:**  
The Fake supports programmable success, timeout, retryable and non-retryable failure and may capture calls in memory.

**Implement:**
- Implement in-memory inbound fixtures for all supported inbound ports, including CustomerAssortment independently from CustomerPrice.
- Provide two-customer assortment fixtures plus in-assortment/no-price and out-of-assortment/price-present cases.
- Implement paging/cursors.
- Implement outbound success, retryable failure, permanent failure and timeout.
- Capture commands/idempotency keys.
- Expose reset/config helpers only from testing package.


**Do Not Implement:**
- HTTP behavior.
- SQLite.
- Production registration.
- Provider wire mapping.


**Interfaces / Contracts:**  
Implements TASK-3.1 ports.

**Expected Code Areas:**  
`packages/testing/fake-erp/`

**Testing:**
- Every outcome mode.
- CustomerAssortment membership and assortment-vs-price independence.
- Paging/cursor.
- Captured idempotency key.


**Definition of Done:**
- Meet all acceptance criteria above.
- Tests, type-check, and lint pass.
- Preserve contract compatibility.
- Avoid unrelated refactors and new dependencies.

**Dependencies:**  
Hard: TASK-3.1. Contract: None.

**Implementation Guidance:**  
Inspect the existing codebase first and follow existing project patterns. Avoid unrelated refactors or new dependencies unless required. Do not introduce new libraries, frameworks, abstractions, or architectural layers unless explicitly required by the Technical Design or necessary to complete this task.

### TASK-3.3: Implement standalone Mock ERP HTTP/SQLite service

**Type:** Full-stack

**Objective:**  
Provide a real external-process simulator for transport, mapping and idempotency tests.

**Task Context:**  
Mock ERP is dev/test only, has its own SQLite wire model, multiple simulated companies, deterministic seed/reset, CustomerAssortment fixtures independent from Prices, Orders/Returns, latency/failure modes and mandatory timeout_after_persist.

**Implementation Goal:**  
apps/mock-erp exposes deterministic HTTP source/write APIs backed by SQLite and safe test-control endpoints.

**Scope:**
- Create SQLite schema/migrations/seed for companies, customers, products, customer_assortments, prices, financials, orders, returns, simulation settings.
- Seed at least two customers with different assortments and an incidental price row for an out-of-assortment product to prove independence.
- Implement paged source APIs.
- Implement idempotent Order/Return creation.
- Implement test-only reset/seed/simulation routes.
- Support latency, 4xx/5xx, business rejection, fail-next-N, timeout-before-persist and timeout-after-persist.
- Reject production enablement.


**Out of Scope:**
- Hub PostgreSQL access.
- Real provider mapping.
- Polished UI; TASK-3.4 covers minimal UI.


**Expected Code Areas:**
- `apps/mock-erp/`
- `packages/integrations/erp/adapters/mock/`


**Inputs:**  
HTTP calls from Mock adapter and test controls.

**Outputs:**  
External HTTP behavior plus durable simulated SQLite state.

**API / Interface Contract:**  
Order/Return create accepts stable idempotency key; replay returns same external document identity.

**Error Cases / Edge Cases:**
- Conflicting reuse of key.
- Unknown company.
- Malformed cursor.
- Test-control call outside test/dev.
- Timeout after persist.


**Implementation Constraints:**
- Never share Hub DB.
- Keep wire schema separate from canonical schema.
- Production config must reject Mock.


**Testing Requirements:**
- Real HTTP integration.
- Seed/reset reproducibility.
- Idempotent create.
- Timeout-after-persist one-document test.
- Two-company isolation.


**Acceptance Criteria:**
- Mock starts independently.
- Source data pages over HTTP, including CustomerAssortment pages independent from Prices.
- Orders/Returns persist.
- Timeout-after-persist replay yields same external document.
- Test controls unavailable outside test/dev.


**Dependencies:**

**Hard Dependencies:**
- TASK-1.1
- TASK-1.3


**Contract Dependencies:**
- TASK-3.1


**Can Run in Parallel With:**
- TASK-3.2
- TASK-4.1


**Definition of Done:**
- Implementation is complete for the stated scope.
- Required tests pass.
- Type-check and lint pass.
- Public interfaces match the agreed contract.
- Supported failure cases are handled without leaking credentials or unsafe provider payloads.
- No unrelated consumer-product behavior is changed.
- Relevant contract/operations documentation is updated.
- Existing project patterns are followed; no unnecessary framework, library, or abstraction is introduced.

#### Cursor Handoff

**Task:**  
Implement standalone Mock ERP HTTP/SQLite service

**Goal:**  
apps/mock-erp exposes deterministic HTTP source/write APIs backed by SQLite and safe test-control endpoints.

**Relevant Context:**  
Mock ERP is dev/test only, has its own SQLite wire model, multiple simulated companies, deterministic seed/reset, CustomerAssortment fixtures independent from Prices, Orders/Returns, latency/failure modes and mandatory timeout_after_persist.

**Implement:**
- Create SQLite schema/migrations/seed for companies, customers, products, customer_assortments, prices, financials, orders, returns, simulation settings.
- Seed at least two customers with different assortments and an incidental price row for an out-of-assortment product to prove independence.
- Implement paged source APIs.
- Implement idempotent Order/Return creation.
- Implement test-only reset/seed/simulation routes.
- Support latency, 4xx/5xx, business rejection, fail-next-N, timeout-before-persist and timeout-after-persist.
- Reject production enablement.


**Do Not Implement:**
- Hub PostgreSQL access.
- Real provider mapping.
- Polished UI; TASK-3.4 covers minimal UI.


**Interfaces / Contracts:**  
Order/Return create accepts stable idempotency key; replay returns same external document identity.

**Expected Code Areas:**  
`apps/mock-erp/`, `packages/integrations/erp/adapters/mock/`

**Testing:**
- Real HTTP integration.
- Seed/reset reproducibility.
- Idempotent create.
- Timeout-after-persist one-document test.
- Two-company isolation.


**Definition of Done:**
- Meet all acceptance criteria above.
- Tests, type-check, and lint pass.
- Preserve contract compatibility.
- Avoid unrelated refactors and new dependencies.

**Dependencies:**  
Hard: TASK-1.1, TASK-1.3. Contract: TASK-3.1.

**Implementation Guidance:**  
Inspect the existing codebase first and follow existing project patterns. Avoid unrelated refactors or new dependencies unless required. Do not introduce new libraries, frameworks, abstractions, or architectural layers unless explicitly required by the Technical Design or necessary to complete this task.

### TASK-3.4: Implement minimal Mock ERP developer UI

**Type:** Frontend

**Objective:**  
Allow developers to inspect/reset simulated ERP state and set failure modes.

**Task Context:**  
The required UI is minimal and developer-only, not a customer product.

**Implementation Goal:**  
Developer can inspect source data and received documents, reset/reseed, and configure next-request failure/latency without direct SQLite access.

**Scope:**
- Create status/company view.
- Create Customers/Products/Prices/Financial fixture views.
- Create Orders/Returns inspection.
- Add reset/reseed controls.
- Add simulation behavior/delay controls.
- Display idempotency keys and external IDs.


**Out of Scope:**
- Hub operations UI.
- Production deployment.
- Polished business UX.


**Expected Code Areas:**
- `apps/mock-erp/`


**Inputs:**  
Mock ERP HTTP APIs.

**Outputs:**  
Developer-only inspection/control UI.

**API / Interface Contract:**  
UI uses HTTP only; browser code must not read SQLite directly.

**Error Cases / Edge Cases:**
- Empty dataset.
- Reset failure.
- Simulation update failure.
- Long IDs.


**Implementation Constraints:**
- Use existing frontend stack if present.
- Do not expose test controls in production.
- Avoid new frontend framework.


**Testing Requirements:**
- Component/integration tests for controls where supported.
- E2E reset -> seed view -> configure timeout -> inspect received order.


**Acceptance Criteria:**
- Reset/reseed works from UI.
- Simulation mode can be changed.
- Orders/Returns are inspectable.
- Production mode exposes no test UI.


**Dependencies:**

**Hard Dependencies:**
- TASK-3.3


**Contract Dependencies:**
- None


**Can Run in Parallel With:**
- TASK-3.5
- TASK-4.1


**Definition of Done:**
- Implementation is complete for the stated scope.
- Required tests pass.
- Type-check and lint pass.
- Public interfaces match the agreed contract.
- Supported failure cases are handled without leaking credentials or unsafe provider payloads.
- No unrelated consumer-product behavior is changed.
- Relevant contract/operations documentation is updated.
- Existing project patterns are followed; no unnecessary framework, library, or abstraction is introduced.

#### Cursor Handoff

**Task:**  
Implement minimal Mock ERP developer UI

**Goal:**  
Developer can inspect source data and received documents, reset/reseed, and configure next-request failure/latency without direct SQLite access.

**Relevant Context:**  
The required UI is minimal and developer-only, not a customer product.

**Implement:**
- Create status/company view.
- Create Customers/Products/Prices/Financial fixture views.
- Create Orders/Returns inspection.
- Add reset/reseed controls.
- Add simulation behavior/delay controls.
- Display idempotency keys and external IDs.


**Do Not Implement:**
- Hub operations UI.
- Production deployment.
- Polished business UX.


**Interfaces / Contracts:**  
UI uses HTTP only; browser code must not read SQLite directly.

**Expected Code Areas:**  
`apps/mock-erp/`

**Testing:**
- Component/integration tests for controls where supported.
- E2E reset -> seed view -> configure timeout -> inspect received order.


**Definition of Done:**
- Meet all acceptance criteria above.
- Tests, type-check, and lint pass.
- Preserve contract compatibility.
- Avoid unrelated refactors and new dependencies.

**Dependencies:**  
Hard: TASK-3.3. Contract: None.

**Implementation Guidance:**  
Inspect the existing codebase first and follow existing project patterns. Avoid unrelated refactors or new dependencies unless required. Do not introduce new libraries, frameworks, abstractions, or architectural layers unless explicitly required by the Technical Design or necessary to complete this task.

### TASK-3.5: Create reusable ERP adapter conformance suite

**Type:** Testing

**Objective:**  
Enforce provider-neutral behavior across Fake, Mock and real adapters.

**Task Context:**  
Required coverage includes paging/cursors, null handling, mapping, CustomerAssortment membership/deactivation semantics, assortment-vs-price independence, timeouts, retry classification, external ID stability and idempotency.

**Implementation Goal:**  
Any adapter can be plugged into one capability-oriented conformance harness.

**Scope:**
- Build inbound paging/mapping contract tests, including AssortmentPort and authoritative full-sync membership semantics.
- Test CustomerAssortment independently from CustomerPrice, including out-of-assortment/price-present and in-assortment/no-price fixtures.
- Build outbound idempotency/error-classification tests.
- Run suite against Fake and Mock in CI.
- Expose hooks for real-provider sandbox adapters.


**Out of Scope:**
- Provider-specific assertions outside canonical contract.
- Consumer application E2E.


**Expected Code Areas:**
- `packages/testing/adapter-contract/`
- `tests/integration/`


**Inputs:**  
Adapter factory, capability declaration and deterministic fixtures.

**Outputs:**  
Conformance pass/fail suite.

**API / Interface Contract:**  
Adapter under test implements TASK-3.1 ports.

**Error Cases / Edge Cases:**
- Cursor loop.
- Timeout marked permanent.
- Different external ID for same idempotency key.
- Claimed capability not implemented.


**Implementation Constraints:**
- Provider-neutral assertions.
- Document unsupported capability rather than weakening suite.


**Testing Requirements:**
- Self-test with broken fixtures.
- Fake full conformance including AssortmentPort.
- Mock supported-capability conformance including CustomerAssortment where declared.


**Acceptance Criteria:**
- Fake/Mock pass.
- Broken fixtures are detected.
- Real adapters can use suite unchanged.


**Dependencies:**

**Hard Dependencies:**
- TASK-3.1
- TASK-3.2
- TASK-3.3


**Contract Dependencies:**
- None


**Can Run in Parallel With:**
- TASK-4.2
- TASK-6.2


**Definition of Done:**
- Implementation is complete for the stated scope.
- Required tests pass.
- Type-check and lint pass.
- Public interfaces match the agreed contract.
- Supported failure cases are handled without leaking credentials or unsafe provider payloads.
- No unrelated consumer-product behavior is changed.
- Relevant contract/operations documentation is updated.
- Existing project patterns are followed; no unnecessary framework, library, or abstraction is introduced.

#### Cursor Handoff

**Task:**  
Create reusable ERP adapter conformance suite

**Goal:**  
Any adapter can be plugged into one capability-oriented conformance harness.

**Relevant Context:**  
Required coverage includes paging/cursors, null handling, mapping, CustomerAssortment membership/deactivation semantics, assortment-vs-price independence, timeouts, retry classification, external ID stability and idempotency.

**Implement:**
- Build inbound paging/mapping contract tests, including AssortmentPort and authoritative full-sync membership semantics.
- Test CustomerAssortment independently from CustomerPrice, including out-of-assortment/price-present and in-assortment/no-price fixtures.
- Build outbound idempotency/error-classification tests.
- Run suite against Fake and Mock in CI.
- Expose hooks for real-provider sandbox adapters.


**Do Not Implement:**
- Provider-specific assertions outside canonical contract.
- Consumer application E2E.


**Interfaces / Contracts:**  
Adapter under test implements TASK-3.1 ports.

**Expected Code Areas:**  
`packages/testing/adapter-contract/`, `tests/integration/`

**Testing:**
- Self-test with broken fixtures.
- Fake full conformance including AssortmentPort.
- Mock supported-capability conformance including CustomerAssortment where declared.


**Definition of Done:**
- Meet all acceptance criteria above.
- Tests, type-check, and lint pass.
- Preserve contract compatibility.
- Avoid unrelated refactors and new dependencies.

**Dependencies:**  
Hard: TASK-3.1, TASK-3.2, TASK-3.3. Contract: None.

**Implementation Guidance:**  
Inspect the existing codebase first and follow existing project patterns. Avoid unrelated refactors or new dependencies unless required. Do not introduce new libraries, frameworks, abstractions, or architectural layers unless explicitly required by the Technical Design or necessary to complete this task.

## EPIC-4: Inbound Synchronization and Projection APIs

**Goal:**  
Implement the one sync pipeline, full/incremental correctness, scheduled/on-demand triggers, canonical reads and change feed.

**Depends on:**  
Canonical/sync persistence and adapter ports.

### TASK-4.1: Implement core inbound sync engine

**Type:** Backend

**Objective:**  
Create the single sync orchestration path for scheduled and on-demand execution.

**Task Context:**  
Algorithm is fixed: authorize trigger, resolve connection/adapter, lock, create run, load checkpoint, page/validate/normalize, transactionally upsert plus change events, advance checkpoint after commit, finalize metrics.

**Implementation Goal:**  
runSync executes provider-neutral full/incremental paging with durable SyncRun/checkpoint behavior.

**Scope:**
- Implement runSync orchestration.
- Resolve adapter capability.
- Acquire one-active-run lock.
- Create/update SyncRun.
- Load checkpoint and mode.
- Process pages and runtime-validate records.
- Normalize CustomerAssortment as explicit membership records; never infer assortment from price pages.
- Transactionally upsert canonical records and append change events.
- Advance checkpoint only after commit.
- Persist safe errors and final counts/status.
- Emit observability hooks.


**Out of Scope:**
- Scheduler technology.
- HTTP on-demand route.
- Full-sync missing-record finalization; TASK-4.2.
- Provider mapping.


**Expected Code Areas:**
- `packages/sync-engine/`
- `packages/db/`
- `packages/change-feed/`


**Inputs:**  
Trusted organization/capability/trigger and adapter pages.

**Outputs:**  
Canonical state, change events, checkpoints, SyncRun accounting.

**API / Interface Contract:**  
runSync({ organizationId, capability, trigger, requestedBy? }) is the only sync execution path.

**Error Cases / Edge Cases:**
- Provider timeout mid-page.
- Validation failure.
- Checkpoint write failure.
- Concurrent run.
- Repeated cursor loop.


**Implementation Constraints:**
- No separate manual-sync algorithm.
- Checkpoint only after commit.
- One org failure does not stop unrelated orgs.
- No provider-specific imports.


**Testing Requirements:**
- Fake-adapter success/failure/partial unit tests, including CustomerAssortment capability.
- Page atomicity DB test.
- Concurrency lock test.
- Replay after failure.


**Acceptance Criteria:**
- Shared function serves all triggers.
- Failure leaves last committed checkpoint.
- Replay converges without duplicate canonical rows.
- Run counts/status are correct.


**Dependencies:**

**Hard Dependencies:**
- TASK-2.2
- TASK-2.3
- TASK-3.1


**Contract Dependencies:**
- TASK-1.3


**Can Run in Parallel With:**
- TASK-3.2
- TASK-3.3
- TASK-6.1


**Definition of Done:**
- Implementation is complete for the stated scope.
- Required tests pass.
- Type-check and lint pass.
- Public interfaces match the agreed contract.
- Supported failure cases are handled without leaking credentials or unsafe provider payloads.
- No unrelated consumer-product behavior is changed.
- Relevant contract/operations documentation is updated.
- Existing project patterns are followed; no unnecessary framework, library, or abstraction is introduced.

#### Cursor Handoff

**Task:**  
Implement core inbound sync engine

**Goal:**  
runSync executes provider-neutral full/incremental paging with durable SyncRun/checkpoint behavior.

**Relevant Context:**  
Algorithm is fixed: authorize trigger, resolve connection/adapter, lock, create run, load checkpoint, page/validate/normalize, transactionally upsert plus change events, advance checkpoint after commit, finalize metrics.

**Implement:**
- Implement runSync orchestration.
- Resolve adapter capability.
- Acquire one-active-run lock.
- Create/update SyncRun.
- Load checkpoint and mode.
- Process pages and runtime-validate records.
- Normalize CustomerAssortment as explicit membership records; never infer assortment from price pages.
- Transactionally upsert canonical records and append change events.
- Advance checkpoint only after commit.
- Persist safe errors and final counts/status.
- Emit observability hooks.


**Do Not Implement:**
- Scheduler technology.
- HTTP on-demand route.
- Full-sync missing-record finalization; TASK-4.2.
- Provider mapping.


**Interfaces / Contracts:**  
runSync({ organizationId, capability, trigger, requestedBy? }) is the only sync execution path.

**Expected Code Areas:**  
`packages/sync-engine/`, `packages/db/`, `packages/change-feed/`

**Testing:**
- Fake-adapter success/failure/partial unit tests, including CustomerAssortment capability.
- Page atomicity DB test.
- Concurrency lock test.
- Replay after failure.


**Definition of Done:**
- Meet all acceptance criteria above.
- Tests, type-check, and lint pass.
- Preserve contract compatibility.
- Avoid unrelated refactors and new dependencies.

**Dependencies:**  
Hard: TASK-2.2, TASK-2.3, TASK-3.1. Contract: TASK-1.3.

**Implementation Guidance:**  
Inspect the existing codebase first and follow existing project patterns. Avoid unrelated refactors or new dependencies unless required. Do not introduce new libraries, frameworks, abstractions, or architectural layers unless explicitly required by the Technical Design or necessary to complete this task.

### TASK-4.2: Implement safe full-sync deactivation and run concurrency

**Type:** Backend

**Objective:**  
Deactivate source records missing from a successful full traversal without corrupting last good state.

**Task Context:**  
A full sync must not blindly delete while paging. Deactivation is allowed only after successful completion using a generation/seen marker or equivalent.

**Implementation Goal:**  
Failed/partial full runs preserve prior active state; successful full runs deactivate exactly missing source rows and emit change events.

**Scope:**
- Add generation/seen tracking.
- Mark records seen during full run.
- Finalize deactivation only after successful traversal.
- For CustomerAssortment, deactivate unseen memberships only when the adapter/run declares the completed assortment scope authoritative.
- Append deactivation change events transactionally.
- Enforce one active run per organization/connection/capability.


**Out of Scope:**
- Hard deletion.
- Partitioned parallel sync.
- Consumer projection logic.


**Expected Code Areas:**
- `packages/sync-engine/`
- `packages/db/`
- `migrations/`


**Inputs:**  
Full SyncRun and seen canonical records.

**Outputs:**  
Correct active/deactivated state and change events.

**API / Interface Contract:**  
Deactivation is a post-success full-run finalization step.

**Error Cases / Edge Cases:**
- Failure on last page.
- Provider temporarily incomplete.
- Assortment full run is partial/non-authoritative.
- Concurrent scheduled/on-demand full run.


**Implementation Constraints:**
- Partial/failed run never deactivates unseen rows.
- CustomerAssortment deactivation requires successful authoritative scope; missing price never deactivates assortment.
- Deactivation emits change events.


**Testing Requirements:**
- Failed full sync preserves rows.
- Successful authoritative CustomerAssortment full sync deactivates missing memberships once; non-authoritative run does not.
- Successful full sync deactivates missing rows once.
- Concurrent-run test.


**Acceptance Criteria:**
- No last-good data loss on failure.
- Successful full run deactivates correct rows.
- Consumers can observe deactivation.


**Dependencies:**

**Hard Dependencies:**
- TASK-4.1


**Contract Dependencies:**
- None


**Can Run in Parallel With:**
- TASK-4.3
- TASK-4.4
- TASK-4.5


**Definition of Done:**
- Implementation is complete for the stated scope.
- Required tests pass.
- Type-check and lint pass.
- Public interfaces match the agreed contract.
- Supported failure cases are handled without leaking credentials or unsafe provider payloads.
- No unrelated consumer-product behavior is changed.
- Relevant contract/operations documentation is updated.
- Existing project patterns are followed; no unnecessary framework, library, or abstraction is introduced.

#### Cursor Handoff

**Task:**  
Implement safe full-sync deactivation and run concurrency

**Goal:**  
Failed/partial full runs preserve prior active state; successful full runs deactivate exactly missing source rows and emit change events.

**Relevant Context:**  
A full sync must not blindly delete while paging. Deactivation is allowed only after successful completion using a generation/seen marker or equivalent.

**Implement:**
- Add generation/seen tracking.
- Mark records seen during full run.
- Finalize deactivation only after successful traversal.
- For CustomerAssortment, deactivate unseen memberships only when the adapter/run declares the completed assortment scope authoritative.
- Append deactivation change events transactionally.
- Enforce one active run per organization/connection/capability.


**Do Not Implement:**
- Hard deletion.
- Partitioned parallel sync.
- Consumer projection logic.


**Interfaces / Contracts:**  
Deactivation is a post-success full-run finalization step.

**Expected Code Areas:**  
`packages/sync-engine/`, `packages/db/`, `migrations/`

**Testing:**
- Failed full sync preserves rows.
- Successful authoritative CustomerAssortment full sync deactivates missing memberships once; non-authoritative run does not.
- Successful full sync deactivates missing rows once.
- Concurrent-run test.


**Definition of Done:**
- Meet all acceptance criteria above.
- Tests, type-check, and lint pass.
- Preserve contract compatibility.
- Avoid unrelated refactors and new dependencies.

**Dependencies:**  
Hard: TASK-4.1. Contract: None.

**Implementation Guidance:**  
Inspect the existing codebase first and follow existing project patterns. Avoid unrelated refactors or new dependencies unless required. Do not introduce new libraries, frameworks, abstractions, or architectural layers unless explicitly required by the Technical Design or necessary to complete this task.

### TASK-4.3: Implement periodic sync scheduling

**Type:** Backend

**Objective:**  
Trigger enabled sync policies periodically through runSync.

**Task Context:**  
sync_policies.schedule_expression is required, but scheduler technology and expression syntax are Decision Required.

**Implementation Goal:**  
Approved scheduler evaluates enabled policies and invokes runSync with trigger=scheduled.

**Scope:**
- Implement approved scheduler integration.
- Load enabled policies.
- Call runSync only.
- Rely on existing active-run lock.
- Record scheduled trigger metadata.
- Emit scheduler health/failure signals.


**Out of Scope:**
- New sync logic.
- On-demand API.
- Consumer-owned scheduling.


**Expected Code Areas:**
- `apps/worker/`
- `packages/sync-engine/`


**Inputs:**  
Enabled sync policies and approved schedule format.

**Outputs:**  
Scheduled SyncRuns.

**API / Interface Contract:**  
Scheduler calls runSync; no direct provider/canonical writes.

**Error Cases / Edge Cases:**
- Invalid expression.
- Duplicate tick.
- Existing active run.
- Worker restart.


**Implementation Constraints:**
- Blocked until scheduler decision.
- Must be horizontally safe via existing locking.
- Do not bypass SyncRun accounting.


**Testing Requirements:**
- Deterministic scheduler test.
- One-run trigger integration.
- Duplicate tick protection.


**Acceptance Criteria:**
- Enabled policy triggers shared engine.
- Disabled policy does not.
- No overlapping execution.
- SyncRun trigger is scheduled.


**Dependencies:**

**Hard Dependencies:**
- TASK-4.1
- Decision Required: scheduler technology/expression format


**Contract Dependencies:**
- None


**Can Run in Parallel With:**
- TASK-4.4
- TASK-4.5


**Definition of Done:**
- Implementation is complete for the stated scope.
- Required tests pass.
- Type-check and lint pass.
- Public interfaces match the agreed contract.
- Supported failure cases are handled without leaking credentials or unsafe provider payloads.
- No unrelated consumer-product behavior is changed.
- Relevant contract/operations documentation is updated.
- Existing project patterns are followed; no unnecessary framework, library, or abstraction is introduced.

#### Cursor Handoff

**Task:**  
Implement periodic sync scheduling

**Goal:**  
Approved scheduler evaluates enabled policies and invokes runSync with trigger=scheduled.

**Relevant Context:**  
sync_policies.schedule_expression is required, but scheduler technology and expression syntax are Decision Required.

**Implement:**
- Implement approved scheduler integration.
- Load enabled policies.
- Call runSync only.
- Rely on existing active-run lock.
- Record scheduled trigger metadata.
- Emit scheduler health/failure signals.


**Do Not Implement:**
- New sync logic.
- On-demand API.
- Consumer-owned scheduling.


**Interfaces / Contracts:**  
Scheduler calls runSync; no direct provider/canonical writes.

**Expected Code Areas:**  
`apps/worker/`, `packages/sync-engine/`

**Testing:**
- Deterministic scheduler test.
- One-run trigger integration.
- Duplicate tick protection.


**Definition of Done:**
- Meet all acceptance criteria above.
- Tests, type-check, and lint pass.
- Preserve contract compatibility.
- Avoid unrelated refactors and new dependencies.

**Dependencies:**  
Hard: TASK-4.1, Decision Required: scheduler technology/expression format. Contract: None.

**Implementation Guidance:**  
Inspect the existing codebase first and follow existing project patterns. Avoid unrelated refactors or new dependencies unless required. Do not introduce new libraries, frameworks, abstractions, or architectural layers unless explicitly required by the Technical Design or necessary to complete this task.

### TASK-4.4: Implement on-demand sync and SyncRun status APIs

**Type:** Backend

**Objective:**  
Allow authorized consumers/operators to trigger and inspect sync without duplicating sync logic.

**Task Context:**  
Public routes include POST /api/v1/sync/:capability/run and GET /api/v1/sync/runs/:id. Binding->organization scope is resolved server-side.

**Implementation Goal:**  
Authorized caller triggers supported capability through runSync and reads sanitized run status/counters/errors.

**Scope:**
- Implement runtime-validated trigger route.
- Resolve ConsumerContext and scope.
- Map binding to organization server-side.
- Dispatch runSync with trigger=on_demand.
- Implement run status DTO/route.
- Propagate request/correlation ID.


**Out of Scope:**
- Raw organization selection.
- Scheduler.
- Provider secrets/raw errors.
- Operations UI.


**Expected Code Areas:**
- `apps/api/`
- `packages/contracts/`
- `packages/sync-engine/`


**Inputs:**  
Authenticated consumer, binding ref, capability, approved optional mode/config.

**Outputs:**  
Run reference and safe status detail.

**API / Interface Contract:**  
POST /api/v1/sync/:capability/run; GET /api/v1/sync/runs/:id. Exact success status code follows existing API convention but must represent accepted/run state accurately.

**Error Cases / Edge Cases:**
- Unauthorized scope.
- Unknown binding.
- Active run exists.
- Unsupported capability.
- Run belongs to other org.


**Implementation Constraints:**
- Use TASK-1.4 context.
- Call runSync only.
- Safe errors only.


**Testing Requirements:**
- Authorized/unauthorized trigger.
- Cross-org run lookup denial.
- Trigger recorded as on_demand.


**Acceptance Criteria:**
- Authorized caller can trigger supported capability.
- Unbound caller cannot trigger/inspect.
- Uses same checkpoint semantics as scheduled path.
- Errors sanitized.


**Dependencies:**

**Hard Dependencies:**
- TASK-4.1


**Contract Dependencies:**
- TASK-1.4


**Can Run in Parallel With:**
- TASK-4.3
- TASK-4.5


**Definition of Done:**
- Implementation is complete for the stated scope.
- Required tests pass.
- Type-check and lint pass.
- Public interfaces match the agreed contract.
- Supported failure cases are handled without leaking credentials or unsafe provider payloads.
- No unrelated consumer-product behavior is changed.
- Relevant contract/operations documentation is updated.
- Existing project patterns are followed; no unnecessary framework, library, or abstraction is introduced.

#### Cursor Handoff

**Task:**  
Implement on-demand sync and SyncRun status APIs

**Goal:**  
Authorized caller triggers supported capability through runSync and reads sanitized run status/counters/errors.

**Relevant Context:**  
Public routes include POST /api/v1/sync/:capability/run and GET /api/v1/sync/runs/:id. Binding->organization scope is resolved server-side.

**Implement:**
- Implement runtime-validated trigger route.
- Resolve ConsumerContext and scope.
- Map binding to organization server-side.
- Dispatch runSync with trigger=on_demand.
- Implement run status DTO/route.
- Propagate request/correlation ID.


**Do Not Implement:**
- Raw organization selection.
- Scheduler.
- Provider secrets/raw errors.
- Operations UI.


**Interfaces / Contracts:**  
POST /api/v1/sync/:capability/run; GET /api/v1/sync/runs/:id. Exact success status code follows existing API convention but must represent accepted/run state accurately.

**Expected Code Areas:**  
`apps/api/`, `packages/contracts/`, `packages/sync-engine/`

**Testing:**
- Authorized/unauthorized trigger.
- Cross-org run lookup denial.
- Trigger recorded as on_demand.


**Definition of Done:**
- Meet all acceptance criteria above.
- Tests, type-check, and lint pass.
- Preserve contract compatibility.
- Avoid unrelated refactors and new dependencies.

**Dependencies:**  
Hard: TASK-4.1. Contract: TASK-1.4.

**Implementation Guidance:**  
Inspect the existing codebase first and follow existing project patterns. Avoid unrelated refactors or new dependencies unless required. Do not introduce new libraries, frameworks, abstractions, or architectural layers unless explicitly required by the Technical Design or necessary to complete this task.

### TASK-4.5: Implement canonical read and cursor-based change-feed APIs

**Type:** Backend

**Objective:**  
Provide bootstrap and incremental delivery for consumer local projections.

**Task Context:**  
Consumers must never share Hub DB. They bootstrap from canonical list APIs including CustomerAssortment where applicable, then replay a monotonic change feed. Two route shapes appear in the Technical Design, so the final change-feed path is Decision Required.

**Implementation Goal:**  
Versioned, binding-scoped read APIs expose canonical pages and replayable change events with a documented no-gap bootstrap strategy.

**Scope:**
- Implement customers/products/customer-assortments/customer-prices/financials/sales-documents reads for supported data.
- Implement bounded cursor pagination.
- Implement change feed under approved route shape.
- Resolve binding->organization through ConsumerContext.
- Return operation, canonical version, source update time when present, committed time.
- Document/test snapshot+cursor bootstrap strategy.


**Out of Scope:**
- Direct writes to consumer DB.
- Push/webhook delivery.
- Product projection code.
- Cross-provider composition.


**Expected Code Areas:**
- `apps/api/`
- `packages/change-feed/`
- `packages/contracts/`
- `packages/db/`


**Inputs:**  
Authenticated consumer/binding, filters, cursor, bounded limit.

**Outputs:**  
Canonical pages and ordered changes.

**API / Interface Contract:**  
Decision Required: finalize GET /api/v1/changes versus /api/v1/organizations/:bindingRef/changes. Either form must not accept arbitrary organization authority.

**Error Cases / Edge Cases:**
- Malformed cursor.
- Limit too large.
- Empty state.
- Deactivated entity, including inactive CustomerAssortment membership.
- Cross-binding reference.
- Replay from old cursor.


**Implementation Constraints:**
- Consumer persists its own cursor.
- Hub never writes consumer DB.
- Provider-neutral versioned DTOs.


**Testing Requirements:**
- Pagination, including CustomerAssortment pages.
- Replay/order.
- No-gap bootstrap integration test covering CustomerAssortment and CustomerPrice as independent datasets.
- Two-consumer isolation.


**Acceptance Criteria:**
- Consumer can rebuild Customer/Product/CustomerAssortment/CustomerPrice projection.
- Subsequent feed delivers every committed change in order.
- Replay deterministic.
- Cross-org access denied.
- No provider-specific fields leak.


**Dependencies:**

**Hard Dependencies:**
- TASK-2.2
- TASK-2.3


**Contract Dependencies:**
- TASK-1.3
- TASK-1.4


**Can Run in Parallel With:**
- TASK-4.3
- TASK-4.4
- TASK-6.1


**Definition of Done:**
- Implementation is complete for the stated scope.
- Required tests pass.
- Type-check and lint pass.
- Public interfaces match the agreed contract.
- Supported failure cases are handled without leaking credentials or unsafe provider payloads.
- No unrelated consumer-product behavior is changed.
- Relevant contract/operations documentation is updated.
- Existing project patterns are followed; no unnecessary framework, library, or abstraction is introduced.

#### Cursor Handoff

**Task:**  
Implement canonical read and cursor-based change-feed APIs

**Goal:**  
Versioned, binding-scoped read APIs expose canonical pages and replayable change events with a documented no-gap bootstrap strategy.

**Relevant Context:**  
Consumers must never share Hub DB. They bootstrap from canonical list APIs including CustomerAssortment where applicable, then replay a monotonic change feed. Two route shapes appear in the Technical Design, so the final change-feed path is Decision Required.

**Implement:**
- Implement customers/products/customer-assortments/customer-prices/financials/sales-documents reads for supported data.
- Implement bounded cursor pagination.
- Implement change feed under approved route shape.
- Resolve binding->organization through ConsumerContext.
- Return operation, canonical version, source update time when present, committed time.
- Document/test snapshot+cursor bootstrap strategy.


**Do Not Implement:**
- Direct writes to consumer DB.
- Push/webhook delivery.
- Product projection code.
- Cross-provider composition.


**Interfaces / Contracts:**  
Decision Required: finalize GET /api/v1/changes versus /api/v1/organizations/:bindingRef/changes. Either form must not accept arbitrary organization authority.

**Expected Code Areas:**  
`apps/api/`, `packages/change-feed/`, `packages/contracts/`, `packages/db/`

**Testing:**
- Pagination, including CustomerAssortment pages.
- Replay/order.
- No-gap bootstrap integration test covering CustomerAssortment and CustomerPrice as independent datasets.
- Two-consumer isolation.


**Definition of Done:**
- Meet all acceptance criteria above.
- Tests, type-check, and lint pass.
- Preserve contract compatibility.
- Avoid unrelated refactors and new dependencies.

**Dependencies:**  
Hard: TASK-2.2, TASK-2.3. Contract: TASK-1.3, TASK-1.4.

**Implementation Guidance:**  
Inspect the existing codebase first and follow existing project patterns. Avoid unrelated refactors or new dependencies unless required. Do not introduce new libraries, frameworks, abstractions, or architectural layers unless explicitly required by the Technical Design or necessary to complete this task.

## EPIC-5: Production ERP Adapters

**Goal:**  
Move Heshbonit and Hashavshevet provider-specific mapping into Hub adapters.

**Depends on:**  
ERP ports, conformance suite, provider mapping packs.

### TASK-5.1: Implement Heshbonit adapter from approved mapping pack

**Type:** Integration

**Objective:**  
Provide Heshbonit connectivity for B2B-required data and outbound Orders.

**Task Context:**  
Heshbonit-specific mapping belongs only in Hub. Actual provider API mapping and idempotency behavior are not in the source docs, so production completion is blocked on approved provider material.

**Implementation Goal:**  
Heshbonit adapter implements approved capabilities and passes conformance without leaking provider types.

**Scope:**
- Implement authenticated provider client.
- Map Customer/Product/CustomerAssortment/CustomerPrice and approved history fields; CustomerAssortment must normalize Heshbonit מגוון semantics without using price presence as entitlement.
- Map canonical Order to agreed Heshbonit document.
- Translate safe error/retryability.
- Implement provider-supported paging/cursors.
- Implement approved duplicate-prevention strategy.
- Declare capabilities.


**Out of Scope:**
- Inventing provider fields/statuses.
- B2B approval/payment logic.
- Provider code outside adapter.


**Expected Code Areas:**
- `packages/integrations/erp/adapters/heshbonit/`


**Inputs:**  
Approved mapping pack, sandbox/credentials, canonical contracts.

**Outputs:**  
Provider adapter.

**API / Interface Contract:**  
Implements only supported TASK-3.1 ports; wire contract comes from approved mapping pack.

**Error Cases / Edge Cases:**
- Timeout.
- Auth failure.
- Paging edge.
- Response lost after create.
- Business rejection.


**Implementation Constraints:**
- Decision Required: mapping pack first.
- No provider type escapes adapter.
- Redact sensitive payloads.


**Testing Requirements:**
- Mapping unit tests.
- Adapter conformance.
- Sandbox integration where available.
- Provider idempotency proof.


**Acceptance Criteria:**
- Required B2B capabilities pass conformance.
- Errors safely classified.
- No Heshbonit import in core.
- Duplicate prevention proven or release remains blocked.


**Dependencies:**

**Hard Dependencies:**
- TASK-3.1
- TASK-3.5
- Decision Required: Heshbonit mapping pack


**Contract Dependencies:**
- None


**Can Run in Parallel With:**
- TASK-5.2


**Definition of Done:**
- Implementation is complete for the stated scope.
- Required tests pass.
- Type-check and lint pass.
- Public interfaces match the agreed contract.
- Supported failure cases are handled without leaking credentials or unsafe provider payloads.
- No unrelated consumer-product behavior is changed.
- Relevant contract/operations documentation is updated.
- Existing project patterns are followed; no unnecessary framework, library, or abstraction is introduced.

#### Cursor Handoff

**Task:**  
Implement Heshbonit adapter from approved mapping pack

**Goal:**  
Heshbonit adapter implements approved capabilities and passes conformance without leaking provider types.

**Relevant Context:**  
Heshbonit-specific mapping belongs only in Hub. Actual provider API mapping and idempotency behavior are not in the source docs, so production completion is blocked on approved provider material.

**Implement:**
- Implement authenticated provider client.
- Map Customer/Product/CustomerAssortment/CustomerPrice and approved history fields; CustomerAssortment must normalize Heshbonit מגוון semantics without using price presence as entitlement.
- Map canonical Order to agreed Heshbonit document.
- Translate safe error/retryability.
- Implement provider-supported paging/cursors.
- Implement approved duplicate-prevention strategy.
- Declare capabilities.


**Do Not Implement:**
- Inventing provider fields/statuses.
- B2B approval/payment logic.
- Provider code outside adapter.


**Interfaces / Contracts:**  
Implements only supported TASK-3.1 ports; wire contract comes from approved mapping pack.

**Expected Code Areas:**  
`packages/integrations/erp/adapters/heshbonit/`

**Testing:**
- Mapping unit tests.
- Adapter conformance.
- Sandbox integration where available.
- Provider idempotency proof.


**Definition of Done:**
- Meet all acceptance criteria above.
- Tests, type-check, and lint pass.
- Preserve contract compatibility.
- Avoid unrelated refactors and new dependencies.

**Dependencies:**  
Hard: TASK-3.1, TASK-3.5, Decision Required: Heshbonit mapping pack. Contract: None.

**Implementation Guidance:**  
Inspect the existing codebase first and follow existing project patterns. Avoid unrelated refactors or new dependencies unless required. Do not introduce new libraries, frameworks, abstractions, or architectural layers unless explicitly required by the Technical Design or necessary to complete this task.

### TASK-5.2: Implement Hashavshevet adapter from approved mapping pack

**Type:** Integration

**Objective:**  
Provide Hashavshevet connectivity for Sales-required inbound data and Order/Return writes.

**Task Context:**  
The exact Hashavshevet protocol/mapping is absent. Production completion is blocked on provider mapping/test environment.

**Implementation Goal:**  
Hashavshevet adapter implements approved Customer/Product-UOM/Financial/history/Order/Return capabilities and passes conformance.

**Scope:**
- Implement provider client.
- Map Customers/contacts/addresses.
- Map Products/UOM.
- Map Financial/open docs and approved history.
- Map canonical Sales Order/Return.
- Translate safe error/retryability.
- Implement paging/incremental semantics.
- Implement duplicate-prevention strategy.
- Declare capabilities.


**Out of Scope:**
- Sales offline/inventory/AI workflow.
- Excel inventory.
- Inventing provider fields/statuses.


**Expected Code Areas:**
- `packages/integrations/erp/adapters/hashavshevet/`


**Inputs:**  
Approved mapping pack, sandbox/credentials, canonical contracts.

**Outputs:**  
Provider adapter.

**API / Interface Contract:**  
Implements supported TASK-3.1 ports; wire details stay private.

**Error Cases / Edge Cases:**
- Missing UOM mapping.
- Partial finance data.
- Timeout after write.
- Business rejection.
- Unsupported incremental cursor.


**Implementation Constraints:**
- Decision Required: mapping pack first.
- No Sales business rules in adapter.
- No raw secrets/payload leakage.


**Testing Requirements:**
- Mapping fixtures.
- Conformance suite.
- Sandbox tests.
- Order/Return duplicate-prevention tests.


**Acceptance Criteria:**
- Required Sales capabilities pass conformance.
- Financial/UOM mapping preserves canonical semantics.
- Order/Return retry does not duplicate under approved strategy.
- No provider concept leaks into core.


**Dependencies:**

**Hard Dependencies:**
- TASK-3.1
- TASK-3.5
- Decision Required: Hashavshevet mapping pack


**Contract Dependencies:**
- None


**Can Run in Parallel With:**
- TASK-5.1


**Definition of Done:**
- Implementation is complete for the stated scope.
- Required tests pass.
- Type-check and lint pass.
- Public interfaces match the agreed contract.
- Supported failure cases are handled without leaking credentials or unsafe provider payloads.
- No unrelated consumer-product behavior is changed.
- Relevant contract/operations documentation is updated.
- Existing project patterns are followed; no unnecessary framework, library, or abstraction is introduced.

#### Cursor Handoff

**Task:**  
Implement Hashavshevet adapter from approved mapping pack

**Goal:**  
Hashavshevet adapter implements approved Customer/Product-UOM/Financial/history/Order/Return capabilities and passes conformance.

**Relevant Context:**  
The exact Hashavshevet protocol/mapping is absent. Production completion is blocked on provider mapping/test environment.

**Implement:**
- Implement provider client.
- Map Customers/contacts/addresses.
- Map Products/UOM.
- Map Financial/open docs and approved history.
- Map canonical Sales Order/Return.
- Translate safe error/retryability.
- Implement paging/incremental semantics.
- Implement duplicate-prevention strategy.
- Declare capabilities.


**Do Not Implement:**
- Sales offline/inventory/AI workflow.
- Excel inventory.
- Inventing provider fields/statuses.


**Interfaces / Contracts:**  
Implements supported TASK-3.1 ports; wire details stay private.

**Expected Code Areas:**  
`packages/integrations/erp/adapters/hashavshevet/`

**Testing:**
- Mapping fixtures.
- Conformance suite.
- Sandbox tests.
- Order/Return duplicate-prevention tests.


**Definition of Done:**
- Meet all acceptance criteria above.
- Tests, type-check, and lint pass.
- Preserve contract compatibility.
- Avoid unrelated refactors and new dependencies.

**Dependencies:**  
Hard: TASK-3.1, TASK-3.5, Decision Required: Hashavshevet mapping pack. Contract: None.

**Implementation Guidance:**  
Inspect the existing codebase first and follow existing project patterns. Avoid unrelated refactors or new dependencies unless required. Do not introduce new libraries, frameworks, abstractions, or architectural layers unless explicitly required by the Technical Design or necessary to complete this task.

## EPIC-6: Reliable Outbound Command Delivery

**Goal:**  
Durably accept Order/Return commands, process them asynchronously, expose status, and prove no duplicates.

**Depends on:**  
Outbound persistence, contracts, security, adapter ports.

### TASK-6.1: Implement outbound Order and Return acceptance APIs

**Type:** Backend

**Objective:**  
Create the durable handoff boundary from consumers to Hub.

**Task Context:**  
Consumers call only after their own business rules allow transmission. Hub response confirms acceptance, never ERP success.

**Implementation Goal:**  
POST outbound Order/Return validates scope/payload, persists exactly one logical command and returns stable Hub command status.

**Scope:**
- Implement Order endpoint.
- Implement Return endpoint.
- Resolve binding/organization.
- Validate canonical payload/idempotency.
- Persist before response.
- Handle exact replay idempotently.
- Reject conflicting reuse.


**Out of Scope:**
- Synchronous provider call.
- B2B approval/payment checks.
- Sales workflow validation.
- Retry worker.


**Expected Code Areas:**
- `apps/api/`
- `packages/outbound/`
- `packages/contracts/`


**Inputs:**  
Authenticated consumer, binding, canonical command, consumerCommandRef, idempotencyKey.

**Outputs:**  
Durable command and acceptance response.

**API / Interface Contract:**  
POST /api/v1/outbound/orders and /returns. Response includes Hub command reference/status/acceptance time and must not imply provider success.

**Error Cases / Edge Cases:**
- Unauthorized capability.
- Malformed command.
- Exact duplicate.
- Conflicting duplicate.
- Disabled capability.
- DB commit failure.


**Implementation Constraints:**
- Persist before acknowledge.
- No provider call in request transaction.
- No consumer business-state mutation.


**Testing Requirements:**
- Valid Order/Return.
- Replay idempotency.
- Conflict reuse.
- Cross-consumer/org authorization.


**Acceptance Criteria:**
- Valid command durable before success response.
- Exact replay returns same logical command.
- Conflict rejected deterministically.
- Response represents Hub acceptance only.


**Dependencies:**

**Hard Dependencies:**
- TASK-2.4


**Contract Dependencies:**
- TASK-1.3
- TASK-1.4


**Can Run in Parallel With:**
- TASK-4.1
- TASK-4.5
- TASK-6.2


**Definition of Done:**
- Implementation is complete for the stated scope.
- Required tests pass.
- Type-check and lint pass.
- Public interfaces match the agreed contract.
- Supported failure cases are handled without leaking credentials or unsafe provider payloads.
- No unrelated consumer-product behavior is changed.
- Relevant contract/operations documentation is updated.
- Existing project patterns are followed; no unnecessary framework, library, or abstraction is introduced.

#### Cursor Handoff

**Task:**  
Implement outbound Order and Return acceptance APIs

**Goal:**  
POST outbound Order/Return validates scope/payload, persists exactly one logical command and returns stable Hub command status.

**Relevant Context:**  
Consumers call only after their own business rules allow transmission. Hub response confirms acceptance, never ERP success.

**Implement:**
- Implement Order endpoint.
- Implement Return endpoint.
- Resolve binding/organization.
- Validate canonical payload/idempotency.
- Persist before response.
- Handle exact replay idempotently.
- Reject conflicting reuse.


**Do Not Implement:**
- Synchronous provider call.
- B2B approval/payment checks.
- Sales workflow validation.
- Retry worker.


**Interfaces / Contracts:**  
POST /api/v1/outbound/orders and /returns. Response includes Hub command reference/status/acceptance time and must not imply provider success.

**Expected Code Areas:**  
`apps/api/`, `packages/outbound/`, `packages/contracts/`

**Testing:**
- Valid Order/Return.
- Replay idempotency.
- Conflict reuse.
- Cross-consumer/org authorization.


**Definition of Done:**
- Meet all acceptance criteria above.
- Tests, type-check, and lint pass.
- Preserve contract compatibility.
- Avoid unrelated refactors and new dependencies.

**Dependencies:**  
Hard: TASK-2.4. Contract: TASK-1.3, TASK-1.4.

**Implementation Guidance:**  
Inspect the existing codebase first and follow existing project patterns. Avoid unrelated refactors or new dependencies unless required. Do not introduce new libraries, frameworks, abstractions, or architectural layers unless explicitly required by the Technical Design or necessary to complete this task.

### TASK-6.2: Implement outbound worker, attempts, and retry policy

**Type:** Backend

**Objective:**  
Deliver accepted commands reliably with stable idempotency.

**Task Context:**  
Worker leases pending work, resolves adapter, records attempt, calls provider with same logical key on every retry, classifies result, schedules retry and emits status changes.

**Implementation Goal:**  
Commands progress asynchronously through pending/processing/succeeded/failed with safe attempt history and stable idempotency.

**Scope:**
- Lease with FOR UPDATE SKIP LOCKED.
- Resolve adapter/capability.
- Create attempt row.
- Call createOrder/createReturn with stable key.
- Record success/external ID.
- Classify retryable/permanent failure.
- Schedule backoff+jitter within configured attempt policy.
- Append command-status change event.
- Redact stored snapshots.


**Out of Scope:**
- Consumer business-state updates.
- Manual retry API.
- Provider mapping.


**Expected Code Areas:**
- `apps/worker/`
- `packages/outbound/`
- `packages/integrations/erp/`


**Inputs:**  
Pending commands and adapter registry.

**Outputs:**  
Updated command/attempts, retries, external ID, status event.

**API / Interface Contract:**  
Same idempotency_key on every logical retry through SalesOrderPort/ReturnPort.

**Error Cases / Edge Cases:**
- Worker crash after provider success.
- Timeout after persist.
- Retryable failure.
- Permanent rejection.
- Cancelled command.
- Worker race.


**Implementation Constraints:**
- Stable idempotency mandatory.
- Do not reinterpret consumer eligibility.
- Sanitize snapshots/logs.


**Testing Requirements:**
- Fake-adapter all outcomes.
- Concurrent-worker lease.
- Mock timeout-after-persist.
- Retry scheduling.


**Acceptance Criteria:**
- One active worker lease per command.
- Retryable failure reschedules.
- Permanent failure stops auto retry.
- Success records external ID.
- Timeout-after-persist creates no duplicate.


**Dependencies:**

**Hard Dependencies:**
- TASK-2.4
- TASK-3.1


**Contract Dependencies:**
- None


**Can Run in Parallel With:**
- TASK-6.1
- TASK-3.5


**Definition of Done:**
- Implementation is complete for the stated scope.
- Required tests pass.
- Type-check and lint pass.
- Public interfaces match the agreed contract.
- Supported failure cases are handled without leaking credentials or unsafe provider payloads.
- No unrelated consumer-product behavior is changed.
- Relevant contract/operations documentation is updated.
- Existing project patterns are followed; no unnecessary framework, library, or abstraction is introduced.

#### Cursor Handoff

**Task:**  
Implement outbound worker, attempts, and retry policy

**Goal:**  
Commands progress asynchronously through pending/processing/succeeded/failed with safe attempt history and stable idempotency.

**Relevant Context:**  
Worker leases pending work, resolves adapter, records attempt, calls provider with same logical key on every retry, classifies result, schedules retry and emits status changes.

**Implement:**
- Lease with FOR UPDATE SKIP LOCKED.
- Resolve adapter/capability.
- Create attempt row.
- Call createOrder/createReturn with stable key.
- Record success/external ID.
- Classify retryable/permanent failure.
- Schedule backoff+jitter within configured attempt policy.
- Append command-status change event.
- Redact stored snapshots.


**Do Not Implement:**
- Consumer business-state updates.
- Manual retry API.
- Provider mapping.


**Interfaces / Contracts:**  
Same idempotency_key on every logical retry through SalesOrderPort/ReturnPort.

**Expected Code Areas:**  
`apps/worker/`, `packages/outbound/`, `packages/integrations/erp/`

**Testing:**
- Fake-adapter all outcomes.
- Concurrent-worker lease.
- Mock timeout-after-persist.
- Retry scheduling.


**Definition of Done:**
- Meet all acceptance criteria above.
- Tests, type-check, and lint pass.
- Preserve contract compatibility.
- Avoid unrelated refactors and new dependencies.

**Dependencies:**  
Hard: TASK-2.4, TASK-3.1. Contract: None.

**Implementation Guidance:**  
Inspect the existing codebase first and follow existing project patterns. Avoid unrelated refactors or new dependencies unless required. Do not introduce new libraries, frameworks, abstractions, or architectural layers unless explicitly required by the Technical Design or necessary to complete this task.

### TASK-6.3: Implement outbound command status and attempt APIs

**Type:** Backend

**Objective:**  
Expose safe outbound state to consumers and operations tooling.

**Task Context:**  
Consumers need status, safe error, external document ID and provider attempt history without secret/raw payload exposure.

**Implementation Goal:**  
Authorized caller queries its command and sanitized attempts by consumerCommandRef.

**Scope:**
- Implement GET /api/v1/outbound/commands/:consumerCommandRef.
- Implement /attempts endpoint.
- Enforce consumer/binding authorization.
- Return status/retryability/safe error/external ID/timestamps/attempt metadata.
- Omit unsafe raw fields.


**Out of Scope:**
- Manual retry.
- Consumer UI.
- Consumer state mutation.


**Expected Code Areas:**
- `apps/api/`
- `packages/outbound/`
- `packages/contracts/`


**Inputs:**  
Authenticated consumer and command reference.

**Outputs:**  
Sanitized command and attempt DTOs.

**API / Interface Contract:**  
Representative routes from Technical Design section 10.

**Error Cases / Edge Cases:**
- Unknown command.
- Other consumer/org command.
- No attempts yet.
- Failure without external ID.


**Implementation Constraints:**
- Command reference is not authorization.
- Safe errors only.
- Raw snapshots omitted or redacted.


**Testing Requirements:**
- Success/pending/failure API tests.
- Cross-consumer denial.
- Sanitization.


**Acceptance Criteria:**
- Consumer reads own command.
- Cross-consumer existence is not leaked.
- External ID appears only when known.
- No secret/raw unsafe data returned.


**Dependencies:**

**Hard Dependencies:**
- TASK-6.1


**Contract Dependencies:**
- TASK-1.4


**Can Run in Parallel With:**
- TASK-6.2
- TASK-7.2


**Definition of Done:**
- Implementation is complete for the stated scope.
- Required tests pass.
- Type-check and lint pass.
- Public interfaces match the agreed contract.
- Supported failure cases are handled without leaking credentials or unsafe provider payloads.
- No unrelated consumer-product behavior is changed.
- Relevant contract/operations documentation is updated.
- Existing project patterns are followed; no unnecessary framework, library, or abstraction is introduced.

#### Cursor Handoff

**Task:**  
Implement outbound command status and attempt APIs

**Goal:**  
Authorized caller queries its command and sanitized attempts by consumerCommandRef.

**Relevant Context:**  
Consumers need status, safe error, external document ID and provider attempt history without secret/raw payload exposure.

**Implement:**
- Implement GET /api/v1/outbound/commands/:consumerCommandRef.
- Implement /attempts endpoint.
- Enforce consumer/binding authorization.
- Return status/retryability/safe error/external ID/timestamps/attempt metadata.
- Omit unsafe raw fields.


**Do Not Implement:**
- Manual retry.
- Consumer UI.
- Consumer state mutation.


**Interfaces / Contracts:**  
Representative routes from Technical Design section 10.

**Expected Code Areas:**  
`apps/api/`, `packages/outbound/`, `packages/contracts/`

**Testing:**
- Success/pending/failure API tests.
- Cross-consumer denial.
- Sanitization.


**Definition of Done:**
- Meet all acceptance criteria above.
- Tests, type-check, and lint pass.
- Preserve contract compatibility.
- Avoid unrelated refactors and new dependencies.

**Dependencies:**  
Hard: TASK-6.1. Contract: TASK-1.4.

**Implementation Guidance:**  
Inspect the existing codebase first and follow existing project patterns. Avoid unrelated refactors or new dependencies unless required. Do not introduce new libraries, frameworks, abstractions, or architectural layers unless explicitly required by the Technical Design or necessary to complete this task.

### TASK-6.4: Prove timeout-after-persist outbound idempotency end-to-end

**Type:** Testing

**Objective:**  
Demonstrate the critical no-duplicate guarantee after response loss.

**Task Context:**  
Mock ERP persists the document then times out. Hub must retry with the same key and resolve to the existing external document.

**Implementation Goal:**  
Automated E2E proves exactly one external document after timeout-after-persist plus retry.

**Scope:**
- Configure Mock ERP timeout-after-persist.
- Submit through public outbound API.
- Run worker first attempt and retry.
- Assert Hub eventually succeeds.
- Assert Mock ERP has exactly one external document for key.
- Cover Return too if supported.


**Out of Scope:**
- Real-provider idempotency proof.
- Consumer state changes.


**Expected Code Areas:**
- `tests/e2e/`
- `apps/mock-erp/`


**Inputs:**  
Running API, worker, PostgreSQL and Mock ERP.

**Outputs:**  
Release-blocking duplicate-prevention test.

**API / Interface Contract:**  
Use public acceptance/status APIs and real HTTP Mock ERP boundary.

**Error Cases / Edge Cases:**
- Timeout-before-persist.
- Multiple retries.
- Polling races.


**Implementation Constraints:**
- Do not bypass HTTP boundary.
- Same key every retry.


**Testing Requirements:**
- Timeout-after-persist scenario.
- Timeout-before-persist control.


**Acceptance Criteria:**
- Exactly one external document exists.
- Hub reports succeeded with that ID.
- Attempt history shows failure then success.
- Stable in CI.


**Dependencies:**

**Hard Dependencies:**
- TASK-3.3
- TASK-6.1
- TASK-6.2
- TASK-6.3


**Contract Dependencies:**
- None


**Can Run in Parallel With:**
- TASK-8.1
- TASK-8.2


**Definition of Done:**
- Implementation is complete for the stated scope.
- Required tests pass.
- Type-check and lint pass.
- Public interfaces match the agreed contract.
- Supported failure cases are handled without leaking credentials or unsafe provider payloads.
- No unrelated consumer-product behavior is changed.
- Relevant contract/operations documentation is updated.
- Existing project patterns are followed; no unnecessary framework, library, or abstraction is introduced.

#### Cursor Handoff

**Task:**  
Prove timeout-after-persist outbound idempotency end-to-end

**Goal:**  
Automated E2E proves exactly one external document after timeout-after-persist plus retry.

**Relevant Context:**  
Mock ERP persists the document then times out. Hub must retry with the same key and resolve to the existing external document.

**Implement:**
- Configure Mock ERP timeout-after-persist.
- Submit through public outbound API.
- Run worker first attempt and retry.
- Assert Hub eventually succeeds.
- Assert Mock ERP has exactly one external document for key.
- Cover Return too if supported.


**Do Not Implement:**
- Real-provider idempotency proof.
- Consumer state changes.


**Interfaces / Contracts:**  
Use public acceptance/status APIs and real HTTP Mock ERP boundary.

**Expected Code Areas:**  
`tests/e2e/`, `apps/mock-erp/`

**Testing:**
- Timeout-after-persist scenario.
- Timeout-before-persist control.


**Definition of Done:**
- Meet all acceptance criteria above.
- Tests, type-check, and lint pass.
- Preserve contract compatibility.
- Avoid unrelated refactors and new dependencies.

**Dependencies:**  
Hard: TASK-3.3, TASK-6.1, TASK-6.2, TASK-6.3. Contract: None.

**Implementation Guidance:**  
Inspect the existing codebase first and follow existing project patterns. Avoid unrelated refactors or new dependencies unless required. Do not introduce new libraries, frameworks, abstractions, or architectural layers unless explicitly required by the Technical Design or necessary to complete this task.

## EPIC-7: Observability and Operations

**Goal:**  
Provide safe telemetry, operational APIs, guarded manual controls, and audit.

**Depends on:**  
Core sync/outbound runtime.

### TASK-7.1: Implement structured logging, metrics, and health

**Type:** Infrastructure

**Objective:**  
Provide safe runtime telemetry for Hub operations.

**Task Context:**  
Required telemetry includes request/correlation, organization/consumer/connection, sync/outbound IDs, provider/capability, duration and outcome plus sync/queue/provider/idempotency metrics.

**Implementation Goal:**  
API/worker paths emit consistent structured logs/metrics and readiness/liveness without secrets.

**Scope:**
- Add request/correlation propagation.
- Emit required structured context fields.
- Add sync age/duration/error/upsert/deactivation metrics.
- Add change-feed lag.
- Add outbound queue depth/age/retry/permanent failure.
- Add provider latency/errors and idempotency conflicts.
- Add health/readiness.
- Add redaction.


**Out of Scope:**
- Selecting monitoring vendor.
- Product analytics.


**Expected Code Areas:**
- `packages/observability/`
- `apps/api/`
- `apps/worker/`


**Inputs:**  
Runtime lifecycle events.

**Outputs:**  
Structured logs, metrics, health signals.

**API / Interface Contract:**  
Use Technical Design field names where available. Do not include raw provider bodies.

**Error Cases / Edge Cases:**
- Secret inside provider error object.
- High-cardinality metric labels.
- DB unavailable during readiness.


**Implementation Constraints:**
- No credentials/unsafe payloads in logs.
- Bound metric cardinality.
- Vendor-neutral unless existing platform dictates.


**Testing Requirements:**
- Redaction test.
- Correlation propagation.
- Health with DB up/down.
- Metric smoke tests.


**Acceptance Criteria:**
- Required fields emitted when context exists.
- Secret fixture never appears in logs.
- Required metrics emitted.
- Readiness reflects critical dependency state.


**Dependencies:**

**Hard Dependencies:**
- TASK-1.1


**Contract Dependencies:**
- TASK-4.1
- TASK-6.2


**Can Run in Parallel With:**
- TASK-7.2
- TASK-9.1


**Definition of Done:**
- Implementation is complete for the stated scope.
- Required tests pass.
- Type-check and lint pass.
- Public interfaces match the agreed contract.
- Supported failure cases are handled without leaking credentials or unsafe provider payloads.
- No unrelated consumer-product behavior is changed.
- Relevant contract/operations documentation is updated.
- Existing project patterns are followed; no unnecessary framework, library, or abstraction is introduced.

#### Cursor Handoff

**Task:**  
Implement structured logging, metrics, and health

**Goal:**  
API/worker paths emit consistent structured logs/metrics and readiness/liveness without secrets.

**Relevant Context:**  
Required telemetry includes request/correlation, organization/consumer/connection, sync/outbound IDs, provider/capability, duration and outcome plus sync/queue/provider/idempotency metrics.

**Implement:**
- Add request/correlation propagation.
- Emit required structured context fields.
- Add sync age/duration/error/upsert/deactivation metrics.
- Add change-feed lag.
- Add outbound queue depth/age/retry/permanent failure.
- Add provider latency/errors and idempotency conflicts.
- Add health/readiness.
- Add redaction.


**Do Not Implement:**
- Selecting monitoring vendor.
- Product analytics.


**Interfaces / Contracts:**  
Use Technical Design field names where available. Do not include raw provider bodies.

**Expected Code Areas:**  
`packages/observability/`, `apps/api/`, `apps/worker/`

**Testing:**
- Redaction test.
- Correlation propagation.
- Health with DB up/down.
- Metric smoke tests.


**Definition of Done:**
- Meet all acceptance criteria above.
- Tests, type-check, and lint pass.
- Preserve contract compatibility.
- Avoid unrelated refactors and new dependencies.

**Dependencies:**  
Hard: TASK-1.1. Contract: TASK-4.1, TASK-6.2.

**Implementation Guidance:**  
Inspect the existing codebase first and follow existing project patterns. Avoid unrelated refactors or new dependencies unless required. Do not introduce new libraries, frameworks, abstractions, or architectural layers unless explicitly required by the Technical Design or necessary to complete this task.

### TASK-7.2: Implement operational monitoring and manual-control APIs

**Type:** Backend

**Objective:**  
Expose required connection/sync/outbound diagnostics and guarded retry controls.

**Task Context:**  
PRD HUB-020 and operational requirements require connection health, latest/stale sync, run errors, projection lag where measurable, queue age, failed commands, provider metrics, idempotency conflicts and authenticated retry/on-demand actions. A Hub UI is not defined.

**Implementation Goal:**  
Authorized ops callers can inspect safe operational state and retry only eligible failed commands.

**Scope:**
- Define/implement ops endpoints for connection health.
- Implement latest sync and SyncRun search/detail.
- Implement outbound queue/failure search/detail.
- Expose measurable lag/age summaries.
- Implement guarded manual retry for retryable failed command.
- Reuse on-demand sync API.
- Add pagination/filters.


**Out of Scope:**
- Dedicated ops frontend.
- Arbitrary provider command execution.
- Editing canonical business data.


**Expected Code Areas:**
- `apps/api/`
- `packages/contracts/`
- `packages/outbound/`
- `packages/sync-engine/`


**Inputs:**  
Authorized ops context, filters and identifiers.

**Outputs:**  
Sanitized operational DTOs and controlled retry action.

**API / Interface Contract:**  
Exact admin/ops route naming is not fixed; define versioned schemas in packages/contracts before route implementation.

**Error Cases / Edge Cases:**
- Retry succeeded/permanent command.
- Disabled connection.
- Cross-org ops access.
- Unbounded result.
- No configured stale threshold.


**Implementation Constraints:**
- All admin actions authenticated/authorized/audited.
- No UI framework invention.
- No raw provider secret/payload.


**Testing Requirements:**
- Authorization.
- Retry state guard.
- Pagination/filter.
- Sanitized diagnostics.


**Acceptance Criteria:**
- Required operational categories are available through API.
- Invalid retry rejected safely.
- Cross-org denied.
- No unsafe payload exposed.


**Dependencies:**

**Hard Dependencies:**
- TASK-4.4
- TASK-6.3


**Contract Dependencies:**
- TASK-1.4


**Can Run in Parallel With:**
- TASK-7.1
- TASK-8.1
- TASK-8.2


**Definition of Done:**
- Implementation is complete for the stated scope.
- Required tests pass.
- Type-check and lint pass.
- Public interfaces match the agreed contract.
- Supported failure cases are handled without leaking credentials or unsafe provider payloads.
- No unrelated consumer-product behavior is changed.
- Relevant contract/operations documentation is updated.
- Existing project patterns are followed; no unnecessary framework, library, or abstraction is introduced.

#### Cursor Handoff

**Task:**  
Implement operational monitoring and manual-control APIs

**Goal:**  
Authorized ops callers can inspect safe operational state and retry only eligible failed commands.

**Relevant Context:**  
PRD HUB-020 and operational requirements require connection health, latest/stale sync, run errors, projection lag where measurable, queue age, failed commands, provider metrics, idempotency conflicts and authenticated retry/on-demand actions. A Hub UI is not defined.

**Implement:**
- Define/implement ops endpoints for connection health.
- Implement latest sync and SyncRun search/detail.
- Implement outbound queue/failure search/detail.
- Expose measurable lag/age summaries.
- Implement guarded manual retry for retryable failed command.
- Reuse on-demand sync API.
- Add pagination/filters.


**Do Not Implement:**
- Dedicated ops frontend.
- Arbitrary provider command execution.
- Editing canonical business data.


**Interfaces / Contracts:**  
Exact admin/ops route naming is not fixed; define versioned schemas in packages/contracts before route implementation.

**Expected Code Areas:**  
`apps/api/`, `packages/contracts/`, `packages/outbound/`, `packages/sync-engine/`

**Testing:**
- Authorization.
- Retry state guard.
- Pagination/filter.
- Sanitized diagnostics.


**Definition of Done:**
- Meet all acceptance criteria above.
- Tests, type-check, and lint pass.
- Preserve contract compatibility.
- Avoid unrelated refactors and new dependencies.

**Dependencies:**  
Hard: TASK-4.4, TASK-6.3. Contract: TASK-1.4.

**Implementation Guidance:**  
Inspect the existing codebase first and follow existing project patterns. Avoid unrelated refactors or new dependencies unless required. Do not introduce new libraries, frameworks, abstractions, or architectural layers unless explicitly required by the Technical Design or necessary to complete this task.

### TASK-7.3: Implement administrative audit trail

**Type:** Database

**Objective:**  
Record privileged Hub actions for accountability.

**Task Context:**  
SEC-008 requires authenticated, authorized and audited administrative retry/on-demand actions. No broad audit schema is mandated.

**Implementation Goal:**  
Privileged actions append safe audit records with actor/consumer, organization, action, target, correlation ID, outcome and safe metadata.

**Scope:**
- Add append-only audit persistence using existing schema patterns.
- Audit on-demand sync.
- Audit manual outbound retry.
- Audit connection/config changes when such admin APIs are added.
- Exclude credentials/raw provider payloads.


**Out of Scope:**
- Consumer-product audit.
- Retention policy not defined.
- Full canonical history replacement.


**Expected Code Areas:**
- `migrations/`
- `packages/db/`
- `apps/api/`


**Inputs:**  
Privileged action context.

**Outputs:**  
Append-only audit records.

**API / Interface Contract:**  
Internal audit record only; no new consumer mutation contract.

**Error Cases / Edge Cases:**
- Action fails.
- Action denied.
- Target missing.
- Audit write failure.


**Implementation Constraints:**
- No secrets.
- Prefer same transaction as privileged state change where practical.
- Do not invent retention.


**Testing Requirements:**
- On-demand sync audit.
- Manual retry audit.
- Secret redaction.


**Acceptance Criteria:**
- Privileged actions are attributable.
- Correlation/org context recorded.
- No credential in audit.


**Dependencies:**

**Hard Dependencies:**
- TASK-2.1


**Contract Dependencies:**
- TASK-4.4
- TASK-7.2


**Can Run in Parallel With:**
- TASK-9.1


**Definition of Done:**
- Implementation is complete for the stated scope.
- Required tests pass.
- Type-check and lint pass.
- Public interfaces match the agreed contract.
- Supported failure cases are handled without leaking credentials or unsafe provider payloads.
- No unrelated consumer-product behavior is changed.
- Relevant contract/operations documentation is updated.
- Existing project patterns are followed; no unnecessary framework, library, or abstraction is introduced.

#### Cursor Handoff

**Task:**  
Implement administrative audit trail

**Goal:**  
Privileged actions append safe audit records with actor/consumer, organization, action, target, correlation ID, outcome and safe metadata.

**Relevant Context:**  
SEC-008 requires authenticated, authorized and audited administrative retry/on-demand actions. No broad audit schema is mandated.

**Implement:**
- Add append-only audit persistence using existing schema patterns.
- Audit on-demand sync.
- Audit manual outbound retry.
- Audit connection/config changes when such admin APIs are added.
- Exclude credentials/raw provider payloads.


**Do Not Implement:**
- Consumer-product audit.
- Retention policy not defined.
- Full canonical history replacement.


**Interfaces / Contracts:**  
Internal audit record only; no new consumer mutation contract.

**Expected Code Areas:**  
`migrations/`, `packages/db/`, `apps/api/`

**Testing:**
- On-demand sync audit.
- Manual retry audit.
- Secret redaction.


**Definition of Done:**
- Meet all acceptance criteria above.
- Tests, type-check, and lint pass.
- Preserve contract compatibility.
- Avoid unrelated refactors and new dependencies.

**Dependencies:**  
Hard: TASK-2.1. Contract: TASK-4.4, TASK-7.2.

**Implementation Guidance:**  
Inspect the existing codebase first and follow existing project patterns. Avoid unrelated refactors or new dependencies unless required. Do not introduce new libraries, frameworks, abstractions, or architectural layers unless explicitly required by the Technical Design or necessary to complete this task.

## EPIC-8: Consumer Compatibility and End-to-End Validation

**Goal:**  
Prove B2B and Sales compatibility and multi-org isolation through public Hub contracts.

**Depends on:**  
Canonical/change/outbound public APIs and Mock ERP.

### TASK-8.1: Create B2B Commerce consumer contract suite

**Type:** Testing

**Objective:**  
Prove Hub contracts satisfy B2B requirements without moving B2B workflow into Hub.

**Task Context:**  
B2B consumes Customer, Product identity/operational data, CustomerAssortment, CustomerPrice and optional history later. CustomerAssortment controls authenticated product eligibility in B2B and is independent from price. It sends Order only after its own approval/payment eligibility. ProductContent, promotions, cart, payment and revisions remain B2B-only.

**Implementation Goal:**  
Contract suite verifies B2B bootstrap/change/outbound behavior through public Hub v1 APIs.

**Scope:**
- Create B2B expected-field fixtures.
- Test Customer/Product/CustomerAssortment/CustomerPrice bootstrap.
- Test two Customers with different assortments.
- Test in-assortment/no-price and out-of-assortment/price-present cases to prove independent semantics.
- Test change-feed upsert/deactivate.
- Test canonical Order acceptance/status.
- Assert B2B-only fields are absent from Hub canonical contracts.


**Out of Scope:**
- Modifying B2B app.
- Implementing B2B payment/approval logic.
- Heshbonit wire assertions.


**Expected Code Areas:**
- `tests/integration/consumer-contract/`
- `packages/contracts/`


**Inputs:**  
Hub API, B2B consumer principal/binding, canonical fixtures.

**Outputs:**  
B2B contract compatibility results.

**API / Interface Contract:**  
Use only public v1 Hub APIs/contracts.

**Error Cases / Edge Cases:**
- Missing price.
- Deactivated product.
- Duplicate command replay.
- Sales-only binding access.


**Implementation Constraints:**
- Provider-neutral.
- Do not add B2B-owned data to Hub just for convenience.


**Testing Requirements:**
- Bootstrap/change/outbound tests.
- Cross-consumer negative tests.


**Acceptance Criteria:**
- B2B-required fields available.
- Cursor replay works.
- Outbound status observable.
- No B2B workflow duplicated.


**Dependencies:**

**Hard Dependencies:**
- TASK-4.5
- TASK-6.1
- TASK-6.3


**Contract Dependencies:**
- None


**Can Run in Parallel With:**
- TASK-8.2
- TASK-6.4


**Definition of Done:**
- Implementation is complete for the stated scope.
- Required tests pass.
- Type-check and lint pass.
- Public interfaces match the agreed contract.
- Supported failure cases are handled without leaking credentials or unsafe provider payloads.
- No unrelated consumer-product behavior is changed.
- Relevant contract/operations documentation is updated.
- Existing project patterns are followed; no unnecessary framework, library, or abstraction is introduced.

#### Cursor Handoff

**Task:**  
Create B2B Commerce consumer contract suite

**Goal:**  
Contract suite verifies B2B bootstrap/change/outbound behavior through public Hub v1 APIs.

**Relevant Context:**  
B2B consumes Customer, Product identity/operational data, CustomerAssortment, CustomerPrice and optional history later. CustomerAssortment controls authenticated product eligibility in B2B and is independent from price. It sends Order only after its own approval/payment eligibility. ProductContent, promotions, cart, payment and revisions remain B2B-only.

**Implement:**
- Create B2B expected-field fixtures.
- Test Customer/Product/CustomerAssortment/CustomerPrice bootstrap.
- Test two Customers with different assortments.
- Test in-assortment/no-price and out-of-assortment/price-present cases to prove independent semantics.
- Test change-feed upsert/deactivate.
- Test canonical Order acceptance/status.
- Assert B2B-only fields are absent from Hub canonical contracts.


**Do Not Implement:**
- Modifying B2B app.
- Implementing B2B payment/approval logic.
- Heshbonit wire assertions.


**Interfaces / Contracts:**  
Use only public v1 Hub APIs/contracts.

**Expected Code Areas:**  
`tests/integration/consumer-contract/`, `packages/contracts/`

**Testing:**
- Bootstrap/change/outbound tests.
- Cross-consumer negative tests.


**Definition of Done:**
- Meet all acceptance criteria above.
- Tests, type-check, and lint pass.
- Preserve contract compatibility.
- Avoid unrelated refactors and new dependencies.

**Dependencies:**  
Hard: TASK-4.5, TASK-6.1, TASK-6.3. Contract: None.

**Implementation Guidance:**  
Inspect the existing codebase first and follow existing project patterns. Avoid unrelated refactors or new dependencies unless required. Do not introduce new libraries, frameworks, abstractions, or architectural layers unless explicitly required by the Technical Design or necessary to complete this task.

### TASK-8.2: Create Sales Platform consumer contract suite

**Type:** Testing

**Objective:**  
Prove Hub contracts satisfy Sales ERP-facing requirements without moving Sales workflow into Hub.

**Task Context:**  
Sales consumes Customer/contact/address, Product/UOM, supported commercial reference, financial/open docs and supported history; it sends Order/Return. Excel inventory, offline, AI/risk remain Sales-only.

**Implementation Goal:**  
Contract suite verifies Sales bootstrap/change/outbound behavior through public Hub v1 APIs.

**Scope:**
- Create Sales expected-field fixtures.
- Test Customer/contact/address, Product/UOM, Finance/open docs and supported history bootstrap.
- Test change-feed behavior.
- Test Order and Return acceptance/status.
- Assert inventory/offline/AI/risk fields are absent.


**Out of Scope:**
- Modifying Sales app.
- Excel inventory.
- Sales order/return state machine.
- Hashavshevet wire assertions.


**Expected Code Areas:**
- `tests/integration/consumer-contract/`
- `packages/contracts/`


**Inputs:**  
Hub API, Sales principal/binding, canonical fixtures.

**Outputs:**  
Sales contract compatibility results.

**API / Interface Contract:**  
Use only public v1 Hub APIs/contracts; optional capabilities must be explicit.

**Error Cases / Edge Cases:**
- Missing optional financial data.
- Unknown UOM.
- History disabled.
- Return disabled.
- B2B-only binding access.


**Implementation Constraints:**
- Respect capability availability.
- Do not add product-owned concerns to Hub DTOs.


**Testing Requirements:**
- Bootstrap/change tests.
- Order/Return tests.
- Cross-consumer denial.


**Acceptance Criteria:**
- Required supported Sales data available.
- Disabled optional capability behaves explicitly.
- Order/Return status observable.
- No Sales offline/inventory/AI ownership moves to Hub.


**Dependencies:**

**Hard Dependencies:**
- TASK-4.5
- TASK-6.1
- TASK-6.3


**Contract Dependencies:**
- None


**Can Run in Parallel With:**
- TASK-8.1
- TASK-6.4


**Definition of Done:**
- Implementation is complete for the stated scope.
- Required tests pass.
- Type-check and lint pass.
- Public interfaces match the agreed contract.
- Supported failure cases are handled without leaking credentials or unsafe provider payloads.
- No unrelated consumer-product behavior is changed.
- Relevant contract/operations documentation is updated.
- Existing project patterns are followed; no unnecessary framework, library, or abstraction is introduced.

#### Cursor Handoff

**Task:**  
Create Sales Platform consumer contract suite

**Goal:**  
Contract suite verifies Sales bootstrap/change/outbound behavior through public Hub v1 APIs.

**Relevant Context:**  
Sales consumes Customer/contact/address, Product/UOM, supported commercial reference, financial/open docs and supported history; it sends Order/Return. Excel inventory, offline, AI/risk remain Sales-only.

**Implement:**
- Create Sales expected-field fixtures.
- Test Customer/contact/address, Product/UOM, Finance/open docs and supported history bootstrap.
- Test change-feed behavior.
- Test Order and Return acceptance/status.
- Assert inventory/offline/AI/risk fields are absent.


**Do Not Implement:**
- Modifying Sales app.
- Excel inventory.
- Sales order/return state machine.
- Hashavshevet wire assertions.


**Interfaces / Contracts:**  
Use only public v1 Hub APIs/contracts; optional capabilities must be explicit.

**Expected Code Areas:**  
`tests/integration/consumer-contract/`, `packages/contracts/`

**Testing:**
- Bootstrap/change tests.
- Order/Return tests.
- Cross-consumer denial.


**Definition of Done:**
- Meet all acceptance criteria above.
- Tests, type-check, and lint pass.
- Preserve contract compatibility.
- Avoid unrelated refactors and new dependencies.

**Dependencies:**  
Hard: TASK-4.5, TASK-6.1, TASK-6.3. Contract: None.

**Implementation Guidance:**  
Inspect the existing codebase first and follow existing project patterns. Avoid unrelated refactors or new dependencies unless required. Do not introduce new libraries, frameworks, abstractions, or architectural layers unless explicitly required by the Technical Design or necessary to complete this task.

### TASK-8.3: Build two-organization/two-consumer Hub end-to-end suite

**Type:** Testing

**Objective:**  
Validate complete Hub boundaries, isolation, sync and outbound flow using real HTTP processes.

**Task Context:**  
Technical Design mandates E2E ERP seed -> Hub sync -> consumer projection and consumer command -> Hub -> Mock ERP with two organizations and two consumers.

**Implementation Goal:**  
CI-capable E2E proves bootstrap, incremental sync, outbound delivery, isolation and idempotency.

**Scope:**
- Start API, worker, PostgreSQL and Mock ERP.
- Seed two Hub organizations and separate Mock ERP companies; include multiple B2B customers with intentionally different CustomerAssortments.
- Run supported inbound sync.
- Read bootstrap and changes as B2B/Sales principals.
- Submit outbound commands and verify Mock ERP persistence/status.
- Include timeout-after-persist.
- Prove cross-binding access fails.


**Out of Scope:**
- Real provider sandbox.
- Product UI E2E.


**Expected Code Areas:**
- `tests/e2e/`
- `test orchestration`


**Inputs:**  
Fully running local/test Hub stack.

**Outputs:**  
Deterministic end-to-end suite.

**API / Interface Contract:**  
Use public Hub API plus Mock ERP test controls; no consumer DB coupling.

**Error Cases / Edge Cases:**
- One org sync fails.
- Cross-binding request.
- Worker restart.
- Cursor replay.
- Timeout-after-persist.


**Implementation Constraints:**
- Do not shortcut via Mock SQLite from Hub code.
- Keep isolation explicit.


**Testing Requirements:**
- Full suite itself.
- Negative isolation scenarios.
- Failure/retry scenario.


**Acceptance Criteria:**
- Two orgs sync independently.
- Consumers see only bound data.
- Outbound reaches correct simulated company.
- No duplicate on timeout/retry.
- Stable in CI.


**Dependencies:**

**Hard Dependencies:**
- TASK-3.3
- TASK-4.4
- TASK-4.5
- TASK-6.4
- TASK-8.1
- TASK-8.2


**Contract Dependencies:**
- None


**Can Run in Parallel With:**
- TASK-9.2


**Definition of Done:**
- Implementation is complete for the stated scope.
- Required tests pass.
- Type-check and lint pass.
- Public interfaces match the agreed contract.
- Supported failure cases are handled without leaking credentials or unsafe provider payloads.
- No unrelated consumer-product behavior is changed.
- Relevant contract/operations documentation is updated.
- Existing project patterns are followed; no unnecessary framework, library, or abstraction is introduced.

#### Cursor Handoff

**Task:**  
Build two-organization/two-consumer Hub end-to-end suite

**Goal:**  
CI-capable E2E proves bootstrap, incremental sync, outbound delivery, isolation and idempotency.

**Relevant Context:**  
Technical Design mandates E2E ERP seed -> Hub sync -> consumer projection and consumer command -> Hub -> Mock ERP with two organizations and two consumers.

**Implement:**
- Start API, worker, PostgreSQL and Mock ERP.
- Seed two Hub organizations and separate Mock ERP companies; include multiple B2B customers with intentionally different CustomerAssortments.
- Run supported inbound sync.
- Read bootstrap and changes as B2B/Sales principals.
- Submit outbound commands and verify Mock ERP persistence/status.
- Include timeout-after-persist.
- Prove cross-binding access fails.


**Do Not Implement:**
- Real provider sandbox.
- Product UI E2E.


**Interfaces / Contracts:**  
Use public Hub API plus Mock ERP test controls; no consumer DB coupling.

**Expected Code Areas:**  
`tests/e2e/`, `test orchestration`

**Testing:**
- Full suite itself.
- Negative isolation scenarios.
- Failure/retry scenario.


**Definition of Done:**
- Meet all acceptance criteria above.
- Tests, type-check, and lint pass.
- Preserve contract compatibility.
- Avoid unrelated refactors and new dependencies.

**Dependencies:**  
Hard: TASK-3.3, TASK-4.4, TASK-4.5, TASK-6.4, TASK-8.1, TASK-8.2. Contract: None.

**Implementation Guidance:**  
Inspect the existing codebase first and follow existing project patterns. Avoid unrelated refactors or new dependencies unless required. Do not introduce new libraries, frameworks, abstractions, or architectural layers unless explicitly required by the Technical Design or necessary to complete this task.

## EPIC-9: CI/CD and Operational Readiness

**Goal:**  
Make the Hub continuously validated, safely deployable and operable.

**Depends on:**  
Foundation plus progressively available tests/operations.

### TASK-9.1: Implement CI quality and security pipeline

**Type:** DevOps

**Objective:**  
Automate release-blocking build, migration, contract, security and E2E checks.

**Task Context:**  
Required layers are unit, DB integration, adapter contract, Mock ERP integration, consumer contract, E2E and security tests.

**Implementation Goal:**  
Every change runs from a fresh DB/migration state and fails on contract/security/reliability regression.

**Scope:**
- Install/build/type/lint all workspaces.
- Start ephemeral PostgreSQL.
- Apply migrations+seed from zero.
- Run unit and DB integration.
- Run Fake/Mock conformance.
- Run isolation/security.
- Run consumer contract suites.
- Run E2E when available.
- Build deployable API/worker artifacts per repository convention.


**Out of Scope:**
- Choosing CI vendor if already established.
- Production deployment.
- Mandatory real-provider tests without credentials.


**Expected Code Areas:**
- `CI configuration`
- `root scripts`
- `test orchestration`


**Inputs:**  
Repository and test suites.

**Outputs:**  
Automated blocking pipeline.

**API / Interface Contract:**  
No public API.

**Error Cases / Edge Cases:**
- Migration drift.
- Flaky ports.
- Optional sandbox credentials absent.
- Order-dependent tests.


**Implementation Constraints:**
- Fresh DB rebuild is mandatory.
- Real-provider sandbox stage must be explicit/gated.
- Mock ERP remains test-only.


**Testing Requirements:**
- Run pipeline clean.
- Intentional migration/test failure blocks.
- Two-org security suite blocks.


**Acceptance Criteria:**
- Type/lint/test regressions block.
- Migration-from-zero verified.
- Adapter and consumer contracts run.
- TASK-8.3 becomes blocking once landed.


**Dependencies:**

**Hard Dependencies:**
- TASK-1.1


**Contract Dependencies:**
- TASK-2.1
- TASK-3.5
- TASK-8.3


**Can Run in Parallel With:**
- TASK-7.1
- TASK-9.2


**Definition of Done:**
- Implementation is complete for the stated scope.
- Required tests pass.
- Type-check and lint pass.
- Public interfaces match the agreed contract.
- Supported failure cases are handled without leaking credentials or unsafe provider payloads.
- No unrelated consumer-product behavior is changed.
- Relevant contract/operations documentation is updated.
- Existing project patterns are followed; no unnecessary framework, library, or abstraction is introduced.

#### Cursor Handoff

**Task:**  
Implement CI quality and security pipeline

**Goal:**  
Every change runs from a fresh DB/migration state and fails on contract/security/reliability regression.

**Relevant Context:**  
Required layers are unit, DB integration, adapter contract, Mock ERP integration, consumer contract, E2E and security tests.

**Implement:**
- Install/build/type/lint all workspaces.
- Start ephemeral PostgreSQL.
- Apply migrations+seed from zero.
- Run unit and DB integration.
- Run Fake/Mock conformance.
- Run isolation/security.
- Run consumer contract suites.
- Run E2E when available.
- Build deployable API/worker artifacts per repository convention.


**Do Not Implement:**
- Choosing CI vendor if already established.
- Production deployment.
- Mandatory real-provider tests without credentials.


**Interfaces / Contracts:**  
No public API.

**Expected Code Areas:**  
`CI configuration`, `root scripts`, `test orchestration`

**Testing:**
- Run pipeline clean.
- Intentional migration/test failure blocks.
- Two-org security suite blocks.


**Definition of Done:**
- Meet all acceptance criteria above.
- Tests, type-check, and lint pass.
- Preserve contract compatibility.
- Avoid unrelated refactors and new dependencies.

**Dependencies:**  
Hard: TASK-1.1. Contract: TASK-2.1, TASK-3.5, TASK-8.3.

**Implementation Guidance:**  
Inspect the existing codebase first and follow existing project patterns. Avoid unrelated refactors or new dependencies unless required. Do not introduce new libraries, frameworks, abstractions, or architectural layers unless explicitly required by the Technical Design or necessary to complete this task.

### TASK-9.2: Create deployment configuration, secret wiring, and production safeguards

**Type:** DevOps

**Objective:**  
Prepare independent API/worker deployment without unsafe secrets or Mock ERP configuration.

**Task Context:**  
Hosting provider is unspecified. Production must keep ERP credentials in Hub, reference external encryption key material and prohibit Mock ERP.

**Implementation Goal:**  
Deployment config can run API/worker with environment-specific DB/secrets, health checks and fail-fast production validation.

**Scope:**
- Define environment configuration schema.
- Wire DB and encryption-key references.
- Add production startup validation.
- Reject mock provider/config in production.
- Integrate health/readiness.
- Document migration-before-deploy order.


**Out of Scope:**
- Selecting cloud vendor.
- Deploying consumers.
- Secrets in source.


**Expected Code Areas:**
- `deployment configuration`
- `apps/api/`
- `apps/worker/`
- `packages/security/`


**Inputs:**  
Environment variables/secret references from deployment platform.

**Outputs:**  
Validated production runtime configuration.

**API / Interface Contract:**  
Environment mode must distinguish dev/test/prod; prod rejects Mock ERP.

**Error Cases / Edge Cases:**
- Missing DB URL.
- Missing key reference.
- Mock provider in prod.
- Schema/app mismatch.


**Implementation Constraints:**
- Vendor-neutral where possible.
- Secrets referenced, not embedded.
- API/worker independently deployable if needed.


**Testing Requirements:**
- Config validation.
- Prod mock rejection.
- Health smoke.


**Acceptance Criteria:**
- Unsafe/missing critical settings fail fast.
- Mock cannot run in prod.
- No secret in build artifacts.
- Migration/deploy order documented.


**Dependencies:**

**Hard Dependencies:**
- TASK-2.5
- TASK-7.1


**Contract Dependencies:**
- None


**Can Run in Parallel With:**
- TASK-9.1
- TASK-8.3


**Definition of Done:**
- Implementation is complete for the stated scope.
- Required tests pass.
- Type-check and lint pass.
- Public interfaces match the agreed contract.
- Supported failure cases are handled without leaking credentials or unsafe provider payloads.
- No unrelated consumer-product behavior is changed.
- Relevant contract/operations documentation is updated.
- Existing project patterns are followed; no unnecessary framework, library, or abstraction is introduced.

#### Cursor Handoff

**Task:**  
Create deployment configuration, secret wiring, and production safeguards

**Goal:**  
Deployment config can run API/worker with environment-specific DB/secrets, health checks and fail-fast production validation.

**Relevant Context:**  
Hosting provider is unspecified. Production must keep ERP credentials in Hub, reference external encryption key material and prohibit Mock ERP.

**Implement:**
- Define environment configuration schema.
- Wire DB and encryption-key references.
- Add production startup validation.
- Reject mock provider/config in production.
- Integrate health/readiness.
- Document migration-before-deploy order.


**Do Not Implement:**
- Selecting cloud vendor.
- Deploying consumers.
- Secrets in source.


**Interfaces / Contracts:**  
Environment mode must distinguish dev/test/prod; prod rejects Mock ERP.

**Expected Code Areas:**  
`deployment configuration`, `apps/api/`, `apps/worker/`, `packages/security/`

**Testing:**
- Config validation.
- Prod mock rejection.
- Health smoke.


**Definition of Done:**
- Meet all acceptance criteria above.
- Tests, type-check, and lint pass.
- Preserve contract compatibility.
- Avoid unrelated refactors and new dependencies.

**Dependencies:**  
Hard: TASK-2.5, TASK-7.1. Contract: None.

**Implementation Guidance:**  
Inspect the existing codebase first and follow existing project patterns. Avoid unrelated refactors or new dependencies unless required. Do not introduce new libraries, frameworks, abstractions, or architectural layers unless explicitly required by the Technical Design or necessary to complete this task.

### TASK-9.3: Write Hub operational runbooks and release checklist

**Type:** Infrastructure

**Objective:**  
Document safe operation, recovery and release procedures.

**Task Context:**  
Definition of Done requires operational ownership/runbooks for syncs, retries, projection lag, credentials and migrations.

**Implementation Goal:**  
Repository contains practical runbooks for local bootstrap, migrations, sync recovery, command retry, credential rotation interface, incidents and release gates.

**Scope:**
- Document local setup and Mock ERP.
- Document migration/forward-fix process.
- Document inspecting SyncRuns/checkpoints/stale syncs/failed commands/attempts/change lag.
- Document on-demand sync/manual retry.
- Document credential rotation at interface level.
- Document timeout-after-persist diagnostics.
- Create release checklist covering all Definition of Done and provider gates.


**Out of Scope:**
- Inventing consumer support procedures.
- Choosing monitoring/KMS vendor.
- Automating unresolved provider operations.


**Expected Code Areas:**
- `README/runbooks/`
- `operations documentation`


**Inputs:**  
Implemented Hub behavior and approved environment decisions.

**Outputs:**  
Operator runbooks and release checklist.

**API / Interface Contract:**  
No runtime API.

**Error Cases / Edge Cases:**
- Provider unavailable.
- Checkpoint recovery.
- Permanent command failure.
- Consumer lag.
- Key rotation.


**Implementation Constraints:**
- Runbooks must match real APIs.
- Mark unresolved provider-specific steps.
- No manual DB edits as normal recovery.


**Testing Requirements:**
- Dry-run runbook locally.
- Peer review against release gates.


**Acceptance Criteria:**
- New engineer can bootstrap.
- Operator can diagnose sync/outbound failure without unsafe DB edits.
- Checklist covers migrations, isolation, contracts, Mock idempotency and provider readiness.


**Dependencies:**

**Hard Dependencies:**
- TASK-7.2
- TASK-9.2


**Contract Dependencies:**
- TASK-8.3


**Can Run in Parallel With:**
- None


**Definition of Done:**
- Implementation is complete for the stated scope.
- Required tests pass.
- Type-check and lint pass.
- Public interfaces match the agreed contract.
- Supported failure cases are handled without leaking credentials or unsafe provider payloads.
- No unrelated consumer-product behavior is changed.
- Relevant contract/operations documentation is updated.
- Existing project patterns are followed; no unnecessary framework, library, or abstraction is introduced.

#### Cursor Handoff

**Task:**  
Write Hub operational runbooks and release checklist

**Goal:**  
Repository contains practical runbooks for local bootstrap, migrations, sync recovery, command retry, credential rotation interface, incidents and release gates.

**Relevant Context:**  
Definition of Done requires operational ownership/runbooks for syncs, retries, projection lag, credentials and migrations.

**Implement:**
- Document local setup and Mock ERP.
- Document migration/forward-fix process.
- Document inspecting SyncRuns/checkpoints/stale syncs/failed commands/attempts/change lag.
- Document on-demand sync/manual retry.
- Document credential rotation at interface level.
- Document timeout-after-persist diagnostics.
- Create release checklist covering all Definition of Done and provider gates.


**Do Not Implement:**
- Inventing consumer support procedures.
- Choosing monitoring/KMS vendor.
- Automating unresolved provider operations.


**Interfaces / Contracts:**  
No runtime API.

**Expected Code Areas:**  
`README/runbooks/`, `operations documentation`

**Testing:**
- Dry-run runbook locally.
- Peer review against release gates.


**Definition of Done:**
- Meet all acceptance criteria above.
- Tests, type-check, and lint pass.
- Preserve contract compatibility.
- Avoid unrelated refactors and new dependencies.

**Dependencies:**  
Hard: TASK-7.2, TASK-9.2. Contract: TASK-8.3.

**Implementation Guidance:**  
Inspect the existing codebase first and follow existing project patterns. Avoid unrelated refactors or new dependencies unless required. Do not introduce new libraries, frameworks, abstractions, or architectural layers unless explicitly required by the Technical Design or necessary to complete this task.

# Execution Plan

## Stage 1 - Foundation and Contract Baseline
Run TASK-1.1 and TASK-1.2 in parallel. Then run TASK-1.3 and TASK-1.4 in parallel. Start TASK-2.1 as soon as the repository/migration conventions are available.

## Stage 2 - Persistence and Test Doubles
After TASK-2.1, run TASK-2.2, TASK-2.3, and TASK-2.4 in parallel. TASK-2.5 proceeds once the KMS/RLS decisions are sufficiently resolved. Implement TASK-3.1, then TASK-3.2 and TASK-3.3 in parallel; TASK-3.4 follows Mock ERP backend and TASK-3.5 follows Fake/Mock.

## Stage 3 - Core Engines
Run TASK-4.1 and the outbound workstream TASK-6.1/TASK-6.2 in parallel once their persistence dependencies are stable. TASK-4.2 completes full-sync correctness. TASK-4.4/TASK-4.5 can run in parallel. TASK-4.3 waits only on the scheduler decision. TASK-6.3 follows acceptance; TASK-6.4 is the first major reliability gate.

## Stage 4 - Real Adapters and Consumer Contracts
Run TASK-5.1 and TASK-5.2 independently when provider mapping packs are available. They must not block Mock-based Hub development. In parallel, TASK-8.1 and TASK-8.2 verify the B2B and Sales public contracts.

## Stage 5 - Operations, E2E, and Release Hardening
Add TASK-7.1/TASK-7.2/TASK-7.3 while the runtime matures. TASK-8.3 becomes the complete local system gate. TASK-9.1 should be introduced early and expanded as suites land. TASK-9.2 prepares safe deployment; TASK-9.3 closes with runbooks/release readiness.

# Parallel Workstreams

| Workstream | Focus | Tasks | Blocked By |
|---|---|---|---|
| Foundation | Repo + public contracts | TASK-1.1 to TASK-1.4 | None / contract sequence |
| Persistence | Identity, canonical, sync, outbound | TASK-2.1 to TASK-2.4 | Foundation |
| Security | Secrets, DB isolation, optional RLS | TASK-2.5 | KMS/RLS decisions |
| Test ERP | Fake, Mock service, Mock UI | TASK-3.2 to TASK-3.4 | TASK-3.1 |
| Adapter Quality | Reusable conformance | TASK-3.5 | Fake + Mock |
| Inbound Sync | Engine, scheduler, APIs, change feed | TASK-4.1 to TASK-4.5 | Canonical/sync persistence + ports |
| Real Providers | Heshbonit, Hashavshevet | TASK-5.1, TASK-5.2 | Provider mapping packs |
| Outbound | Acceptance, worker, status, idempotency | TASK-6.1 to TASK-6.4 | Outbound persistence + ports |
| Operations | Logs, metrics, ops APIs, audit | TASK-7.1 to TASK-7.3 | Core runtime |
| Consumer Compatibility | B2B/Sales + E2E | TASK-8.1 to TASK-8.3 | Public APIs |
| Delivery | CI, deployment, runbooks | TASK-9.1 to TASK-9.3 | Progressive |

# Dependency Summary

`TASK-1.1 || TASK-1.2`

`TASK-1.2 -> { TASK-1.3 || TASK-1.4 }`

`TASK-1.1 -> TASK-2.1 -> { TASK-2.2 || TASK-2.3 || TASK-2.4 }`

`TASK-1.3 + TASK-2.1 -> TASK-3.1 -> { TASK-3.2 || TASK-3.3 } -> TASK-3.5`

`TASK-2.2 + TASK-2.3 + TASK-3.1 -> TASK-4.1 -> { TASK-4.2 || TASK-4.4 || TASK-4.5 }`

`TASK-4.1 + Scheduler Decision -> TASK-4.3`

`TASK-2.4 + TASK-3.1 -> { TASK-6.1 || TASK-6.2 }`

`TASK-6.1 -> TASK-6.3`

`TASK-3.3 + TASK-6.1 + TASK-6.2 + TASK-6.3 -> TASK-6.4`

`TASK-3.5 + Heshbonit Mapping Decision -> TASK-5.1`

`TASK-3.5 + Hashavshevet Mapping Decision -> TASK-5.2`

`TASK-4.5 + TASK-6.1 + TASK-6.3 -> { TASK-8.1 || TASK-8.2 }`

`TASK-8.1 + TASK-8.2 + TASK-6.4 + TASK-4.4 + TASK-4.5 -> TASK-8.3`

`TASK-8.3 -> final blocking E2E gate in TASK-9.1`

# Critical Prerequisites

- TASK-1.2/TASK-1.3: stable contracts unlock most independent work.
- TASK-1.4: security contract for all public consumer endpoints.
- TASK-2.1: realistic organization/capability resolution.
- TASK-3.1: provider abstraction unlocks sync/outbound without real ERP access.
- TASK-2.2/TASK-2.3/TASK-2.4: durable state boundaries.
- TASK-3.3: real HTTP/SQLite test boundary before real provider access.
- TASK-4.5 and TASK-6.1/TASK-6.3: consumer-facing contracts required before product cutover work.

# Integration Points

- Contracts <-> APIs/workers: public payloads and adapter DTOs come from packages/contracts.
- Sync engine <-> canonical repositories: canonical upsert and change-event append share transactions.
- Scheduler/API <-> sync engine: both call runSync.
- Outbound API <-> worker: API persists; worker calls provider.
- Worker/sync <-> registry: provider-specific behavior starts only after adapter resolution.
- Mock adapter <-> Mock ERP: real HTTP boundary proves transport/failure/idempotency.
- Hub APIs <-> consumer contract suites: B2B and Sales needs are validated without shared DB.

# Potential Blockers

- Consumer auth mechanism unresolved.
- Heshbonit/Hashavshevet mapping packs or test access unavailable.
- Scheduler technology unresolved.
- Production KMS/key handling unresolved.
- RLS release requirement unresolved.
- Change-feed route unresolved.
- Some canonical field-level requirements need consumer confirmation.
- Operations UI ownership undefined.
- Historical document scope depends on provider support.

# Coverage Matrix

| Requirement / Component | Covered By |
|---|---|
| HUB-001 organizations/bindings | TASK-1.4, TASK-2.1 |
| HUB-002 connections/encrypted credentials | TASK-2.1, TASK-2.5 |
| HUB-003 ERP ports | TASK-3.1 |
| HUB-004 real adapters | TASK-5.1, TASK-5.2 |
| HUB-005 customer/product sync | TASK-1.3, TASK-2.2, TASK-4.1, TASK-5.1, TASK-5.2 |
| HUB-006 customer price sync | TASK-1.3, TASK-2.2, TASK-4.1, TASK-5.1 |
| HUB-021 customer assortment / מגוון sync | TASK-1.3, TASK-2.2, TASK-3.1, TASK-3.2, TASK-3.3, TASK-3.5, TASK-4.1, TASK-4.2, TASK-4.5, TASK-5.1, TASK-8.1, TASK-8.3 |
| HUB-007 financial sync | TASK-1.3, TASK-2.2, TASK-4.1, TASK-5.2 |
| HUB-008 full/incremental sync | TASK-2.3, TASK-4.1, TASK-4.2 |
| HUB-009 scheduled/on-demand same engine | TASK-4.1, TASK-4.3, TASK-4.4 |
| HUB-010 SyncRun/checkpoint/errors | TASK-2.3, TASK-4.1 |
| HUB-011 read APIs/change feed | TASK-4.5 |
| HUB-012 outbound Orders | TASK-1.3, TASK-2.4, TASK-6.1, TASK-6.2 |
| HUB-013 outbound Returns | TASK-1.3, TASK-2.4, TASK-6.1, TASK-6.2 |
| HUB-014 durable async handoff | TASK-2.4, TASK-6.1, TASK-6.2 |
| HUB-015 stable idempotency | TASK-2.4, TASK-6.2, TASK-6.4 |
| HUB-016 command status/errors/external ID | TASK-6.3 |
| HUB-017 Fake ERP | TASK-3.2 |
| HUB-018 HTTP/SQLite Mock ERP | TASK-3.3, TASK-3.4 |
| HUB-019 provider-specific isolation | TASK-3.1, TASK-5.1, TASK-5.2 |
| HUB-020 operational visibility | TASK-7.1, TASK-7.2, TASK-7.3 |
| SEC-001 organization_id isolation | TASK-2.1 to TASK-2.5 |
| SEC-002 encrypted provider credentials | TASK-2.5 |
| SEC-003 consumer creds separate | TASK-1.4, TASK-2.5 |
| SEC-004 consumer binding isolation | TASK-1.4, TASK-8.3 |
| SEC-005 server-side provider calls | TASK-3.1, TASK-6.2 |
| SEC-006 safe logs/diagnostics | TASK-2.5, TASK-7.1, TASK-7.2 |
| SEC-007 least-privilege DB/isolation tests | TASK-2.5, TASK-9.1 |
| SEC-008 audited admin retry/on-demand | TASK-4.4, TASK-7.2, TASK-7.3 |
| B2B consumer contract | TASK-8.1 |
| Sales consumer contract | TASK-8.2 |
| Two-org/two-consumer E2E | TASK-8.3 |
| Mock ERP production prohibition | TASK-3.3, TASK-9.2 |
| CI and migration rebuild | TASK-9.1 |
| Deployment/secrets safety | TASK-9.2 |
| Operational runbooks | TASK-9.3 |

# Final Validation

- Every P0 PRD requirement is mapped to at least one task.
- Every major Technical Design component is represented.
- Contract-first sequencing is explicit.
- Frontend work is separated where it exists: Mock ERP UI is independent from its backend after the HTTP contract is stable.
- Backend work is parallelized across persistence, sync, outbound, adapters, operations, and consumer compatibility.
- Real-provider work is explicitly blocked on missing mapping packs rather than guessed.
- Scheduled and on-demand sync use one engine.
- Consumers never share the Hub database.
- Public requests never trust raw organization IDs as authorization.
- Outbound acceptance is separated from provider success.
- Timeout-after-persist idempotency is a release-blocking E2E task.
- Every task has testable acceptance criteria and a standalone Cursor Handoff.
