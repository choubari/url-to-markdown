# copy-markdown

Convert any webpage to clean Markdown. Free, no account, no API key.

```
https://your-worker.workers.dev/https://example.com/article
```

## How it works

- Paste a URL → get Markdown
- URL-prefix pattern: `{your-domain}/https://any-url` — shareable, bookmarkable
- Raw Markdown via `Accept: text/markdown` header (for curl / programmatic use)

```bash
curl -H "Accept: text/markdown" https://your-worker.workers.dev/https://example.com
```

## Self-hosting

1. Clone this repo
2. Install dependencies: `npm install`
3. Deploy to your own Cloudflare account (free tier — 100k req/day):

```bash
npm run deploy
```

You'll be prompted to log in on first deploy. Your Worker URL will be printed.

## Local development

```bash
npm run dev
# open http://localhost:8787
```

## CI/CD

Add `CLOUDFLARE_API_TOKEN` to your GitHub repository secrets. The deploy workflow triggers on push to `main`.

Create a token at [dash.cloudflare.com/profile/api-tokens](https://dash.cloudflare.com/profile/api-tokens) with **Edit Cloudflare Workers** permissions.

## Stack

- **Runtime**: Cloudflare Workers (V8 isolate, globally distributed, free tier)
- **Content extraction**: `@mozilla/readability` (Firefox reader mode engine)
- **DOM parsing**: `linkedom` (Workers-compatible)
- **Markdown conversion**: `node-html-markdown`

## Limitations

- JS-rendered SPAs (React, Vue, etc.) return thin or empty content — the Worker fetches raw HTML, not a rendered page
- Paywalled or login-required pages return best-effort content
- 5 MB page size limit; 8-second fetch timeout

## License

MIT
