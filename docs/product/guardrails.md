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

## Public Copy Contract

- Write for a first-time reader. Use familiar words, short sentences, and one
  idea per line.
- Keep internal taxonomy and method terms out of controls. Prefer words such as
  "question", "look", "choose", and "try" over "preset", "focus taxonomy",
  or "reflection framework".
- Give question pickers four visible levels only: a short group name, one
  question, one sentence explaining it, and one action label. Keep safety and
  prompt-routing instructions in the internal `focus` field.
- Ask one open question at a time. Do not hide a second question after "and" or
  use a title that promises a certain future result.
- Make each summary add one concrete contrast, behavior, or choice. Do not
  restate the title with more abstract words.
- Start action labels with a plain verb and name the object. Do not use generic
  labels such as "Learn more" when the action is to compare, find, or check.
- Prefer these picker limits. Korean: group title 12 characters, group intro 36,
  question title 24, summary 36, and action 10. English: group title 4 words,
  group intro 12, question title 10, summary 14, and action 4. Treat the limits
  as review gates for picker copy, not as truncation rules.
- Keep Korean and English editorially equivalent, but write each as natural
  copy rather than translating word for word.
- Read every visible line without its surrounding UI. Rewrite it if its meaning
  depends on an internal term or if a shorter familiar phrase keeps the same
  meaning and safety boundary.

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
- When configured, default Analytics and allowlisted AdSense delivery on unless
  the browser has a valid site-level opt-out. Preserve every valid stored choice.
- In the EEA, UK, and Switzerland, default `analytics_storage`, `ad_storage`,
  `ad_user_data`, and `ad_personalization` to denied before Google tags run.
  Only a Google-certified regional CMP may grant those signals there; the local
  privacy control may impose an additional opt-out but must not grant regional
  consent.
- Keep AdSense's production script gate off until the certified CMP, TCF
  integration, Consent Mode updates, route isolation, and withdrawal behavior
  are verified together.
- Do not load AdSense on the interactive reading routes that contain the
  free-form situation or relationship field.
- Let users revise optional-service choices.
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
  viewport after analytics is active; do not backfill a view that ended before
  analytics became ready.
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
