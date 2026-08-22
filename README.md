# Mikazuki

Discord bot that cleans URLs in messages — strips tracking parameters and rewrites domains to embed-friendly alternatives.

## What it does

1. Scans messages for URLs
2. Strips tracking params (`fbclid`, `gclid`, `igsh`, `igshid`, `igsi`, `is_from_webapp`, `ref`, `sender_device`, `si`, `ttclid`, `msclkid`, `mc_cid`, `mc_eid`, `_hsenc`, `_hsmi`, `gbraid`, `wbraid`, `yclid`, `oly_enc_id`, `oly_anon_id`, `mkt_tok`, `rb_clickid`, `vero_id`, `_openstat`, `dclid`, `cjevent`, `spm`, `scm`, `ref_src`, `ref_url`, `twclid`, `bpctr`, `ucat`, `utm_*`; `s` on X/Twitter only)
3. Rewrites broken-embed domains using priority-ordered fallback chains
4. Recognizes fixer domains users post themselves and upgrades them to the most reliable chain alternative
5. After posting, polls for embed generation; retries next chain alternative if embed fails
6. Reposts clean version (re-uploading attachments) then deletes original

## Supported domains

| Original | Fallback chain |
|---|---|
| `instagram.com` / `www.` / `m.` / `instagr.am` | `ddinstagram.com` → `uuinstagram.com` → `xnstagram.com` → `kkinstagram.com` → `eeinstagram.com` → original |
| `x.com` / `www.` | `fxtwitter.com` → `fixupx.com` → `vxtwitter.com` → `fixvx.com` → original |
| `twitter.com` / `www.` / `mobile.` | `fxtwitter.com` → `vxtwitter.com` → `fixvx.com` → original |
| `tiktok.com` / `vt.` / `www.` / `vm.` / `m.` | `tnktok.com` → `kktiktok.com` → `tfxktok.com` → original |
| `reddit.com` / `www.` / `old.` / `m.` | `rxddit.com` → `redditez.com` → `vxreddit.com` → original |
| `facebook.com` / `www.` / `m.` | `facebed.com` → `fxfb.seria.moe` → original |

Fixer domains (e.g. `ddinstagram.com`, `fxtwitter.com`, `facebed.com`) are also recognized as message URLs — a weaker fixer is upgraded to the best alternative in its chain; the gold-standard fixer is left untouched.

## Setup

```bash
cp .env.example .env   # or create .env with DISCORD_TOKEN
pnpm install
pnpm dev
```

### Environment

```
DISCORD_TOKEN=your-bot-token          # required
EMBED_WAIT_TIMEOUT=20000              # embed poll timeout ms (default: 20000)
ENABLE_EMBED_DETECTION=true           # toggle post-send embed check (default: true)
CLEAN_CHANNEL_IDS=123,456             # channel allowlist, empty = all channels
HEARTBEAT_FILE=/tmp/mikazuki-alive    # health check file (default: /tmp/mikazuki-alive)
```

### Docker

```bash
docker compose up -d
```

### Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for systemd setup, log management, and health checks.

## Commands

| Command | Description |
|---|---|
| `pnpm dev` | Run with hot reload |
| `pnpm build` | Compile TypeScript |
| `pnpm start` | Run production build |
| `pnpm test` | Run tests |
| `pnpm lint` | Lint + format check |
| `pnpm format` | Auto-format with Prettier |
