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
2. Stone observatory: a hilltop observatory, moonlit library, water channel,
   and quiet courtyard for intuition, solitude, and renewal.
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

## Current Runtime Contract

- The application ships exactly one upright illustration for each of the 78
  stable card ids.
- Final files live in the immutable `/cards/v3/` asset namespace. The namespace
  is a cache identity, not a runtime compatibility branch.
- `cardArtSources` is the only runtime source map. Do not add an old source map
  or a renderer selector.
- Keep the shared card back visible while an image loads. On failure, keep the
  back visible and show the localized retry control. Reveal the face only after
  a successful load; never substitute a title or glyph face.
- The lightweight asset test locks the exact 78 filenames, dimensions, size
  bounds, source map, and aggregate SHA-256 of the released bytes.

If any final image bytes change, use a new immutable asset namespace, replace
the one runtime source map, and change the share-image cache revision. Do not
reuse a previously cached path and do not preserve the old renderer.

## Future Production Work

Keep prompts, raw generations, rejected attempts, candidates, contact sheets,
repair files, and approval working data outside the application repository.
The ignored `art/card-art-*` path is available only as a temporary local
workspace. Use a separate durable archive when provenance must be retained.

Before copying a future final deck into the application:

1. Complete full-size, thumbnail, safety, and whole-deck reviews outside this
   repository.
2. Copy only the final 78 compressed JPEGs into a new immutable namespace.
3. Replace `cardArtSources`, update the aggregate fingerprint, and change the
   share-image cache revision in the same change.
4. Run all code-bearing verification gates. Do not commit partial decks.

## Review Gate

Inspect each image at full size and at the small in-app preview.

- Reject unreadable, asymmetric, duplicated, or malformed faces and hands.
- Reject accidental text, signatures, watermarks, extra limbs, and merged
  objects.
- Reject a crop that removes the dominant symbol or places a face under UI.
- Reject a character whose stable traits drift from the cast table.
- Reject a scene that could identify three or more unrelated cards equally
  well.
- Reject illustration colors that make the surrounding interface tokens fail
  to frame the card clearly.
- Confirm the `700 x 980` dimensions and compressed file size.
- Confirm loading, localized retry, and post-retry reveal behavior in both
  locales.
