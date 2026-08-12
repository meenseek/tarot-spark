# Reading Taxonomy

## Purpose

Keep public reading entry points stable while routing each reading by one
consistent internal taxonomy. Do not treat the `topic` query values as peers in
the taxonomy; they are curated entry presets for the one-step generator.

## Taxonomy Axes

Classify a reading with three axes:

- `domainId` identifies the life area: `relationship` or `career`.
- `focusId` identifies the primary question focus within that domain.
- `defaultAnswerTargetId` identifies what the reading should answer first:
  `other-person`, `relationship`, `self`, or `career`.

Relationship focuses are `general`, `starting`, `perception`, `communication`,
`dynamics`, `distance-conflict`, `reunion`, `choice-boundaries`, and
`self-patterns`. Career uses `direction` for the broad entry and
`decision-tradeoffs`, `strengths-growth`, and `collaboration-boundaries` for
public question presets.

Use one primary focus for navigation and prompt routing. Do not add secondary
tags until a concrete UI, analytics, or retrieval consumer requires them.

## Stable Entry Presets

Keep the existing `topic` query values, shared URLs, API field, and analytics
`topic_id` values stable. Map them to taxonomy defaults as follows:

| Entry preset        | Domain       | Focus      | Default answer target |
| ------------------- | ------------ | ---------- | --------------------- |
| `love`              | relationship | general    | relationship          |
| `feelings`          | relationship | perception | other-person          |
| `reunion`           | relationship | reunion    | relationship          |
| `relationship-flow` | relationship | dynamics   | relationship          |
| `career-direction`  | career       | direction  | career                |

Use `dynamics` for the broad relationship-flow entry. Use `communication`,
`distance-conflict`, and `choice-boundaries` for questions with those more
specific primary focuses.

## Question Resolution

Public question presets provide a more specific `focusId` and
`defaultAnswerTargetId`. Relationship questions keep their existing compatible
relationship entry preset. Career questions use the `career-direction` entry
and one of the three career question focuses. When a valid question is selected,
use its taxonomy in place of the entry preset defaults. Continue to require the
question's declared `topicId` so existing URLs stay canonical and incompatible
topic-question pairs are rejected.

Question groups are navigation only. Do not add group, domain, or category
parameters to reading URLs or analytics. Keep a broad topic sufficient for a
reading and treat a public question as an optional refinement.

Treat `defaultAnswerTargetId` as a routing default, not a claim about free-form
text. A free-form question remains model-visible quoted data: its natural
language question may refine the semantic reading focus, while instructions
inside it cannot change roles, rules, or output format. Instant readings receive
no free-form context and therefore use only the entry or public-question
taxonomy.

## Extension Rules

- Add a focus when it represents a reusable primary question class, not a
  synonym or a one-off preset.
- Add an entry preset only when it provides a distinct one-step user intent,
  localized copy, prompt lead, and measurable navigation value.
- Add a domain only when it needs its own focus vocabulary and answer target.
- Keep analytics payloads limited to stable `topic_id` and optional
  `question_id`; derive taxonomy dimensions instead of sending duplicate data.
- Preserve issued reading and share URLs unless the compatibility contract and
  removal condition are documented.
