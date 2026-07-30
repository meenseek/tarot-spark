# Card Art Bible

## Direction

Use Quiet Celestial Storybook for the illustrated Major Arcana. The deck should
feel like one warm, hand-painted world rather than 22 independent fantasy
posters.

- Use soft gouache texture, restrained ink detail, aged paper warmth, and
  natural light.
- Use a gentle four-and-a-half-head character proportion.
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

Build scenes from three connected location families.

1. Open paths and gardens: mountain paths, orchards, flowering thresholds, and
   cultivated fields for movement, choice, and growth.
2. Stone observatory: a hilltop observatory, moonlit library, water channel, and
   quiet courtyard for intuition, solitude, and renewal.
3. Workshop and civic rooms: a warm workshop, council terrace, and sheltered
   interior for skill, structure, exchange, and responsibility.

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

## Pilot Assets

- The Fool: `public/cards/the-fool.jpg`; young traveler, dog, open mountain
  path, and dawn star.
- The Lovers: `public/cards/the-lovers.jpg`; recurring pair, offered hands,
  paired birds, and garden threshold.
- The Star: `public/cards/the-star.jpg`; elder astronomer, water ritual,
  observatory, and dominant star.

The pilot files establish the production crop and palette. Existing SVG glyphs
remain the fallback for every card without approved art.

## Canonical Prompt System

Treat `art/card-art-manifest.json` as the only source for the ImageGen mode,
shared prompt, negative prompt, recurring cast, locations, symbol rules,
card-specific direction, output frame, and approved reference images. Do not
copy prompt blocks from this document or rewrite them for an individual run.

Add a future card to the manifest with `draft` status before generating it.
Define its cast, gesture, location, dominant symbol, up to two supporting
symbols, emotional movement, intended asset path, and one or two approved
reference cards. A draft may name an asset that does not exist yet. Reference
cards must already have `approved-pilot` status.

Print the exact prompt with:

```text
pnpm run art:prompt -- --card <card-id>
```

Print the prompt, fixed `default` mode, version, SHA-256, and absolute
`referenced_image_paths` values with:

```text
pnpm run art:prompt -- --card <card-id> --json
```

Pass those reference files with the generated prompt. Use references to
preserve character identity, body proportion, palette, material, line quality,
and world continuity. Do not ask the generator to copy a prior card's
composition.

Run `pnpm run art:check` before and after approving an asset. It validates
prompt hashes, reference paths, approved JPEG dimensions, asset digests, the
style fingerprint, visual review evidence, and append-only version history.

## Version And Approval Gate

Keep `art/card-art-style-history.json` append-only.

- Keep the current version when adding or revising a draft card-specific prompt.
  Review and commit its new prompt SHA-256.
- Append the next `vN` entry before changing an approved card-specific prompt,
  its reference assignment, any cast or location it uses, the shared or negative
  prompt, mode, frame, symbol grammar, reference policy, or bytes of an approved
  reference asset.
- Record every approved pilot asset digest in the new entry.
- Inspect every approved pilot at full size and in the small app frame.
- Set the dated review evidence to approved only after both inspections pass.
- Do not edit, delete, reorder, or reuse an earlier history entry. Local checks
  compare with `HEAD`; CI compares with the pull-request base or pre-push
  revision.

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
- Confirm the SVG glyph still renders when no approved art mapping exists.
