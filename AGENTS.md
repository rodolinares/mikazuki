# AGENTS.md

This file provides guidance to OpenCode when working in this repository.

## Project Overview

A Discord bot that scans messages for URLs and reposts a cleaned version. The bot has three responsibilities:

1. **Tracking parameter removal**: Strip tracking query parameters (`fbclid`, `gclid`, `igsh`, `igshid`, `is_from_webapp`, `ref`, `sender_device`, `si`, `ttclid`, `msclkid`, `mc_cid`, `mc_eid`, `_hsenc`, `_hsmi`, `gbraid`, `wbraid`, `yclid`, `oly_enc_id`, `oly_anon_id`, `mkt_tok`, `rb_clickid`, `vero_id`, `_openstat`, `dclid`, `cjevent`, `spm`, `scm`, `ref_src`, `ref_url`, `twclid`, `bpctr`, `ucat`, any `utm_*`) from any URL found in a message. `s` is domain-scoped to X/Twitter hosts (it's WordPress search elsewhere).
2. **Embed-fixing rewrites**: If a URL's domain is known to produce a broken or missing embed on Discord, rewrite the domain to a known embed-friendly alternative using priority-ordered fallback chains. Fixer domains posted by users themselves are treated as inputs too: a weaker fixer is upgraded to the most reliable alternative in its chain, while the gold-standard fixer (the chain head) is left untouched.
3. **Fallback validation**: After posting, verify embed generation. If the embed doesn't appear, try the next alternative in the chain.

If a message's URLs required any change, the bot reposts the cleaned content first (attributed to the original author, re-uploading any attachments), then deletes the original message. If no changes were needed, the bot takes no action.

## Tech Stack

- **Language**: TypeScript (strict mode)
- **Package manager**: pnpm (never use npm or yarn; do not commit `package-lock.json` or `yarn.lock`)
- **Runtime**: Node.js (LTS)
- **Discord library**: discord.js (v14+)
- **Linting/formatting**: ESLint + Prettier
- **Testing**: Vitest

## Commands

- Install dependencies: `pnpm install`
- Run in dev mode: `pnpm dev`
- Build: `pnpm build`
- Start (production): `pnpm start`
- Lint: `pnpm lint`
- Test: `pnpm test`

Always use `pnpm` for adding, removing, or updating dependencies (`pnpm add`, `pnpm remove`, `pnpm up`). Do not invoke `npm` or `npx` directly.

## Architecture

```
src/
  index.ts            # Bot entry point, client login, event registration, error handlers, heartbeat
  config.ts           # Environment variable loading and validation (uses --env-file=.env)
  lib/
    logger.ts          # Structured logging (JSON in production, colored text in TTY)
    embedRewrites.ts   # EMBED_REWRITE_CHAINS map + CHAIN_ALIASES + getRewriteChain()
    embedDetector.ts   # Post-send embed detection with polling
    processMessage.ts  # Orchestrates everything: URL extraction, tracking stripping, rewriting, embed fallback, reposting
    domainHealth.ts    # Fixer success/failure counters + chain prioritization
    linkLog.ts         # JSONL audit log of rewritten URLs (one line per URL, per-fixer outcomes)
tests/
  embedRewrites.test.ts
  trackingParams.test.ts
  urlExtraction.test.ts
  domainHealth.test.ts
  linkLog.test.ts
```

Tracking params and URL regex are defined inline in `src/lib/processMessage.ts` — not in separate files.

## Domain Rewrite Chains

Maintain the domain rewrite chains as a single exported object in `src/lib/embedRewrites.ts`, keyed by the canonical hostname. Each value is an ordered array of alternatives to try, with the most reliable first. Variant hostnames map to their canonical chain via `CHAIN_ALIASES`:

```typescript
export const EMBED_REWRITE_CHAINS: Record<string, string[]> = {
  // Instagram: ddinstagram is most established
  "instagram.com": ["ddinstagram.com", "uuinstagram.com", "xnstagram.com", "kkinstagram.com", "eeinstagram.com", "instagram.com"],
  
  // Twitter/X: fxtwitter is gold standard
  "x.com": ["fxtwitter.com", "fixupx.com", "vxtwitter.com", "fixvx.com", "x.com"],
  "twitter.com": ["fxtwitter.com", "vxtwitter.com", "fixvx.com", "twitter.com"],
  
  // TikTok: tnktok is open source best
  "tiktok.com": ["tnktok.com", "kktiktok.com", "tfxktok.com", "tiktok.com"],
  
  // Reddit: rxddit is original
  "reddit.com": ["rxddit.com", "redditez.com", "vxreddit.com", "reddit.com"],
  
  // Facebook: facebed is the most reliable
  "facebook.com": ["facebed.com", "fxfb.seria.moe", "facebook.com"],
};
```

The `getRewriteChain()` function returns the chain for a hostname (resolving `CHAIN_ALIASES` first), or empty array if no rewrite exists. It also resolves any fixer domain (every chain element except the last, the canonical original) to its platform's chain, so user-posted fixer URLs are processed like any other input.

Also handles these variant hostnames with the same chains: `m.instagram.com`, `instagr.am`, `www.twitter.com`, `mobile.twitter.com`, `www.tiktok.com`, `vm.tiktok.com`, `m.tiktok.com`, `old.reddit.com`, `m.reddit.com`, `m.facebook.com`.

Carousel detection runs only for the Instagram chain — the `facebook.com/reel/` path matches the Instagram post-id regex and must not trigger image probing.

Preserve the path, and any remaining non-tracking query parameters, when rewriting the hostname.

## Tracking Parameter List

Maintain the list of stripped query parameter names (or prefixes, e.g. `utm_*`) as a single exported array in `src/lib/processMessage.ts`. Strip a parameter if its key exactly matches an entry, matches a known prefix pattern, or matches the domain-scoped map `TRACKING_PARAMS_BY_DOMAIN` for that hostname. Never strip parameters that are not on the known-tracking list, even if they look unfamiliar, since they may carry functional meaning for the target site.

## Fallback Chain System

### Embed Detection (`src/lib/embedDetector.ts`)

After posting, poll for embed generation up to `EMBED_WAIT_TIMEOUT` (default: 20000ms) at 500ms intervals. If no embed appears, try the next alternative in the chain by editing the message. This is the ground-truth check — rewritten URLs are not HTTP-validated before posting.

### Link Audit Log (`src/lib/linkLog.ts`)

Append-only JSONL log, one entry per rewritten URL: `{ts, host, path, chain, outcome, winner, attempts}`. `attempts` records each fixer tried and whether it produced an embed. Host + path only — no author, channel, or message text. Used to correlate content type (via `path`, e.g. `/reel/` vs `/p/`) with per-fixer outcomes. No entry is written when embed detection is disabled or the repost fails.

## Environment Variables

Required:
- `DISCORD_TOKEN` — Discord bot token

Optional:
- `EMBED_WAIT_TIMEOUT` — Embed detection timeout in ms (default: `20000`)
- `ENABLE_EMBED_DETECTION` — Toggle post-send embed checking (default: `true`)
- `DOMAIN_HEALTH_FILE` — Fixer health state file path (default: `.data/domain-health.json`)
- `LINK_LOG_FILE` — JSONL audit log of rewritten URLs (default: `.data/link-log.jsonl`)
- `CLEAN_CHANNEL_IDS` — Comma-separated channel allowlist; empty means all channels
- `HEARTBEAT_FILE` — Path to heartbeat touch-file (default: `/tmp/mikazuki-alive`)

## Conventions

- Use `async`/`await`, not raw Promise chains.
- Validate all environment variables at startup in `config.ts`; fail fast with a clear error if required vars are missing.
- Do not log message content containing user data at info level; use debug level if logging is needed for troubleshooting.
- Attempt to delete the original message; silently ignore failures (e.g. missing `MANAGE_MESSAGES` permission).
- All new domain rewrites or tracking parameters should be added to the respective config file, not hardcoded inline in logic.

## Testing

Unit test URL cleaning, rewriting, and domain health logic in isolation (no live Discord connection required). Cover:
- URLs with multiple tracking parameters mixed with legitimate parameters
- URLs from rewrite-mapped domains with and without paths/query strings
- Messages containing multiple URLs, only some of which need changes
- Messages with no URLs (no-op case)
- URL extraction: trailing punctuation, balanced parens, markdown links
- Domain health tracking and auto-downranking
- Fallback chain behavior with multiple alternatives