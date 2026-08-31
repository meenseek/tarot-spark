# Reading Taxonomy

## Purpose

Keep public reading entry points stable while routing each reading by one
consistent internal taxonomy. Do not treat the `topic` query values as peers in
the taxonomy; they are curated entry presets for the one-step generator.

## Taxonomy Axes

Classify a reading with three axes:

- `domainId` identifies the life area: `relationship`, `career`, or `self`.
- `focusId` identifies the primary question focus within that domain.
- `defaultAnswerTargetId` identifies what the reading should answer first:
  `external-perception`, `relationship`, `self`, or `career`.

Relationship focuses are `general`, `starting`, `perception`, `communication`,
`dynamics`, `distance-conflict`, `reunion`, `choice-boundaries`, and
`self-patterns`. Career uses `direction` for the broad entry and
`perception-recognition`, `decision-tradeoffs`, `job-search-positioning`,
`strengths-growth`, and `collaboration-boundaries` for public question presets.
Self uses `self-direction`, `money-life`, and `study-projects` for broad entries.
Its public question focuses are `values-decisions`, `habits-growth`,
`money-priorities`, `money-boundaries`, `learning-direction`, and
`project-momentum`.

Use one primary focus for navigation and prompt routing. Do not add secondary
tags until a concrete UI, analytics, or retrieval consumer requires them.

## Stable Entry Presets

Keep the existing `topic` query values, shared URLs, API field, and analytics
`topic_id` values stable. Map them to taxonomy defaults as follows:

| Entry preset        | Domain       | Focus          | Default answer target |
| ------------------- | ------------ | -------------- | --------------------- |
| `love`              | relationship | general        | relationship          |
| `feelings`          | relationship | perception     | external-perception   |
| `reunion`           | relationship | reunion        | relationship          |
| `relationship-flow` | relationship | dynamics       | relationship          |
| `career-direction`  | career       | direction      | career                |
| `self-direction`    | self         | self-direction | self                  |
| `money-life`        | self         | money-life     | self                  |
| `study-projects`    | self         | study-projects | self                  |

Use `dynamics` for the broad relationship-flow entry. Use `communication`,
`distance-conflict`, and `choice-boundaries` for questions with those more
specific primary focuses.

## Question Resolution

Public question presets provide a more specific `focusId` and
`defaultAnswerTargetId`. Relationship questions keep their existing compatible
relationship entry preset. Career questions use the `career-direction` entry
and one of the five career question focuses. A career question may answer
`career` conditions and choices or an `external-perception` such as a manager's
possible view. When a valid question is selected, use its taxonomy in place of
the entry preset defaults. Continue to require the question's declared
`topicId` so existing URLs stay canonical and incompatible topic-question pairs
are rejected.

Self questions use one of the three self entry presets, one of the six self
question focuses, and the existing `self` answer target. Money questions keep
their topic safety instruction even when a selected question replaces the broad
prompt lead.

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

- Add a focus only when at least two distinct public questions need the same
  reusable primary routing class, not a synonym or a one-off preset.
- Add an answer target only when the grammatical subject cannot be represented
  by `external-perception`, `relationship`, `self`, or `career` plus a domain
  focus. A new domain reuses a matching answer target.
- Add an entry preset only when it provides a distinct one-step user intent,
  localized copy, prompt lead, and measurable navigation value.
- Add a domain only when it needs its own reusable focus vocabulary. A domain
  does not require a new answer target when an existing target matches its
  grammatical subject.
- Keep analytics payloads limited to stable `topic_id` and optional
  `question_id`; derive taxonomy dimensions instead of sending duplicate data.
- Preserve issued reading and share URLs unless the compatibility contract and
  removal condition are documented.

## Self Catalog Decision Record

The catalog grows from 44 to 62 questions. Domain counts move from
`relationship: 30, career: 14` to
`relationship: 30, career: 14, self: 18`. Answer-target counts move from
`external-perception: 8, relationship: 14, self: 12, career: 10` to
`external-perception: 8, relationship: 14, self: 30, career: 10`. Each self
question focus owns exactly three questions.

The following comparison records why each addition is a distinct user intent,
not a subject-only rewrite of its nearest existing question.

<!-- markdownlint-disable MD013 -->

| New question               | Primary intent                                      | Nearest existing ID           | Distinction                                                   |
| -------------------------- | --------------------------------------------------- | ----------------------------- | ------------------------------------------------------------- |
| `self-priority-now`        | Rank competing life priorities                      | `career-stay-or-prepare`      | Broader than choosing a career direction                      |
| `self-expectation-source`  | Trace an internalized standard                      | `career-manager-expectations` | Does not infer another person's current expectation           |
| `self-review-condition`    | Define evidence that reopens a choice               | `small-test`                  | Sets a review condition rather than a relationship experiment |
| `self-repeating-delay`     | Identify the reader's initiation-delay loop         | `broken-contact-pattern`      | Does not analyze mutual contact                               |
| `self-energy-focus`        | Allocate limited effort                             | `career-opportunity-cost`     | Does not select a career path                                 |
| `self-supportive-pattern`  | Preserve an already-helpful behavior                | `career-underused-strength`   | Does not discover a trait or strength                         |
| `money-spending-priority`  | Protect an ongoing essential spending priority      | `career-opportunity-cost`     | Uses factual spending instead of forecasting an opportunity   |
| `money-want-or-need`       | Separate emotional spend from a recorded need       | `person-or-familiarity`       | Does not analyze attachment to a person or routine            |
| `money-sustainable-habit`  | Choose a repeatable money record or limit           | `career-sustainable-boundary` | Does not set a workplace boundary                             |
| `money-big-purchase-check` | Verify actual cost and terms before commitment      | `career-opportunity-cost`     | Does not predict opportunity gain, cost, or affordability     |
| `money-shared-cost`        | Set financial terms before money changes hands      | `unspoken-expectations`       | Is narrower than general unspoken relationship roles          |
| `money-helping-boundary`   | Set a giving boundary before a transfer             | `swallowed-boundary`          | Does not infer affordability or a general relationship limit  |
| `study-next-focus`         | Select one bounded knowledge area to test           | `career-growth-experience`    | Does not choose a career-building experience                  |
| `study-method-fit`         | Compare retention with the study method             | `career-role-fit`             | Does not compare role demands with strengths                  |
| `study-feedback-gap`       | Choose practice or explanation for a learning block | `conversation-to-start`       | Does not choose a relationship conversation                   |
| `project-next-step`        | Decompose a deliverable into one verifiable piece   | `small-test`                  | Does not test an interpersonal assumption                     |
| `project-scope-boundary`   | Remove non-core deliverable work                    | `career-sustainable-boundary` | Does not set a workplace time or role boundary                |
| `project-pause-signal`     | Predefine a project pause checkpoint                | `continue-slow-stop`          | Does not choose an immediate relationship direction           |

<!-- markdownlint-enable MD013 -->
