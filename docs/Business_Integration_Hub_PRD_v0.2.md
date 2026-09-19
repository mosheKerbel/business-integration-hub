# Business Integration Hub — Platform Requirements Document

**Version:** 0.2  
**Document language:** English  
**Document date:** 2026-09-18  
**Consumers:** Nofar B2B Commerce; Smart Sales & Distribution Platform  
**Purpose:** Shared business-system integration, canonical operational data, synchronization, and reliable outbound command delivery

---

## 1. Product / Platform Purpose

The **Business Integration Hub** is a separately deployable platform service used by multiple business applications that need synchronized data from ERP systems and reliable writes back to those systems.

The Hub exists to remove duplicated ERP adapters, fake/mock ERP applications, synchronization schedulers, cursors, retry logic, idempotency handling, normalized ERP tables, and integration monitoring from individual products.

The Hub is **not** a commerce application and is **not** a sales application. Product-specific workflows remain owned by the consuming products.

### 1.1 Initial consumers

1. **Nofar B2B Commerce** — consumes Customer, Product, CustomerAssortment, CustomerPrice and later order-history projections; authenticated catalog eligibility is constrained by the ERP-owned Customer Assortment (Hebrew business term: **מגוון**); submits an Order to the Hub only after B2B Backoffice approval and B2B payment eligibility are satisfied.
2. **Smart Sales & Distribution Platform** — consumes Customer, Product, financial and other supported ERP projections; submits Sales Orders and Returns according to its own product workflow.

### 1.2 Naming

The project and service name is **Business Integration Hub** (`business-integration-hub`).

The name intentionally avoids `ERP Syncer` because the service owns more than synchronization and may later integrate additional business systems while retaining the same canonical contracts.

---

## 2. Core Principles

1. **External systems remain sources of truth.** The Hub stores operational canonical copies and integration metadata; it does not redefine ERP accounting semantics.
2. **Canonical contracts are provider-agnostic.** Heshbonit, Hashavshevet and future providers are adapter implementations, never consumer-domain concepts.
3. **Product workflows remain outside the Hub.** Approval, payment, promotions, offline UX, AI, risk, and application-specific authorization are consumer responsibilities.
4. **One synchronization engine.** Scheduled and on-demand synchronization execute the same pipeline and create the same `SyncRun` records.
5. **Durable handoff before external effects.** Every outbound ERP action is durably recorded before the provider call.
6. **Stable idempotency across retries.** A retry after timeout must not create a duplicate ERP document.
7. **Organization isolation.** Data, credentials, sync state, cursors and commands are isolated by Hub `organization_id`.
8. **Consumer isolation.** A consumer receives only the organizations/capabilities/scopes explicitly bound to it.
9. **No shared-database coupling with products.** Consumers use Hub APIs/change feeds and keep their own product-appropriate local projections.
10. **Observability without secrets.** Sync and command diagnostics are inspectable without exposing credentials or unsafe raw payloads.

---

## 3. Scope

### 3.1 P0 capabilities

| ID | Requirement |
|---|---|
| HUB-001 | Maintain organizations and consumer-to-organization bindings. |
| HUB-002 | Store tenant/organization-scoped integration connections and encrypted provider credentials. |
| HUB-003 | Provide generic capability-based ERP adapter contracts. |
| HUB-004 | Implement Heshbonit and Hashavshevet adapters as separate provider modules when provider mappings are available. |
| HUB-005 | Synchronize Customers and Products from ERP into canonical Hub tables. |
| HUB-006 | Synchronize Customer Prices for B2B where supported. |
| HUB-007 | Synchronize financial snapshots/open documents for Sales where supported. |
| HUB-008 | Support full synchronization and incremental/cursor-based synchronization where the provider supports it. |
| HUB-009 | Support periodic scheduled synchronization and authorized on-demand synchronization through the same engine. |
| HUB-010 | Persist `SyncRun`, checkpoint/cursor, counts, timestamps and sanitized errors for every run. |
| HUB-011 | Expose canonical read APIs and an incremental change feed so consumers can maintain local projections. |
| HUB-012 | Accept canonical outbound Order commands from authorized consumers. |
| HUB-013 | Accept canonical Return commands for consumers that use returns. |
| HUB-014 | Persist outbound commands before provider transmission and process them asynchronously. |
| HUB-015 | Guarantee stable idempotency for one logical external document creation across retries. |
| HUB-016 | Expose outbound command status, safe errors and external document ID when known. |
| HUB-017 | Provide an in-process Fake ERP adapter for fast tests. |
| HUB-018 | Provide a standalone HTTP + SQLite Mock ERP for integration/E2E testing, deterministic seed/reset and fault simulation. |
| HUB-019 | Keep provider-specific fields/statuses/mappings inside adapter modules. |
| HUB-020 | Provide operational views/APIs for sync runs, failed commands, retries and connection health. |
| HUB-021 | Synchronize Customer Assortment (customer-to-product membership / **מגוון**) for B2B where supported. |

### 3.2 Explicit non-goals

The Hub does **not** own:

- B2B Cart, Promotions, Upsell, Payment or Backoffice approval rules;
- Sales offline behavior, route/visit workflows, Excel inventory, AI, Risk or Insights;
- end-user identity/login for either product;
- product feature entitlements or release flags;
- product-specific UI localization;
- customer-facing success semantics;
- business decisions about when a product is allowed to transmit an order.

---

## 4. Canonical Data Ownership

The Hub owns the normalized representation of data originating in integrated business systems.

| Canonical area | Initial source(s) | Initial consumers |
|---|---|---|
| Customer master | Heshbonit / Hashavshevet | B2B, Sales |
| Customer contacts/addresses | ERP when supported | Sales; B2B where needed |
| Product master / SKU | Heshbonit / Hashavshevet | B2B, Sales |
| UOM/reference mapping | ERP when supported | Sales; B2B where needed |
| Customer final price | Heshbonit initially | B2B |
| Customer assortment membership (`Customer ↔ Product`, **מגוון**) | Heshbonit initially | B2B |
| Financial snapshot/open documents | Hashavshevet initially | Sales |
| ERP order/history documents | ERP where supported | Sales; later B2B history |
| Outbound ERP order identity/status | ERP via Hub | B2B, Sales |
| Outbound return identity/status | ERP via Hub | Sales |

### 4.1 Local product projections

Each consumer maintains its own local projection where needed for performance, offline behavior, RLS, Payload relationships, AI, or product-specific querying.

A Hub canonical record therefore does not replace product-owned tables such as B2B `ProductContent`, Sales risk/AI tables, carts, orders or payments.


### 4.2 Customer assortment semantics

Customer assortment is a first-class ERP-owned fact and is **separate from CustomerPrice**.

The Hub canonical model SHALL represent explicit positive Customer-to-Product membership for the consumer organization. Provider adapters normalize provider-specific assortment mechanisms into provider-neutral `CustomerAssortment` records.

Required semantics:

- an active `CustomerAssortment` relation means the Product belongs to that Customer's current ERP-defined assortment;
- absence/inactive assortment means the Product is not in that Customer's assortment;
- a missing `CustomerPrice` MUST NOT be interpreted as absence from assortment;
- a price record MUST NOT grant assortment membership;
- a Product may be in assortment while its price is temporarily unavailable, and consumers must handle that as a pricing/freshness error rather than silently hiding the distinction;
- full-sync missing-record deactivation may be used only when the adapter declares the returned assortment dataset authoritative for the completed full run.

For Nofar B2B, the confirmed product behavior is that an authenticated Customer sees only Products in its active assortment, further constrained by B2B-owned visibility/content rules. The Hub owns only the source assortment fact; B2B owns the UI/catalog behavior.

---

## 5. Synchronization Requirements

### 5.1 One execution path

Scheduled and on-demand sync use the same execution model:

```text
Scheduler / Authorized API request
  -> create SyncRun
  -> resolve organization + connection + adapter capability
  -> load checkpoint/cursor
  -> pull page(s)
  -> normalize provider records
  -> transactional canonical upsert
  -> append change events
  -> advance checkpoint only after committed data
  -> complete SyncRun
```

### 5.2 Idempotency

Inbound upserts use stable organization/source/external identifiers. Reprocessing the same provider page must converge to the same canonical state.

### 5.3 Failure behavior

- A failed run does not destroy the last good canonical data.
- Checkpoints are advanced only after the relevant data is safely committed.
- One organization's failure does not stop unrelated organizations.
- Retryable and non-retryable errors are classified separately.
- Raw provider secrets and unsafe payloads are not exposed to consumers.

### 5.4 Freshness

Every canonical source record exposes sufficient freshness metadata for consuming products to display or enforce their own staleness rules.

---

## 6. Consumer Projection Contract

The Hub must provide a cursor-based change feed or equivalent incremental API with:

- monotonically ordered consumer cursor semantics;
- organization scope;
- canonical entity type;
- entity ID;
- operation (`upsert` / `delete` or deactivation semantics);
- canonical version;
- source-updated timestamp when available;
- Hub committed timestamp.

A consumer acknowledges progress by persisting its own cursor. The Hub does not directly write into a consumer database.

---

## 7. Outbound Command Requirements

### 7.1 Product authorization boundary

A consumer calls the Hub only **after** its own business rules authorize the action.

Examples:

- B2B performs approval + payment gating before sending the canonical order command.
- Sales performs its own submit/return rules before sending the command.

The Hub does not reimplement those product rules.

### 7.2 Hub responsibility after acceptance

After accepting a valid command, the Hub owns:

1. durable command persistence;
2. adapter resolution;
3. provider mapping;
4. provider call;
5. timeout/error classification;
6. retry schedule;
7. stable idempotency key;
8. provider attempt history;
9. external document identity;
10. status notification/API to the consumer.

### 7.3 Status

Initial generic command states:

```text
accepted -> pending -> processing -> succeeded
                              \-> failed
```

`failed` may be retryable or permanent. Consumer products may map these states to their existing UI/status models.

---

## 8. Mock / Fake ERP Requirements

### 8.1 Fake adapter

An in-process Fake adapter supports deterministic unit/application tests with programmable success, timeout, retryable failure and non-retryable failure. It MUST support CustomerAssortment fixtures independently from CustomerPrice fixtures so tests can prove assortment and pricing are separate facts.

### 8.2 Mock ERP

A standalone local/test service:

- communicates only through HTTP;
- uses its own SQLite database;
- has deterministic seed/reset, including at least two Customers with different assortments;
- stores simulated Customers, Products, CustomerAssortments, Prices, Financials where needed, Orders and Returns; assortment and price fixtures are independently configurable;
- exposes a minimal developer UI;
- supports latency and failure simulation;
- supports `timeout_after_persist` to prove external idempotency;
- never shares the Hub PostgreSQL database;
- is prohibited from production customer configuration.

---

## 9. Security and Isolation

| ID | Requirement |
|---|---|
| SEC-001 | Every organization-owned Hub row carries `organization_id`. |
| SEC-002 | Provider credentials are encrypted server-side and never returned to consumers. |
| SEC-003 | Consumer credentials/scopes are separate from ERP credentials. |
| SEC-004 | Consumer A cannot access an unbound organization or capability. |
| SEC-005 | Provider calls are made only server-side. |
| SEC-006 | Logs and persisted diagnostics exclude secrets and unnecessarily sensitive raw payloads. |
| SEC-007 | Runtime database identity is least privilege; organization isolation is tested. |
| SEC-008 | Administrative retry/on-demand actions are authenticated, authorized and audited. |

---

## 10. Operational Requirements

The Hub exposes operational visibility for:

- connection health;
- latest successful sync per capability;
- stale syncs;
- sync run counts/durations/errors;
- consumer projection lag where measurable;
- outbound queue age;
- failed/retryable/permanent commands;
- provider latency/error rate;
- idempotency conflict detection.

---

## 11. Initial Consumer Responsibilities

### 11.1 B2B Commerce

B2B retains:

- CustomerUser/OTP;
- ProductContent and commerce configuration;
- Promotions/Upsell;
- Cart;
- Payment;
- Order revisions;
- Backoffice approval/cancellation;
- determination of ERP-send eligibility;
- local product/customer/price projection used by Payload/storefront.

### 11.2 Sales Platform

Sales retains:

- users/roles/features;
- customer/product/financial local projections used by Sales UX;
- Excel Inventory Provider and inventory snapshots;
- offline/PWA data;
- sales/return business workflow;
- field work;
- AI/Risk/Insights;
- product-visible sync status projection.

---

## 12. Acceptance Criteria

The extraction is accepted when:

- both products run without embedded ERP provider adapters;
- both products run without their own Mock/Dummy ERP implementation;
- Heshbonit and Hashavshevet provider-specific mapping exists only in Hub adapter modules;
- periodic and on-demand inbound synchronization use one Hub pipeline;
- both consumers can rebuild their local projections from Hub canonical/change APIs;
- B2B can rebuild CustomerAssortment independently from CustomerPrice, and test data proves two customers may see different product sets even when the merchant Product master is shared;
- B2B checkout/order approval semantics are unchanged;
- Sales order/offline semantics are unchanged;
- outbound timeout/retry creates no duplicate external order in Mock ERP;
- two Hub organizations and two consumers pass isolation tests;
- provider credentials never enter either product;
- existing product UIs can display external document status and safe integration failures through Hub-derived status.

---

## 13. Deferred / Future Capabilities

- WMS / external inventory connectors;
- additional non-ERP business systems;
- push/webhook delivery instead of or in addition to polling change feeds;
- richer data-quality/reconciliation UI;
- provider-specific historical document synchronization beyond current consumer needs;
- cross-provider composition for one organization by capability.
