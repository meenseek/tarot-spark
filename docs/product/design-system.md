# Visual Design System

## Direction

Use the Quiet Celestial Editorial Paper direction across every public route.
Keep the interface warm, restrained, and editorial rather than dark, glossy, or
pastel-heavy.

## Semantic Tokens

| Role           | Value     | Usage                                        |
| -------------- | --------- | -------------------------------------------- |
| Canvas         | `#FBF7F2` | Page background                              |
| Paper          | `#FFFDFC` | Cards and workspaces                         |
| Ink            | `#3A2633` | Primary text                                 |
| Muted ink      | `#66515D` | Secondary text                               |
| Action         | `#704158` | Actions, focus, selection, editorial accents |
| Action hover   | `#5E334C` | Hovered primary actions                      |
| Action pressed | `#4F293F` | Pressed actions and controls                 |
| On action      | `#FFFDFC` | Text and icons on action surfaces            |
| Blush          | `#E9D2DD` | Selected controls and Daily question inset   |
| Strong blush   | `#DFC2D0` | Hovered and pressed blush surfaces           |
| Border         | `#8B737F` | Interactive boundaries                       |
| Divider        | `#D9CCD2` | Non-interactive separators                   |
| Gold           | `#B7863E` | One-pixel decorative lines only              |
| Danger         | `#8C2F4A` | Action failure feedback                      |
| Success        | `#2F604E` | Action success feedback                      |

Define implementation values once as `--ts-*` properties in
`src/app/globals.css`. Components should consume semantic `ts-*` utilities
instead of palette utilities or color literals.

## Shape And Type

- Use a 14px radius for major workspaces.
- Use a 12px radius for cards and rectangular controls.
- Use a 16px radius for the Daily question inset.
- Use a fully rounded shape only for compact segmented controls.
- Use the display serif for hero headings, card names, and the Daily question.
- Use the sans-serif stack for body text and controls.
- Keep Korean display text unbroken by word with `word-break: keep-all`.
- Balance English display headings with `text-wrap: balance`.
- Keep paper shadows on panels and cards rather than controls.

## Decoration

- Use at most one small celestial cluster in a section.
- Do not add extra constellation decoration when a card glyph is present.
- Keep gold to one-pixel decorative strokes.
- Do not use hearts, glitter, candy gradients, or multiple pastel accent colors.

## Tarot Illustration System

- Present tarot illustrations in one consistent `5:7` portrait frame.
- Use a warm hand-painted storybook finish with soft gouache texture, restrained
  celestial symbols, and a recurring human cast. Keep characters at roughly a
  four-and-a-half-head proportion so the deck feels gentle without becoming
  chibi or toy-like.
- Let the scene, gesture, landscape, and one or two card symbols carry the
  meaning. Do not place card names, numerals, captions, logos, or UI text inside
  the illustration.
- Reuse the existing SVG card glyph for cards without approved illustration art,
  placeholders, small icons, and degraded-image fallback states.
- Illustration-only colors may extend beyond the interface tokens. Their frame,
  surrounding paper, borders, controls, focus states, and text must still use
  semantic `ts-*` tokens.
- A generated image is a source asset, not a finished deck card. Crop it into the
  common frame, inspect faces and hands, remove accidental text or artifacts, and
  verify visual continuity before shipping it.

## Interaction States

- Draw interactive boundaries with the border token; do not rely on shadow or
  fill alone.
- Show selected topics with blush fill, a two-pixel action border, and a check.
- Show the active locale with a persistent action inset stroke and weight
  change.
- Show keyboard focus with a two-pixel action outline and two-pixel offset.
- Keep hover and pressed states within the action and blush token families.
- Reduce animation and transition durations when reduced motion is requested.

## Card Draw Motion

- Render drawn cards, the prompt, and analytics state immediately without a
  loading timer.
- Animate only user-initiated draws. Do not replay the reveal for restored or
  shared URLs.
- Use a 520ms card arrival, a 360ms art reveal, an 80ms per-card stagger, and a
  120ms art offset.
- Restart the sequence when the user draws again. Do not restart it for reading
  style changes.
- Set both animation duration and delay to effectively zero when reduced motion
  is requested.

## Exceptions

Keep third-party brand artwork in its official colors. Surrounding button
borders, focus, hover, and pressed states still use semantic Tarot Spark tokens.
