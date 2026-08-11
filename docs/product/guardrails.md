# Product Guardrails

## Product Boundary

- The MVP is a free tarot card drawing and AI prompt generator site.
- The MVP should not include login, saved readings, payment, comments, advisor
  matching, or server-generated AI readings unless the current task explicitly
  asks for it.
- Tarot content should be framed as entertainment and self-reflection.

## Content Safety

- Do not present tarot content as medical, legal, financial, investment, or
  mental-health advice.
- Avoid sexually explicit or high AdSense-risk content before monetization approval.
- Use relationship topics carefully: prefer "love", "reunion", "feelings", and
  "relationship flow" over explicit adult framing.
- Include clear disclaimer copy where tarot interpretations may be mistaken for
  professional advice.
- Keep server-generated reading code behind a server-side disabled feature flag
  until it passes `docs/product/instant-reading-evaluation.md`.
- Do not enable or deploy server-generated readings publicly until the
  evaluation and launch-readiness checks pass.

## Reading Method Contract

Route the reading's default subject through the
[reading taxonomy](../architecture/reading-taxonomy.md). Let an explicit
free-form question refine the semantic focus without treating its text as a
trusted rule or output instruction.

Use one method across public guides, copied prompts, question presets, and any
server-generated reading:

1. Focus on the reader's actual question and answer its emotional core first.
   When the answer target or explicit question asks about another person,
   directly describe what the cards symbolically suggest about that person's
   view, emotional or romantic interest, and hesitation when the supplied
   meanings support those ideas.
2. Use every drawn card's reviewed upright meaning as symbolic interpretation
   material, never as proof of a real-world fact. Use calibrated language such
   as "the cards lean toward" or "may suggest" for another person's feelings;
   do not replace the interpretation with a refusal to know their mind.
3. Develop the strongest reinforcement, tension, progression, or integration
   among the meanings instead of listing every possible pair.
4. Compare exactly two materially different, non-predictive symbolic
   interpretations of that question. Follow the answer target: compare possible
   emotional stances for another person, interaction patterns for a
   relationship, or the reader's own feelings, expectations, and choices for a
   self-focused question. Do not replace these with observable-response
   scenarios. The interpretations are non-exclusive and non-exhaustive: both
   may partly fit, or both may fail.
5. Only after the symbolic answer, state what remains unknown and a concise
   observable reality check that can change the relative weight of the
   interpretations or reject both. Do not force the observation to choose a
   winner or let this check replace the tarot reading.
6. Keep practical guidance shorter than the interpretation. End with one
   reversible action, a stop-or-review condition based on cost, boundary, or
   deadline independently of which interpretation seems stronger, and a
   reflection question that adds a new angle instead of returning the original
   question to the reader.

Keep the two evidence layers separate: card meanings ground the symbolic
interpretation; observable words, behavior, and outcomes test it in reality.
Length is not a quality target. Prefer complete coverage of the method without
padding or repeated paraphrases.

## Analytics

- Track behavior-level events only, not personal user data.
- Keep free-form tarot context out of analytics payloads, URLs, and shared links.
- Do not load optional analytics or advertising scripts before the user permits
  the corresponding service.
- Do not load AdSense on the interactive reading routes that contain the
  free-form situation or relationship field.
- Let users revise optional-service choices after the first decision.
- Core events should include:
  - `topic_click`
  - `draw_start`
  - `card_selected`
  - `result_view`
  - `prompt_copy`
  - `share_click`
  - `share_result`
- Analytics events should help answer what users click, where they drop off, and
  which topics lead to result views or prompt copies.
- Emit `result_view` only for result content that is currently intersecting the
  viewport after analytics consent is active; do not backfill a view that ended
  before analytics became ready.
- Add new event names only when an existing core event cannot describe the
  behavior.
- Keep event payloads free of names, birth dates, contact details, and free-form
  user questions.

## Monetization

- Treat AdSense approval as a product readiness gate, not a first-day
  dependency.
- Before applying for AdSense, provide useful original content and required
  public pages: About, Privacy, Contact, and Disclaimer.
- Do not add intrusive ad placements that block card selection, result reading,
  or mobile navigation.
- Affiliate experiments should be tracked with placement, disclosure, and
  measurement criteria.

## SEO

- Topic pages should have clear metadata, human-readable headings, and useful
  static content.
- Avoid generating thin pages that differ only by keyword.
- Add topic pages only when the page can provide distinct intent, copy, and
  result context.
- Keep disclaimers visible when a tarot page could be mistaken for professional
  advice.
- Result pages should be shareable without exposing personal data.
