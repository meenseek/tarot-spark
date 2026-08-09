# Versioning And Generated Artifacts

## Purpose

Keep compatibility work proportional to real consumers and keep production
repositories focused on current runtime behavior. This standard applies to API
contracts, URL parameters, cached output, persisted browser data, generated
assets, and compatibility tests.

## One Release Version, One Current Contract

The package release in `package.json` is the product's only internal sequential
version. Do not add prompt, schema, runner, deck, algorithm, storage, or cache
`vN` labels. Do not add an old implementation branch, migration path, or
compatibility test only because code was deployed or an intermediate state
existed. A compatibility boundary requires at least one real consumer outside
the implementation being changed:

- an external client or integration;
- already issued URLs whose continued behavior is promised;
- persisted data that a current client must still read; or
- independently deployed clients that cannot move atomically.

Before adding a compatibility branch, document the consumer, the observable
contract, the support owner, the support duration, and the removal condition.
If these facts are absent, replace the current implementation atomically.

Dependency, tool, provider API, and provider model versions remain when they are
official external contracts. Browser records use stable keys and exact-shape
validation rather than internal schema numbers. Evaluation runs use neutral run
ids and content hashes rather than sequential version labels. An identifier
alone does not justify a second runtime implementation.

## Content Identity And Caching

Use a byte or source-content SHA-256 when durable evidence needs an identity.
A content hash is not a release version and must not select among renderers or
business rules.

- Keep one renderer and stable canonical URLs.
- Use bounded shared caching and revalidation for mutable canonical output.
- Do not add manual cache-revision query parameters or numbered asset paths.
- Cache only valid public output. Return `no-store` for invalid input and
  query-normalization redirects. A public asset URL's documented 301/308
  migration may remain cacheable through its sunset period.
- Keep byte fingerprints as integrity gates, not URL selectors.

## Persisted Browser Data

- Use stable storage keys and validate an exact object shape.
- When the shape changes, replace the current record atomically and request a
  new privacy choice when required; do not create a numbered key.
- Keep optional services disabled until a valid current consent record exists.
- Remove obsolete private-context handoffs by namespace prefix so sensitive
  text does not linger after a cutover.
- Preserve concurrency behavior with purpose-named change ids, not revision
  labels.

## Compatibility Test Standard

A compatibility test is valid only when its older behavior is still an active,
documented contract for a real consumer.

- Test frozen public inputs and expected outputs from that contract.
- Do not derive old expectations from current domain semantics.
- Do not call a current renderer and label its output as an old version.
- Do not use Git `HEAD`, branch names, commit availability, or mutable
  repository history as ordinary unit-test fixtures.
- When support ends, delete the old branch, fixtures, and tests together.

Current-contract tests should verify the behavior that is actually shipped:
accepted input, rejected input, output shape, cache policy, localization,
security filtering, and failure recovery.

## Generated Artifact Retention

The application repository keeps only artifacts required at runtime and a
small deterministic integrity gate.

- Keep final optimized assets, their runtime source map, and a released-byte
  fingerprint.
- Keep raw generations, rejected attempts, candidates, contact sheets, repair
  work, and large provenance ledgers in an ignored local workspace or a
  separate archive.
- Remove one-off generation scripts after delivery. Retain a pipeline only when
  it is an active repeatable operation with an owner, documented inputs, and a
  maintained verification gate.
- Never make routine tests depend on a full Git history solely to validate a
  completed generation ledger.

Use `art/card-art-*` only for temporary local card-art work. It is ignored by
Git. Unrelated `art` projects are outside that ignore rule and must not be
deleted as part of card-art cleanup.

## Change Checklist

When an additional identifier or generated pipeline appears necessary:

1. Identify the concrete external or persisted consumer.
2. Decide whether this is compatibility, cache invalidation, data migration, or
   result labeling.
3. Prefer one current implementation unless compatibility is proven.
4. Define removal criteria before introducing a temporary branch.
5. Keep tests independent of mutable Git state.
6. Retain only final runtime artifacts in this repository.
7. Verify that old constants, renderers, assets, scripts, tests, CI settings,
   package dependencies, and documentation are removed together.

Deleting current files does not remove objects from published Git history.
History filtering, force-pushing, and collaborator migration are separate,
destructive operations and require explicit approval and a recovery plan.
