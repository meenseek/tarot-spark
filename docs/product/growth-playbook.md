# Growth And Measurement Contract

## Scope

Use this document for public discovery, event semantics, and privacy-safe
attribution. Acquisition targets, channel choices, campaign limits, commercial
plans, and unpublished copy belong to owner-controlled operating records.
An implementation or measurement gate does not authorize publication.

Keep the complete 78-card runtime deck available as one atomic release. Do not
tie card coverage to an acquisition threshold. Follow the
[product guardrails](guardrails.md) and [card art bible](card-art-bible.md).

## Relationship Question Explorer Contract

Publish relationship discovery as one substantial localized explorer, not as
one thin page per question. The explorer groups 30 reviewed presets into seven
intent categories and connects every choice to the existing reading workflow.
The selected preset may appear in a reading or share URL by stable id; names,
free-form questions, and personal circumstances must not.

Do not create indexable pages for individual presets merely to increase page
count. Consider splitting out a question only after search impressions,
reading starts, and successful prompt copies show durable demand for that
specific intent and there is enough original worked material to make the page
independently useful.

## Measurement Contract

Use only the source and campaign values implemented by the product.

- `source`: `instagram`, `naver`, `disquiet`, `threads`, `kakao`, `native`, `copy`,
  `pinterest`, `reddit`, or `youtube`.
- `campaign`: `demo`, `vertical-slice`, `pick-a-card`, `prompt-education`,
  `profile`, `deck-progress`, or `topic-guide`.

The optional `question_id` is limited to one of the reviewed public preset ids.
Never add localized question text, free-form user questions, names, account
handles, community names, post titles, or personal context to analytics fields
or reading URLs.

Review this funnel by locale, source, campaign, topic, public question preset,
spread, and style:

`draw_start` -> `result_view` -> `prompt_copy`

`result_view` means the result content actually intersected the viewport while
Analytics was active under the applicable site-level and regional controls. Do
not backfill a result that left the viewport before Analytics became ready. Use
`topic_click` separately as topic-selector diagnostics; the default topic can
reach `draw_start` without a topic click.

Review sharing separately:

`share_click` -> one `share_result`

Keep GA acquisition dimensions separate from the product attribution payload.
Use GA `Session source / medium` for standard referrer and campaign acquisition.
Before judging activation by channel, verify in the Tarot Spark GA4 property
that the emitted `source` and `campaign` parameters are available as
[event-scoped custom dimensions](https://support.google.com/analytics/answer/14239696).
Do not create duplicate definitions. In an Exploration, read `draw_start`,
`result_view`, and successful `prompt_copy` with those dimensions over the same
reporting window, excluding known internal use. Record the property, readable
window, and source of the result with the applicable decision evidence. New definitions
may take 24–48 hours to appear in reports; do not treat unavailable historical
values as observed. Event totals alone do not establish a conversion rate:
rates need a consistent attributed cohort and denominator. Until the event
dimensions and denominator are verified, report channel-level product
activation as unavailable instead of substituting session acquisition data.

### Analyzable Sessions

Define an analyzable reading session as a GA session in which:

- Analytics was active under the applicable site-level and regional controls
  before the measured interaction;
- one or more valid `result_view` events occurred; and
- internal, developer, and identified bot traffic was excluded.

Record site-level opt-out rate only when a privacy-approved, aggregate all-visit
denominator exists without identifying users. Otherwise, do not calculate or
claim an opt-out rate. Do not add interactions that occurred before Analytics
became active to the analyzable-session denominator.

### Offer And Checkout Events

Before adding offer or checkout behavior, apply this event contract.

An implementation may add `offer_view`, `offer_click`, `sample_download`, and
`checkout_click` only because the core reading events cannot represent these
actions. Allow only stable `product_id`, `placement`, `locale`, and existing
`source` and `campaign` values. Reject free text, names, email addresses, order
ids, and tarot context. Send events only after analytics is ready and dedupe
session-scoped events. Cover the validator, consent states, dedupe behavior,
and both locales with tests.
