# Hub public contract versioning (`packages/contracts`)

`packages/contracts` is the authoritative source for Hub **public** HTTP/JSON contracts unless an explicit architecture decision replaces it.

## Version namespaces

- **`v1`** — Current stable namespace. Import via `@bih/contracts` (`v1` export) or `@bih/contracts/v1`.
- Future breaking releases use a new top-level namespace (`v2`, …). Older namespaces remain available for a documented deprecation window.

## Additive (non-breaking) changes in `v1`

Allowed without a new major namespace:

- New **optional** fields on request or response objects.
- New values in documented enums only when consumers are required to treat unknown enum values safely (forward-compatible parsing).
- New error codes.
- Stricter validation for **inputs** only when the stricter rule rejects values that were never valid per documentation (coordinate with consumers).

## Breaking changes (require a new version)

- Removing or renaming public fields.
- Changing field types or semantics.
- Making optional fields required.
- Tightening output shapes in ways that invalidate previously valid responses.
- Changing pagination, cursor, or money serialization rules.

Breaking public changes **must not** ship under an existing `v1` export. Add `v2` (or bump the documented API path prefix) and migration notes.

## Runtime validation

All public shapes are defined with runtime schemas (Zod) alongside inferred TypeScript types. TypeScript types alone are not sufficient for boundary validation.
