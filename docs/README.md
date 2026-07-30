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
- `docs/product` answers what product, content, analytics, monetization, SEO,
  and tarot guardrails apply.
- `docs/operations` answers how deployed systems are configured, released,
  monitored, and recovered. Create this directory only when an operations
  procedure exists.

## Category Tests

- Use `architecture` when the reader asks, "Where should this live?"
- Use `workflow` when the reader asks, "How should this work move?"
- Use `engineering` when the reader asks, "What standard or check applies?"
- Use `product` when the reader asks, "What product constraint applies?"
- Use `operations` when the reader asks, "How is this run after release?"

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
