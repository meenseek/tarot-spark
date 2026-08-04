# Card Art Bible

## Direction

Use Quiet Celestial Storybook for all 78 cards. The deck should feel like one
warm, hand-painted world rather than independent fantasy posters or numbered
object sheets.

- Use soft gouache texture, restrained ink detail, aged paper warmth, and
  natural light.
- Use natural, age-appropriate five-to-six-head character proportions.
- Keep faces readable and expressive without chibi anatomy, fashion-doll
  anatomy, glossy 3D rendering, or photorealism.
- Keep celestial marks sparse. Use one dominant tarot symbol and up to two
  supporting symbols per scene.
- Do not place titles, numerals, captions, borders, logos, signatures, or UI
  text inside the source illustration.

## Frame

- Deliver a `5:7` portrait crop at `700 x 980` pixels.
- Keep the top 18 percent available for sky, canopy, architecture, or the
  dominant symbol.
- Keep the main face and hands inside the central 60 percent safe area.
- Use the lower 22 percent for a path, water, plants, tools, or another
  grounding element.
- Preserve enough value contrast for a small card preview. Do not depend on
  fine background detail to identify the card.

## Recurring Cast

Reuse characters across cards with the same facial structure, hair, age range,
and base palette. Clothing may change with the role while recognizable traits
remain.

- Young traveler: anchored by The Fool; may return in The Chariot and
  Temperance. Keep medium-brown skin, short dark curls, an open expression, and
  plum-and-cream clothing.
- Braided gardener: anchored by The Lovers; may return in The Empress and
  Strength. Keep deep-brown skin, long braids with small gold details, and blue
  and ochre clothing.
- Copper-haired maker: anchored by The Lovers; may return in The Magician and
  The Emperor. Keep olive skin, short copper curls, and green-and-cream
  clothing.
- Elder astronomer: anchored by The Star; may return in The High Priestess and
  The Hermit. Keep the older East Asian woman, silver bob, and indigo-and-ochre
  clothing.

Introduce new people when the card requires them, but keep the same proportion,
line quality, rendering, and world. Do not assign virtue, danger, passivity, or
authority to one ethnicity or gender across the deck.

## World And Backgrounds

Build scenes from seven connected location families.

1. Open paths and gardens: mountain paths, orchards, flowering thresholds, and
   cultivated fields for movement, choice, and growth.
2. Stone observatory: a hilltop observatory, moonlit library, water channel, and
   quiet courtyard for intuition, solitude, and renewal.
3. Workshop and civic rooms: a warm workshop, council terrace, and sheltered
   interior for skill, structure, exchange, and responsibility.
4. Wands highlands: dry hills, practice yards, traveler camps, and community
   gathering grounds.
5. Cups waterside: homes, shared tables, courtyards, riverbanks, and coast
   paths.
6. Swords highlands: windy terraces, sparse rooms, bridges, winter roads, and
   open plains.
7. Pentacles lowlands: fields, markets, workshops, home gardens, stores, and
   civic work sites.

Repeat materials such as pale stone, indigo night, dusty blue cloth, plum
fabric, ochre leather, small gold stars, white flowers, and winding paths. Vary
weather and time of day without changing the world.

## Symbol Grammar

- Draw symbols as physical parts of the scene rather than floating icon
  collages.
- Use paths for choice and progression.
- Use water for emotional movement, restoration, and reflection.
- Use paired trees, birds, gates, or hands for reciprocity and decision.
- Use one large star or a restrained constellation for guidance and hope.
- Use tools, vessels, books, and architecture for agency and structure.
- Keep animals natural and card-relevant. Do not add a mascot to every card.
- Avoid hearts, glitter, neon magic, candy gradients, crowns on every figure,
  or decorative symbols with no interpretive role.

## V3 Deck Status And Legacy Audit

The v3 release is one complete 78-card upright deck. It does not ship a mixture
of illustrations and typographic card fronts.

The twelve files under `public/cards/` are immutable v2 sources. The dated audit
in `art/card-art-v3-legacy-audit.json` records these decisions:

- Reuse The Fool, The Lovers, The Chariot, Strength, and Wheel of Fortune
  byte-identically in v3.
- Retouch The Hermit and Temperance only to remove the large eight-point star;
  keep their v2 source bytes unchanged.
- Replace The Magician, The High Priestess, The Empress, The Emperor, and The
  Star with clearer card-specific compositions.

New and retouched files live only under `public/cards/v3/`. The runtime stays on
the preceding complete renderer until all 78 v3 files have independent approval
and one atomic deck release. Loading may show the shared card back. A v3 asset
failure is an explicit retryable error, not a localized name or glyph front.
Immutable v1 and v2 share-image renderers remain available for their existing
URLs.

## Canonical Prompt System

Treat `art/card-art-v3-manifest.json` as the only source for all 78 card
directions, ImageGen mode, prompt, exclusions, cast, locations, suit and rank
rules, exact object counts, frame, generation order, and reference precedence.
Do not rewrite a prompt for an individual run.

Print the exact prompt with:

```text
pnpm run art:v3 -- --card <card-id>
```

Print the prompt, fixed `default` mode, version, SHA-256, and absolute
`referenced_image_paths` values with:

```text
pnpm run art:v3 -- --card <card-id> --json
```

The JSON record contains the exact prompt SHA, card-spec SHA, manifest SHA, and
reference ID-to-asset SHA map. Pass its `referenced_image_paths` unchanged.

Run `pnpm run art:v3:check` before every generation and approval action. The
same check also validates the frozen v2 chain. It rejects canonical-deck drift,
wrong object counts, batches over eight cards, stale prompts or references,
unapproved stage transitions, rewritten ledgers, invalid dimensions or color
components, and individual or total deck size violations.

Normalize a selected candidate with an explicit crop decision:

```text
pnpm run art:v3:normalize -- --input <raw-path> --output <candidate-path> \
  --position <attention|centre|north|northeast|northwest|south|southeast|southwest>
```

## Version And Approval Gate

Keep the approval, generation, style, and release ledgers append-only. Checks
compare their committed prefixes with `HEAD` or the explicit base revision.
The twelve-card legacy audit is an immutable source review only. A retouch's
full-size review, thumbnail review, final asset SHA, and provenance belong in
that card's immutable approval record, never back in the source audit.

The enforced stage order is:

1. Audit the twelve v2 sources.
2. Retouch and independently approve The Hermit and Temperance. Their original
   files may be used only as their own edit targets.
3. Generate and independently approve the sixteen four-suit pilots.
4. Promote exactly two approved pilot anchors per suit and lock a reviewed
   style-history entry.
5. Generate and approve the remaining twelve court cards in two six-card
   validation batches.
6. Generate replacement Majors, new Majors, and numbered Minors in batches of
   at most eight.
7. Review the full 78-card contact sheet, runtime map, metadata, and OG output;
   then append one atomic release record and change `releaseState` from
   `planning` to `released` in the same change.

The pilot style entry stores its own pilot contact-sheet checks. It does not
count as the final deck review. Every release record must separately bind the
78-card contact sheet to the exact released asset map, record an independent
reviewer, time, result, artifact path, and artifact SHA for the contact sheet,
runtime map, metadata, and OG output, and lock all evidence in one release-gate
fingerprint. A release entry and `releaseState` cannot exist independently.

Every stage stops on a failed count, anatomy, text, thumbnail identity, scene
duplication, court-role, safety, or contact-sheet harmony check. A status string
or an unvalidated style entry cannot open the next stage.

## Review Gate

Inspect each image at full size and at the small in-app preview.

- Reject unreadable, asymmetric, duplicated, or malformed faces and hands.
- Reject accidental text, signatures, watermarks, extra limbs, and merged
  objects.
- Reject a crop that removes the dominant symbol or places a face under UI.
- Reject a character whose stable traits drift from the cast table.
- Reject a scene that could identify three or more unrelated cards equally well.
- Reject illustration colors that make the surrounding interface tokens fail to
  frame the card clearly.
- Confirm the `700 x 980` file dimensions and compressed file size before
  committing.
- Confirm the shared card back renders only for loading states.
- Confirm a failed v3 image load exposes a retryable error and never substitutes
  a name or glyph card front.
