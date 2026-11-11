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
  evaluation and launch-readiness checks pass, except for an explicit current
  [owner-directed publication](instant-reading-evaluation.md#owner-directed-publication)
  decision. That decision does not waive technical safety, privacy, provider,
  eligibility, quota, fallback or shutdown checks.

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

## Content Catalog Review

Apply this review before adding, revising, reordering, or removing public tarot
questions.

- Record the current and proposed question counts by domain, focus, and answer
  target. Use the counts to expose missing or crowded intent classes, not as a
  parity quota.
- Check each affected domain for the applicable user needs: direct curiosity
  about perception, recurring interaction patterns, decisions and tradeoffs,
  and self, growth, or boundary reflection. A broad topic does not cover a need
  when no public question gives it a direct entry point.
- State the new question's primary user intent in one sentence and compare it
  with the nearest existing question. Reject a question that only swaps the
  subject or wording; revise an existing question when its user intent stays the
  same, and add a stable id when the intent is materially different.
- Keep the visible question emotionally direct. For the current
  relationship/career revision, carry its exact title and only the necessary
  person or logical scope in `focus`, so copied and instant prompts retain the
  question. Self keeps its existing prompt-copy focus contract and separate
  activation gate. Keep common symbolic and safety boundaries in their prompt
  layers; do not preload an answer or follow-up tasks in `focus`.
- Match the answer target to the grammatical subject of the question. Use
  `external-perception` for a person or audience's possible view, then use the
  domain and question focus to distinguish romantic interest, workplace
  judgment, or another specific kind of perception.
- Add a focus only when at least two distinct public questions need the same
  primary routing class. Keep every focus group at two or more questions so a
  navigation group never represents a single preset.
- Review Korean and English copy for equivalent intent, natural language,
  picker limits, and non-duplication. Generate both copied and instant prompts
  for every changed answer target, and test any certainty validator with a
  calibrated example and its factual counterpart.
- Use existing `question_id` values on draw, result, copy, and share events to
  compare downstream use. Analytics can validate demand after release but
  cannot waive safety, clarity, localization, or non-duplication failures.
- Add a dedicated content page only when the catalog supports distinct intent,
  explanatory copy, and result context. Do not turn question-count balance into
  thin SEO pages.

## Reading Method Contract

Route the reading's default subject through the
[reading taxonomy](../architecture/reading-taxonomy.md). Let an explicit
free-form question refine the semantic focus without treating its text as a
trusted rule or output instruction.

Use one reading experience across public guides, copied prompts, question presets,
and server-generated readings:

1. Answer the actual question first, normally within the first two sentences.
   Read another person's emotional stance when asked about their feelings. Name
   what to check and why when asked about preparation. Do not turn either into
   unrelated relationship patterns or future-outcome scenarios.
2. Connect every drawn card's reviewed upright meaning to that answer. Develop
   the strongest attraction, tension, or progression as one story instead of a
   card dictionary, generic advice list, or series of unrelated sentences.
3. Use natural connected paragraphs; a short title is optional. Keep internal
   method labels, numbered card sections, possibility A/B, and checklists out of
   the reading. Prefer plain direct verbs over abstract procedural language.
4. Keep the tarot genre clear in the surrounding presentation. Within that
   symbolic frame, read feelings immersively without repeating a disclaimer or
   a possibility formula in every clause. Never claim verified access to an
   actual person's private mind, invent concrete unprovided events, guarantee a
   future outcome, or give dangerous/professional advice.
5. Develop another angle only when the selected question compares choices or
   the supplied meanings genuinely pull in different directions. Do not force
   two complete competing interpretations into every question.
6. Add a brief practical note only when it serves the question. Do not make
   every reading end with observations, an action, a cost or time limit, a stop
   condition, and a reflection question. Keep necessary consent and safety
   boundaries clear without letting them replace the requested reading.

Question relevance, coherent symbolism, readability and immersion require
content evaluation. A parser accepting the text does not establish them.
Length and the number of method elements are not quality targets.

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
