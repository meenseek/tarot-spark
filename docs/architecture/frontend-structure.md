# Frontend Structure

## Scope

Use this guide when adding routes, feature UI, shared components, tarot data,
or frontend helpers.

## Goals

- Keep route files focused on routing, metadata, and page composition.
- Keep feature behavior close to the feature that owns it.
- Keep shared UI free of tarot domain logic and public copy.
- Move repeated logic, data, and UI to one source of truth before it spreads.
- Avoid catch-all folders such as `common`, `shared`, or `utils`.

## Directory Shape

Use this target shape as the app grows:

```text
src/
  app/
    layout.tsx
    page.tsx
    globals.css
  i18n/
    config.ts
    template.ts
  messages/
    en/
    ko/
  components/
    layout/
    ui/
  domain/
    tarot/
      ids.ts
      spreads.ts
      prompts.ts
      topics.ts
      types.ts
  features/
    tarot-reading/
      components/
      hooks/
      TarotExperience.tsx
      TarotExperienceClient.tsx
      analytics.ts
      index.ts
  lib/
  styles/
tests/
  e2e/
```

The project does not need every directory at once. Add a directory when a
feature, shared component, or domain object needs a stable home.

## Current MVP Placement

The single-route MVP may keep the first route-owned experience files in
`src/app` while all of these are true:

- One route owns the full interaction.
- No other route, feature, or test imports the file through a non-route path.
- The file is still small enough to review as one route-owned unit.
- The next expected change is not a second topic route, shared component, or
  reusable tarot helper.

Move colocated MVP files before the first change that breaks those conditions:

```text
src/app/TarotExperience.tsx -> src/features/tarot-reading/TarotExperience.tsx
src/app/tarot-data.ts -> src/domain/tarot/
src/app/analytics.ts -> src/features/tarot-reading/analytics.ts
```

## Folder Responsibilities

- `src/app` owns App Router files, route layouts, route metadata, and route-level
  composition.
- `src/features/<feature>` owns user-facing workflows such as card draw,
  reading reveal, prompt generation, copy actions, and sharing.
- `src/features/<feature>/components` owns components that are coupled to that
  feature's state, copy, events, or tarot behavior.
- `src/components/ui` owns domain-free primitives such as buttons, inputs,
  dialogs, tabs, cards, and tooltips.
- `src/components/layout` owns app shell components such as navigation, footer,
  page frame, and persistent layout regions.
- `src/domain/tarot` owns stable tarot ids, typed tarot data, tarot types,
  spread definitions, prompt templates, and pure tarot helpers.
- `src/i18n` owns locale configuration, template formatting, and localization
  integrity tests.
- `src/messages` owns locale JSON message files grouped by locale and namespace.
- `src/lib` owns framework-agnostic helpers that are not tarot-specific.
- `src/styles` owns shared styling helpers that do not belong in
  `globals.css`.
- `tests/e2e` owns Playwright smoke flows.

## File Classification

- Route files are framework-defined files such as `page.tsx`, `layout.tsx`,
  `loading.tsx`, `error.tsx`, route metadata, and route-only tests.
- Feature files own one user workflow, such as selecting a topic, drawing cards,
  revealing results, copying prompts, or sharing a reading.
- Feature components render workflow-specific UI and may use feature state,
  feature analytics names, tarot copy, or browser interaction state.
- Feature hooks own client interaction state when more than one feature
  component needs the same state transition.
- Domain files own typed tarot facts, spread definitions, prompt builders,
  interpretation templates, and pure tarot helpers.
- Shared UI files own domain-free primitives that can render without tarot data,
  analytics event names, route metadata, or public copy.
- Layout files own app shell, navigation, footer, page frame, and persistent
  regions that are not tied to one workflow.
- Library files own generic browser or TypeScript helpers that are not tied to
  tarot, a route, or a feature workflow.
- Style files own reusable styling tokens or helpers that do not belong in
  `globals.css`.

## Placement Rules

- Place a new file in the narrowest owner that can change it safely.
- Keep route composition in `src/app`; move reusable behavior out before a
  second route imports it.
- Use a clearly named route group, such as `src/app/(root)`, when multiple root
  layouts are needed to serve locale-specific document attributes while keeping
  `/` as a route.
- Do not use vague route group names such as `(default)`.
- Keep workflow-specific state, event names, copy, and browser actions inside
  the owning feature.
- Keep stable tarot ids and pure tarot logic in `src/domain/tarot`, even when the
  first consumer is a single feature.
- Keep locale message values in `src/messages`; do not repeat stable ids in
  locale JSON when TypeScript can own the canonical id list.
- Load locale messages from server components or server-only loaders, then pass
  the current locale's serializable data into client components.
- Add `import "server-only";` to production modules that import `src/messages`;
  localization tests may import messages without that marker.
- Do not import locale JSON files directly from client components.
- Keep shared UI primitive props domain-free; pass tarot labels, descriptions,
  and event handlers from the feature.
- Keep generic helpers in `src/lib` only when they have no tarot, feature, or
  route vocabulary.
- Split a file when it contains two owners, such as tarot data plus React UI, or
  feature state plus shared primitive styling.

## Import Direction

Keep imports flowing from product composition toward lower-level building
blocks:

```text
src/app -> src/features -> src/components/ui
src/app -> src/features -> src/domain/tarot
src/app -> src/i18n
src/features -> src/i18n
src/domain/tarot -> src/i18n
```

- Shared UI components must not import from `src/app`, `src/features`, or
  `src/domain/tarot`.
- Domain files must not import React components or route files.
- Feature modules may import shared UI, domain data, and generic helpers.
- Server components and server loaders may import `src/messages`; client
  components should receive localized data through props.
- Production modules that import `src/messages` must be server-only modules.
- Cross-feature imports should go through the feature's `index.ts`.
- Route files should import feature entry points instead of feature internals.

## Component Strategy

- Start components in the route or feature that first needs them.
- Promote a component to `src/components/ui` only when it is domain-free and
  useful in more than one feature or route.
- Promote a component to `src/components/layout` only when it represents app
  shell or repeated page framing.
- Keep feature components in `src/features/<feature>/components` when they use
  feature state, analytics names, tarot copy, tarot data, or flow-specific
  behavior.
- Prefer composition through `children` and small typed props over broad config
  objects.
- Keep primitive variants limited to durable design choices such as `variant`,
  `size`, `disabled`, and `aria-*` behavior.
- Keep public copy outside shared UI primitives.
- Put repeated tarot content, prompt text, and interpretation templates in
  `src/domain/tarot` before reusing them in multiple views.

## Naming

- Use framework-defined names for App Router files such as `page.tsx`,
  `layout.tsx`, `loading.tsx`, and `error.tsx`.
- Use `PascalCase.tsx` for component files with one primary exported component.
- Use lowercase kebab-case for non-component modules when a framework does not
  define the filename.
- Use `index.ts` as a small feature boundary that exports the public feature
  API.
- Keep test filenames next to the unit they cover, using `.test.ts` or
  `.test.tsx`.

## State And Data

- Keep component-local state in the component that owns the interaction.
- Move state to a feature hook or feature module when multiple components in
  the same feature need it.
- Keep tarot card, spread, topic, prompt, and interpretation data typed.
- Keep tarot topic, card-count spread, reading-style, and all 78 card ids in
  TypeScript as the canonical source of truth; materialize localized arrays
  from those ids. A spread records only card count and never assigns semantic
  position names.
- Keep browser storage, analytics, and clipboard helpers behind small wrapper
  functions in the feature or `src/lib`.
- Model the reading workflow as a feature-local tagged session with `setup`,
  `result`, and `edit-next-draw` modes. Keep committed result inputs separate
  from the cancelable next-draw draft, and make same-value transitions return
  the identical session.
- Keep card-instance, share-change, and prompt-change ids explicit. Use them
  with operation ids so asynchronous copy and share completions update only the
  latest compatible UI while still recording an invocation-eligible terminal
  analytics event.
- Keep free-form tarot context in client state. A locale switch may use an
  unversioned, exact-shape, one-time `sessionStorage` handoff; the same handoff
  may preserve context across a document reload required to stop an already
  running optional service. Reading URLs and analytics payloads must omit the
  context.
- Keep spread and reading-style ids in TypeScript. Localize their labels and
  prompt instructions through the tarot message data.
- Build the user-copy prompt from exact localized card names in draw order. Do
  not serialize card images, visual descriptions, fixed card meanings, internal
  card ids, prompt variants, or interpretation lenses into that prompt.
- Build the separate instant-reading provider input from reviewed nonvisual
  upright meanings in draw order. Do not send card names, card images, internal
  ids, invented positions, interpretation lenses, or user context. The UI owns
  exact card names and order and joins them to provider interpretations by
  validated indexes.
- Keep instant-reading provider prompts, schemas, and generation configuration
  in the shared domain contract used by production and evaluation. Evaluation
  manifests use SHA-256 content hashes for the contract, data, and evaluation
  source files. Convert provider card indexes to internal ids only after parsing.
- Keep both current prompt style and original draw style in public reading URL
  state. This preserves prompt customization without misrepresenting how the
  committed cards were drawn.
- Do not add global state until at least two independent routes need the same
  mutable client state.

## Route Rendering

- Keep the experience static-first by deriving reading output from typed local
  data and public URL state without a database or server-generated reading.
- Render `/`, `/ko`, `/share`, and `/ko/share` at request time because their
  initial HTML and share metadata depend on validated search parameters.
- Parse generator search parameters on the server so cardless presets and
  restored results remain usable in the initial HTML without JavaScript.
- Keep public information routes statically generated when their content does
  not depend on request state.
- Treat request-time classification as an intentional exception to static route
  generation, not permission to add a server data dependency.

## Testing

- Add Vitest coverage for shared UI behavior, feature logic, and tarot helpers.
- Add component tests beside the component or feature they cover.
- Keep Playwright coverage in `tests/e2e` for page load, card draw, result
  reveal, prompt copy, and share entry points.
- Keep tests deterministic and independent from live ads, live analytics, and
  external AI calls.
