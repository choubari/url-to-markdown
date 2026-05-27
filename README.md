# url-to-markdown

Convert any webpage to clean Markdown. Free, no account, no API key.

**Live demo:** [md.choubari.com](https://md.choubari.com)

## Usage

Paste a URL into the web UI, or use the URL-prefix pattern directly:

```
https://md.choubari.com/https://example.com/article
```

Raw Markdown output (for curl, scripts, and LLM pipelines):

```bash
curl -H "Accept: text/markdown" https://md.choubari.com/https://example.com/article
```

Returns `text/plain` with clean Markdown. Pipe into any tool.

## How it works

1. The Worker fetches the target URL with a browser-like User-Agent
2. [Mozilla Readability](https://github.com/mozilla/readability) extracts the main article content
3. [node-html-markdown](https://github.com/crosstype/node-html-markdown) converts it to Markdown
4. Result is returned as a textarea you can copy, or as `text/plain` for API use

JS-rendered SPAs return thin content — the Worker fetches raw HTML, not a rendered page. Paywalled pages return best-effort content.

## Self-hosting

### Requirements

- [Cloudflare account](https://dash.cloudflare.com) (free tier: 100k req/day)
- Node.js ≥ 18

### Deploy

```bash
git clone https://github.com/choubari/url-to-markdown
cd url-to-markdown
npm install
npx wrangler deploy
```

You'll be prompted to log in on first deploy. Your Worker URL will be printed.

### Configuration

**`wrangler.jsonc` vars** — edit before deploying:

| Var | Description |
|-----|-------------|
| `BASE_URL` | Your deployed Worker URL (used in the User-Agent header sent to target sites) |
| `POSTHOG_PUBLIC_KEY` | Client-side PostHog key. Leave empty to disable analytics. |
| `POSTHOG_HOST` | PostHog ingest URL (`https://eu.i.posthog.com` or `https://us.i.posthog.com`) |

**Secrets** — set via Wrangler, never committed:

```bash
# Optional — server-side analytics. Skip if you don't use PostHog.
npx wrangler secret put POSTHOG_API_KEY
```

**Rate limiting** — the Worker uses Cloudflare's native Rate Limiting binding (5 req/60s per IP):

1. Go to Cloudflare Dashboard → Workers & Pages → your Worker → Rate Limiting → Create namespace
2. Copy the namespace ID and replace `YOUR_NAMESPACE_ID` in `wrangler.jsonc`

Rate limiting is optional — the Worker skips it gracefully if the binding is absent (useful for local dev).

### Local development

```bash
npm run dev
# open http://localhost:8787
```

Copy `.dev.vars.example` to `.dev.vars` and fill in your values for local secrets:

```bash
cp .dev.vars.example .dev.vars
```

### Testing

```bash
npm test
```

Runs the Cloudflare Workers Vitest pool (integration tests) and unit tests.

## CI/CD

The included GitHub Actions workflow deploys to Cloudflare on every push to `main`.

Add these secrets to your GitHub repository (Settings → Secrets → Actions):

| Secret | Where to get it |
|--------|-----------------|
| `CLOUDFLARE_API_TOKEN` | [dash.cloudflare.com/profile/api-tokens](https://dash.cloudflare.com/profile/api-tokens) — use the **Edit Cloudflare Workers** template |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare Dashboard → right sidebar on any Workers page |

The workflow runs `npm test` before deploying — a failing test blocks the deploy.

## Stack

| Layer | Library |
|-------|---------|
| Runtime | Cloudflare Workers (V8 isolate, globally distributed) |
| Content extraction | [@mozilla/readability](https://github.com/mozilla/readability) — Firefox Reader Mode engine |
| DOM parsing | [linkedom](https://github.com/WebReflection/linkedom) — Workers-compatible |
| Markdown conversion | [node-html-markdown](https://github.com/crosstype/node-html-markdown) |
| Analytics | [PostHog](https://posthog.com) (optional, self-hostable) |

## Limits

- 5 MB page size
- 8-second fetch timeout
- 5 requests / 60 seconds per IP (configurable)
- JS-rendered pages (React, Vue, etc.) return thin content

## License

MIT — [Kawtar Choubari](https://choubari.com)
