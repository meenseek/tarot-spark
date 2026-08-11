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
  natural five-to-six-head proportions so the deck feels gentle without
  becoming chibi or toy-like.
- Let the scene, gesture, landscape, and one or two card symbols carry the
  meaning. Do not place card names, numerals, captions, logos, or UI text inside
  the illustration.
- Use the shared full-frame card back only while current art loads. Every one
  of the 78 stable card ids maps to one approved `/cards/` illustration in
  the active release. A load failure exposes retry UI and never substitutes a
  typographic or glyph card front.
- Keep the card back identical across cards. Fill the `5:7` frame
  with a bilaterally symmetric outer and inner border plus one central celestial
  medallion that stays legible at the smallest rendered preview.
- Make card art the visual anchor in main and shared spreads. At narrow widths,
  compact the metadata beside the art without lengthening the path to the
  reading result.
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

## Page Architecture

- Wrap every public page in the shared `SiteShell`. The shell owns the canvas,
  the canonical `max-w-6xl` frame, responsive page gutters, the brand home
  link, locale switch, and footer navigation.
- Keep the shell width stable across routes. Editorial pages may constrain
  their article inside the shell, but must not narrow or reimplement the header
  or footer.
- Use one of three page archetypes inside the shell:
  - Workspace pages organize mutable setup, committed results, and editing
    states around the user's current task.
  - Catalog pages put browsable choices before supporting methodology and keep
    repeated choices visually quieter than the selected destination.
  - Editorial pages use a readable inner measure for guides and daily content
    without changing the surrounding shell.
- Treat setup, result, and edit-next-draw as separate workspace layouts. Do not
  reserve a short or empty result column beside a substantially taller setup
  form. A result may use the full content width; edit-next-draw may use two
  columns while the committed result remains visible.

## Action Hierarchy

- Use at most one filled primary action in one task region. A region is a
  visually bounded form, result panel, or call-to-action section.
- While Tarot Spark is a prompt generator, prompt copy is the primary result
  action. Optional instant interpretation remains secondary. If the product
  contract changes to interpretation-first, invert that hierarchy everywhere
  in one change instead of presenting both actions as primary.
- Use secondary or text-link treatment for repeated catalog choices, locale
  controls, disclosures, navigation, and supporting actions.
- Do not use blush fill or a two-pixel action border to make an optional panel
  compete with the primary task. Reserve that emphasis for selection,
  reflection content, or the single dominant call to action in a region.

## Catalog Browsing

- Put the question catalog immediately after its introduction. Supporting
  method, comparison, and worked-example content follows the catalog.
- Group a long catalog by stable category in native disclosure elements. Open
  only the first category by default, keep every category summary visible, and
  keep all question links in server-rendered HTML.
- Preserve stable category fragment ids when changing presentation so existing
  deep links still land on the corresponding category summary.
- Use card shadows sparingly in repeated lists and keep every repeated question
  action secondary. Density should communicate a browsable collection, not a
  wall of competing primary actions.

## Structural Regression Prevention

- Test the shared shell at 390px and 1280px. Header and footer boundaries must
  use the same gutters on every public route, and no route may overflow
  horizontally.
- Cover Korean and English plus workspace setup, result, and edit-next-draw
  states. Check structure and action hierarchy as well as copy and state
  transitions.
- Keep a source-level adoption test for the shared shell and a component test
  for its brand link, locale control, landmarks, and footer navigation.
- For catalog changes, test stable fragment ids, default disclosure state,
  disclosure interaction, and the complete server-rendered link set.
- When a new action or panel is added, review the whole task region at mobile
  and desktop widths. A passing token audit alone does not prove that page
  hierarchy or density remains coherent.

## Reading Flow

- Present topics as one labeled radio group. Keep the selected state native and
  visible, and put the active spread count in the draw action instead of
  repeating it in every topic label.
- Keep the optional situation entry visible between topic selection and the
  reading-preferences disclosure. Do not group it with card-count or
  reading-style settings.
- Let users draw without adding situation text. Keep card count and reading
  style in a separate secondary disclosure, followed by one count-specific draw
  action.
- Treat setup, committed result, and edit-next-draw as distinct modes. Editing
  the next draw must keep the committed cards and prompt visible; cancelling
  must discard the draft and restore focus to the edit trigger.
- Offer one next-reading action after the primary prompt action. Route it
  through edit-next-draw so users can keep or change their choices before a new
  draw replaces the committed result. Do not use browser Back as a reading
  reset or add a separate immediate-redraw path.
- Keep preset-question changes inside the next-draw draft so cancelling restores
  the committed result and private context. Do not use catalog navigation as a
  draft control. Locale navigation uses the committed result and may discard an
  uncommitted next-draw draft.
- Start each result with a compact three-column card overview containing card
  approved card art, neutral draw order, and the exact card name.
  Keep full card meaning in the later details
  disclosure so three- and six-card results reach the prompt action quickly.
- Place the single generated-prompt copy action before prompt source, card
  details, sharing options, and shared-reading creation actions.
- Keep current-prompt customization separate from edit-next-draw. Current style
  or private-context changes may update the prompt and share URL, but must not
  redraw cards or rewrite the recorded draw-style provenance.
- Keep the full generated prompt available for review and manual-copy recovery,
  but collapse it by default.
- Keep the entertainment and advice disclaimer visible outside collapsed
  disclosures on both generated and shared results.
- Move focus to the result heading after a user draw. Do not move focus for a
  restored or shared URL.
- Move focus to the selectable prompt or manual share URL when a copy or share
  action fails.
- Keep the exact ordered card-name list visible beside the primary prompt-copy
  action so users can verify what will be sent before opening the full prompt.

## Card Draw Motion

- Render drawn cards, the prompt, and analytics state immediately without a
  loading timer.
- Animate only user-initiated draws. Do not replay the reveal for restored or
  shared URLs.
- Use a 520ms alternating paper-card deal and one 480ms card-back-to-face flip,
  with an 80ms per-card stagger and a 120ms flip offset.
- Keep the shared card back visible while approved art loads. Start the
  two-sided flip only after the image is ready, and expose a retryable asset
  error when it fails. Do not block ready cards behind a slower card.
- Rotate only the `5:7` art plane from zero to 180 degrees so the physical back
  turns away as the front turns in. Do not rotate the article, exceed one
  180-degree flip, or add a shuffle delay, glossy light sweep, or particle
  effect.
- Restart the sequence when the user draws again. Do not restart it for reading
  style changes.
- Set both animation duration and delay to effectively zero when reduced motion
  is requested.

## Exceptions

Keep third-party brand artwork in its official colors. Surrounding button
borders, focus, hover, and pressed states still use semantic Tarot Spark tokens.
