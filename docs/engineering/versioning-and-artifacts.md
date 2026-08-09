# Versioning And Generated Artifacts

## Purpose

Keep compatibility work proportional to real consumers and keep production
repositories focused on current runtime behavior. This standard applies to API
contracts, URL parameters, cached output, persisted browser data, generated
assets, and compatibility tests.

## Default To One Current Contract

Do not add a version, old implementation branch, migration path, or
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

Package versions, provider API versions, consent or session migrations, and
evaluation identifiers may remain when they label a real package, external
provider contract, persisted state, or durable result. An identifier alone does
not justify a second runtime implementation.

## Cache Revisions Are Not Protocol Versions

A cache revision changes the identity of immutable output. It must not choose
among renderers or business rules.

- Keep one renderer and accept exactly the current cache revision.
- Reject missing, duplicate, unknown, and retired revisions.
- Change the revision whenever renderer output or another pixel-affecting input
  changes.
- Replace the revision constant and current tests; do not add a branch for the
  old value.
- Use a new immutable asset namespace when asset bytes change. An old namespace
  may remain in Git history or storage without remaining in the runtime map.

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

When a version or generated pipeline appears necessary:

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
