# Mikazuki

Discord bot that cleans URLs in messages — strips tracking parameters and rewrites domains to embed-friendly alternatives.

## What it does

1. Scans messages for URLs
2. Strips tracking params (`utm_*`, `fbclid`, `gclid`, `igshid`, `si`, `ref`)
3. Rewrites broken-embed domains (`instagram.com` → `kkinstagram.com`, `x.com` → `fxtwitter.com`, `tiktok.com` → `kktiktok.com`, `reddit.com` → `rxddit.com`)
4. Deletes original + reposts clean version (or replies if no permission)

## Setup

```bash
pnpm install
export DISCORD_TOKEN="your-bot-token"
pnpm dev
```

## Commands

- `pnpm dev` — run with hot reload
- `pnpm build` — compile TypeScript
- `pnpm start` — run production build
- `pnpm test` — run tests
- `pnpm lint` — lint + format check
