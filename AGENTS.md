# AGENTS.md

This file provides guidance to OpenCode when working in this repository.

## Project Overview

A Discord bot that scans messages for URLs and reposts a cleaned version. The bot has four responsibilities:

1. **Tracking parameter removal**: Strip tracking query parameters (`fbclid`, `gclid`, `igsh`, `igshid`, `is_from_webapp`, `ref`, `s`, `sender_device`, `si`, any `utm_*`) from any URL found in a message.
2. **Embed-fixing rewrites**: If a URL's domain is known to produce a broken or missing embed on Discord, rewrite the domain to a known embed-friendly alternative using priority-ordered fallback chains.
3. **Fallback validation**: Validate each rewritten URL via HTTP request before posting, and after posting, verify embed generation. If validation fails or embed doesn't appear, try the next alternative in the chain.
4. **Carousel detection**: For Instagram posts, detect multi-image carousels and repost each image as a separate embed.

If a message's URLs required any change, the bot deletes the original message and reposts the cleaned content, attributed to the original author. If no changes were needed, the bot takes no action.

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
  index.ts            # Bot entry point, client login, event registration, MessageCreate handler
  config.ts           # Environment variable loading and validation (uses --env-file=.env)
  lib/
    embedRewrites.ts   # EMBED_REWRITE_CHAINS map + getRewriteChain()
    urlValidator.ts    # HTTP HEAD/GET validation for rewritten URLs
    embedDetector.ts   # Post-send embed detection with polling
    carouselDetector.ts # Instagram carousel multi-image detection via image probing
    processMessage.ts  # Orchestrates everything: URL extraction, tracking stripping, rewriting, validation, fallback, carousel handling, reposting
tests/
  embedRewrites.test.ts
  trackingParams.test.ts
  urlValidator.test.ts
```

Tracking params and URL regex are defined inline in `src/lib/processMessage.ts` — not in separate files.

## Domain Rewrite Chains

Maintain the domain rewrite chains as a single exported object in `src/lib/embedRewrites.ts`, keyed by the original hostname. Each value is an ordered array of alternatives to try, with the most reliable first:

```typescript
export const EMBED_REWRITE_CHAINS: Record<string, string[]> = {
  // Instagram: ddinstagram is most established
  "instagram.com": ["ddinstagram.com", "uuinstagram.com", "xnstagram.com", "kkinstagram.com", "eeinstagram.com", "instagram.com"],
  "www.instagram.com": ["ddinstagram.com", "uuinstagram.com", "xnstagram.com", "kkinstagram.com", "eeinstagram.com", "instagram.com"],
  
  // Twitter/X: fxtwitter is gold standard
  "x.com": ["fxtwitter.com", "fixupx.com", "vxtwitter.com", "fixvx.com", "x.com"],
  "www.x.com": ["fxtwitter.com", "fixupx.com", "vxtwitter.com", "fixvx.com", "x.com"],
  "twitter.com": ["fxtwitter.com", "vxtwitter.com", "fixvx.com", "twitter.com"],
  
  // TikTok: tnktok is open source best
  "tiktok.com": ["tnktok.com", "kktiktok.com", "tfxktok.com", "tiktok.com"],
  "vt.tiktok.com": ["tnktok.com", "kktiktok.com", "tfxktok.com", "tiktok.com"],
  
  // Reddit: rxddit is original
  "reddit.com": ["rxddit.com", "redditez.com", "vxreddit.com", "reddit.com"],
  "www.reddit.com": ["rxddit.com", "redditez.com", "vxreddit.com", "reddit.com"],
};
```

The `getRewriteChain()` function returns the chain for a hostname, or empty array if no rewrite exists.

Also handles these variant hostnames with the same chains: `m.instagram.com`, `instagr.am`, `www.twitter.com`, `mobile.twitter.com`, `www.tiktok.com`, `vm.tiktok.com`, `m.tiktok.com`, `old.reddit.com`, `m.reddit.com`.

Preserve the path, and any remaining non-tracking query parameters, when rewriting the hostname.

## Tracking Parameter List

Maintain the list of stripped query parameter names (or prefixes, e.g. `utm_*`) as a single exported array in `src/lib/processMessage.ts`. Strip a parameter if its key exactly matches an entry or matches a known prefix pattern. Never strip parameters that are not on the known-tracking list, even if they look unfamiliar, since they may carry functional meaning for the target site.

## Fallback Chain System

### URL Validation (`src/lib/urlValidator.ts`)

Before posting a cleaned URL, validate it via HTTP HEAD request (fallback to GET on 405). Returns ok/fail status. Configurable timeout via `URL_VALIDATION_TIMEOUT` (default: 3000ms). Only validates alternatives past index 0 (the primary rewrite domain is trusted).

### Embed Detection (`src/lib/embedDetector.ts`)

After posting, poll for embed generation up to `EMBED_WAIT_TIMEOUT` (default: 7000ms) at 500ms intervals. If no embed appears, try the next alternative in the chain by editing the message.

## Environment Variables

Required:
- `DISCORD_TOKEN` — Discord bot token

Optional:
- `WEBHOOK_IMPERSONATION` — Repost as original author via webhook (default: `false`)
- `URL_VALIDATION_TIMEOUT` — HTTP validation timeout in ms (default: `3000`)
- `EMBED_WAIT_TIMEOUT` — Embed detection timeout in ms (default: `7000`)
- `ENABLE_URL_VALIDATION` — Toggle HTTP validation (default: `true`)
- `ENABLE_EMBED_DETECTION` — Toggle post-send embed checking (default: `true`)

## Conventions

- Use `async`/`await`, not raw Promise chains.
- Validate all environment variables at startup in `config.ts`; fail fast with a clear error if required vars are missing.
- Do not log message content containing user data at info level; use debug level if logging is needed for troubleshooting.
- Attempt to delete the original message; silently ignore failures (e.g. missing `MANAGE_MESSAGES` permission).
- All new domain rewrites or tracking parameters should be added to the respective config file, not hardcoded inline in logic.

## Testing

Unit test URL cleaning, rewriting, validation, and domain health logic in isolation (no live Discord connection required). Cover:
- URLs with multiple tracking parameters mixed with legitimate parameters
- URLs from rewrite-mapped domains with and without paths/query strings
- Messages containing multiple URLs, only some of which need changes
- Messages with no URLs (no-op case)
- URL validation with mocked fetch responses
- Domain health tracking and auto-downranking
- Fallback chain behavior with multiple alternatives