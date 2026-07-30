# tarot-spark

Free tarot card drawing and AI prompt generator built with Next.js. Users can
choose a quick or deep spread, select a reading style, and optionally add
browser-only situation context before copying the generated prompt.

## Development

Use Node.js 24 LTS and the pinned pnpm version for local development and CI.
This repository includes `.nvmrc` and `.node-version` for local version
managers.

```sh
nvm install
nvm use
corepack enable
corepack prepare pnpm@11.1.1 --activate
pnpm install
pnpm exec playwright install chromium
pnpm dev
```

## Configuration

Set `NEXT_PUBLIC_SITE_URL` to the production origin before deployment. It is used
for canonical URLs, alternate language links, `robots.txt`, and `sitemap.xml`.
Local builds fall back to `http://localhost:3000`.

Set `NEXT_PUBLIC_SHARE_SITE_URL` only when share links should use a different
origin from `NEXT_PUBLIC_SITE_URL`. The value must be reachable outside the
local machine, so do not use `localhost` for KakaoTalk sharing. In production,
leave it unset so share links use the production origin.

Set `NEXT_PUBLIC_GA_ID` to the Google Analytics measurement ID, such as
`G-XXXXXXXXXX`, to enable page view tracking and tarot behavior events. Leave it
unset for local development or preview deployments that should not send GA data.
When configured, Analytics remains off until the user permits it in the
localized privacy choices.

Set `NEXT_PUBLIC_ADSENSE_CLIENT_ID` to the Google AdSense client id, such as
`ca-pub-0000000000000000`, to add the account metadata, make the AdSense script
available, and serve the matching authorized seller record from `/ads.txt`.
Leave it unset for local development and preview deployments.
The account metadata and `/ads.txt` do not depend on the privacy choice, but the
AdSense script remains off until the user permits advertising and never loads
on the interactive reading routes.

Set `NEXT_PUBLIC_KAKAO_JS_KEY` to enable KakaoTalk sharing. Kakao domains:
`App > JavaScript SDK domain` must include the app origin, and
`App > Product Link > Web domain` must include the shared URL origin
(`NEXT_PUBLIC_SHARE_SITE_URL`, otherwise `NEXT_PUBLIC_SITE_URL`).
Set `NEXT_PUBLIC_KAKAO_ALLOWED_ORIGINS` to the comma-separated origins
registered in Kakao. It must include both the running origin and the shared URL
origin, otherwise the KakaoTalk button stays hidden.

Use `.env.local` for local values. The committed `.env.example` file documents
the expected keys.

## Documentation

- [Docs map](docs/README.md)
- [Frontend structure](docs/architecture/frontend-structure.md)
- [Visual design system](docs/product/design-system.md)
- [Card art bible](docs/product/card-art-bible.md)
- [Phase-gated delivery](docs/workflow/delivery-phases.md)
- [Growth playbook](docs/product/growth-playbook.md)

Generate future card art from the committed prompt system instead of copying or
rewriting prompt text:

```sh
pnpm run art:prompt -- --card the-lovers
pnpm run art:prompt -- --card the-lovers --json
pnpm run art:check
```

Run the required verification gates before opening or updating a PR.

For docs-only changes:

```sh
pnpm run format:check
pnpm run docs:lint
```

For code-bearing changes:

```sh
pnpm run format:check
pnpm run lint
pnpm run docs:lint
pnpm run typecheck
pnpm run test
pnpm run test:e2e
pnpm run build
```
