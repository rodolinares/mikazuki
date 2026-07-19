# Mikazuki

Discord bot that cleans URLs in messages — strips tracking parameters, rewrites domains to embed-friendly alternatives, and detects Instagram carousels.

## What it does

1. Scans messages for URLs
2. Strips tracking params (`fbclid`, `gclid`, `igsh`, `igshid`, `is_from_webapp`, `ref`, `s`, `sender_device`, `si`, `utm_*`)
3. Rewrites broken-embed domains using priority-ordered fallback chains
4. Validates rewritten URLs via HTTP before posting
5. After posting, polls for embed generation; retries next chain alternative if embed fails
6. Detects Instagram carousel posts — reposts multi-image carousels as individual embeds
7. Deletes original + reposts clean version (via webhook impersonation or text attribution)

## Supported domains

| Original | Fallback chain |
|---|---|
| `instagram.com` / `www.` / `m.` / `instagr.am` | `ddinstagram.com` → `uuinstagram.com` → `xnstagram.com` → `kkinstagram.com` → `eeinstagram.com` → original |
| `x.com` / `www.` | `fxtwitter.com` → `fixupx.com` → `vxtwitter.com` → `fixvx.com` → original |
| `twitter.com` / `www.` / `mobile.` | `fxtwitter.com` → `vxtwitter.com` → `fixvx.com` → original |
| `tiktok.com` / `vt.` / `www.` / `vm.` / `m.` | `tnktok.com` → `kktiktok.com` → `tfxktok.com` → original |
| `reddit.com` / `www.` / `old.` / `m.` | `rxddit.com` → `redditez.com` → `vxreddit.com` → original |

## Setup

```bash
cp .env.example .env   # or create .env with DISCORD_TOKEN
pnpm install
pnpm dev
```

### Environment

```
DISCORD_TOKEN=your-bot-token          # required
WEBHOOK_IMPERSONATION=true            # repost as author via webhook (default: false)
URL_VALIDATION_TIMEOUT=3000           # HTTP validation timeout ms (default: 3000)
EMBED_WAIT_TIMEOUT=7000               # embed poll timeout ms (default: 7000)
ENABLE_URL_VALIDATION=true            # toggle HTTP validation (default: true)
ENABLE_EMBED_DETECTION=true           # toggle post-send embed check (default: true)
```

### Docker

```bash
docker compose up -d
```

## Commands

| Command | Description |
|---|---|
| `pnpm dev` | Run with hot reload |
| `pnpm build` | Compile TypeScript |
| `pnpm start` | Run production build |
| `pnpm test` | Run tests |
| `pnpm lint` | Lint + format check |
| `pnpm format` | Auto-format with Prettier |
