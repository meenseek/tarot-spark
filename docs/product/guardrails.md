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
