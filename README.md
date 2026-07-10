# Mikazuki

Discord bot that cleans URLs in messages — strips tracking parameters and rewrites domains to embed-friendly alternatives with automatic fallback chains.

## What it does

1. Scans messages for URLs
2. Strips tracking params (`utm_*`, `fbclid`, `gclid`, `igshid`, `si`, `ref`)
3. Rewrites broken-embed domains using priority-ordered fallback chains:
   - `instagram.com` → `ddinstagram.com` → `xnstagram.com` → `kkinstagram.com` → `eeinstagram.com` → original
   - `x.com`/`twitter.com` → `fxtwitter.com` → `fixupx.com` → `vxtwitter.com` → `fixvx.com` → original
   - `tiktok.com` → `tnktok.com` → `kktiktok.com` → `tfxktok.com` → original
   - `reddit.com` → `rxddit.com` → `redditez.com` → `vxreddit.com` → original
4. Validates each rewritten URL via HTTP request before posting
5. After posting, waits for Discord embed generation; retries with next alternative if embed fails
6. Tracks domain health automatically — downranks services with high failure rates
7. Deletes original + reposts clean version

## Setup

Create a `.env` file with your bot token:

```
DISCORD_TOKEN=your-bot-token
```

Optional configuration:

```
WEBHOOK_IMPERSONATION=true          # Repost as original author via webhook
URL_VALIDATION_TIMEOUT=3000         # ms to wait for HTTP validation
EMBED_WAIT_TIMEOUT=7000             # ms to wait for embed after posting
ENABLE_URL_VALIDATION=true          # Toggle HTTP validation
ENABLE_EMBED_DETECTION=true         # Toggle post-send embed checking
```

```bash
pnpm install
pnpm dev
```

## Commands

- `pnpm dev` — run with hot reload
- `pnpm build` — compile TypeScript
- `pnpm start` — run production build
- `pnpm test` — run tests
- `pnpm lint` — lint + format check
