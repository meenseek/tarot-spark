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
pnpm exec playwright install chromium webkit
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
When configured, Analytics defaults on unless the browser has a stored
site-level opt-out. Google Consent Mode v2 defaults the four relevant consent
signals to denied in the EEA, UK, and Switzerland and to granted elsewhere.

Set `NEXT_PUBLIC_ADSENSE_CLIENT_ID` to the Google AdSense client id, such as
`ca-pub-0000000000000000`, to add the account metadata, provide the client id
required for any later script delivery, and serve the matching authorized
seller record from `/ads.txt`. Leave it unset for local development and preview
deployments. The account metadata and `/ads.txt` do not depend on the privacy
choice or enable advertising delivery by themselves.

Set `NEXT_PUBLIC_ADSENSE_SCRIPT_ENABLED=true` only after the production
integrity, route-isolation, AdSense approval, and Google-certified regional CMP
and TCF checks in the
[revenue validation plan](docs/product/revenue-validation-plan.md) pass. Leave
it unset or set it to `false` to keep advertising delivery off while preserving
the account metadata and authorized seller record. When enabled, the AdSense
script defaults on unless the browser has a stored site-level opt-out and loads
only on the allowlisted content routes. In the EEA, UK, and Switzerland, the
certified CMP remains the only source that may grant regional consent.

Set `NEXT_PUBLIC_KAKAO_JS_KEY` to enable KakaoTalk sharing. Kakao domains:
`App > JavaScript SDK domain` must include the app origin, and
`App > Product Link > Web domain` must include the shared URL origin
(`NEXT_PUBLIC_SHARE_SITE_URL`, otherwise `NEXT_PUBLIC_SITE_URL`).
Set `NEXT_PUBLIC_KAKAO_ALLOWED_ORIGINS` to the comma-separated origins
registered in Kakao. It must include both the running origin and the shared URL
origin, otherwise the KakaoTalk button stays hidden.

Set the server-only `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` values to
use the fixed Workers AI model `@cf/qwen/qwen3-30b-a3b-fp8`. Keep
`TAROT_INSTANT_READING_ENABLED=false` until the provider, privacy, quota,
platform rate rule, and fixed evaluation checks in
[`docs/product/instant-reading-evaluation.md`](docs/product/instant-reading-evaluation.md)
pass. The feature sends only reviewed public card meanings and selected public
options; optional free-form situation text is excluded.

Use `.env.local` for local values. The committed `.env.example` file documents
the expected keys.

## Documentation

- [Docs map](docs/README.md)
- [Frontend structure](docs/architecture/frontend-structure.md)
- [Visual design system](docs/product/design-system.md)
- [Card art bible](docs/product/card-art-bible.md)
- [Versioning and generated artifacts](docs/engineering/versioning-and-artifacts.md)
- [Phase-gated delivery](docs/workflow/delivery-phases.md)
- [Growth playbook](docs/product/growth-playbook.md)
- [Revenue validation plan](docs/product/revenue-validation-plan.md)

The repository keeps only the final 78-card runtime deck and its lightweight
integrity test. Keep future prompts, raw generations, review artifacts, and
one-off production tools outside the application repository as described in
the card art bible.

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
