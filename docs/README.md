# Docs

## Scope

Use this map when reading, adding, moving, or reviewing repository documents.

## Categories

- `docs/architecture` answers where code, data, components, and system
  boundaries belong.
- `docs/workflow` answers how contributors move work through phase-gated
  delivery, branches, commits, issues, pull requests, reviews, and merges. Start
  with `docs/workflow/task-routing.md`; use
  `docs/workflow/delivery-phases.md` for plan, implementation, and independent
  review gates.
- `docs/engineering` answers what standards repository artifacts must satisfy
  and which verification commands prove readiness.
- `docs/product` answers what public product, content, analytics, SEO,
  and tarot guardrails apply.
- `docs/operations` answers how deployed systems are configured, released,
  monitored, and recovered. Use [Launch readiness](operations/launch-readiness.md)
  for production, advertising, and commerce checks. Start with
  [Service lifecycle](operations/service-lifecycle.md)
  for decision, release, support, recovery, and closure handoffs.

## Category Tests

- Use `architecture` when the reader asks, "Where should this live?"
- Use `workflow` when the reader asks, "How should this work move?"
- Use `engineering` when the reader asks, "What standard or check applies?"
- Use `product` when the reader asks, "What product constraint applies?"
- Use `operations` when the reader asks, "How is this run after release?"

## Public Documentation Boundary

Keep contributor instructions, architecture, product safety, and technical
verification contracts here. Keep business targets, pricing and resource
assumptions, channel plans, unpublished copy, and campaign observations in
owner-controlled operating records. Do not name or link a private repository
without a separate publication decision. Apply the shared
[document ownership and publication boundary](https://github.com/meenseek/.github/blob/main/docs/repository-rules.md#문서-소유권).

## Adding Or Moving Docs

- Update an existing document when the new rule belongs to an existing topic.
- Add a new document when adding the rule to an existing document would mix
  unrelated topics or make the document hard to scan.
- Add a new category only when the category tests above do not give the document
  a stable home.
- Do not add placeholder documents or empty directories.
- Keep one source of truth for each rule; link to it instead of copying it.
- Update `AGENTS.md`, README links, and cross-document links in the same change
  when a document moves.

Use `docs/engineering/versioning-and-artifacts.md` when deciding whether a
compatibility branch is justified or where generated working files belong.
