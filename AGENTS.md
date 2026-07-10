# AGENTS.md

This file provides guidance to OpenCode when working in this repository.

## Project Overview

A Discord bot that scans messages for URLs and reposts a cleaned version. The bot has two responsibilities:

1. **Tracking parameter removal**: Strip tracking query parameters (e.g. `utm_source`, `utm_medium`, `fbclid`, `gclid`, `igshid`, `si`, `ref`, `igsh`, `is_from_webapp`, `sender_device`) from any URL found in a message. Also matches any `utm_*` prefix.
2. **Embed-fixing rewrites**: If a URL's domain is known to produce a broken or missing embed on Discord, rewrite the domain to a known embed-friendly alternative (e.g. `instagram.com` → `kkinstagram.com`, `x.com`/`twitter.com` → `fxtwitter.com`, `tiktok.com` → `kktiktok.com`, `reddit.com` → `rxddit.com`).

If a message's URLs required either type of change, the bot deletes the original message and reposts the cleaned content, attributed to the original author. If no changes were needed, the bot takes no action.

## Tech Stack

- **Language**: TypeScript (strict mode)
- **Package manager**: pnpm (never use npm or yarn; do not commit `package-lock.json` or `yarn.lock`)
- **Runtime**: Node.js (LTS)
- **Discord library**: discord.js (v14+)
- **Linting/formatting**: ESLint + Prettier

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
  index.ts            # Bot entry point, client login, event registration
  config.ts           # Environment variable loading and validation (uses --env-file=.env)
  events/
    messageCreate.ts   # Filters bot messages, delegates to processMessage
  lib/
    urlExtractor.ts    # Finds URLs within message content via regex
    trackingParams.ts  # isTrackingParam() + stripTrackingParams() for known tracking query params
    embedRewrites.ts   # EMBED_REWRITES map + rewriteDomain() for domain-to-domain rewrites
    processMessage.ts  # Orchestrates extraction, cleaning, rewriting; reposts via webhook (or fallback mention)
tests/
  ...                  # Unit tests mirroring src/ structure
```

## Domain Rewrite Map

Maintain the domain rewrite map as a single exported object in `src/lib/embedRewrites.ts`, keyed by the original hostname, so new sites can be added without touching logic elsewhere:

```typescript
export const EMBED_REWRITES: Record<string, string> = {
  "instagram.com": "kkinstagram.com",
  "www.instagram.com": "kkinstagram.com",
  "x.com": "fxtwitter.com",
  "www.x.com": "fxtwitter.com",
  "twitter.com": "fxtwitter.com",
  "www.twitter.com": "fxtwitter.com",
  "tiktok.com": "kktiktok.com",
  "vt.tiktok.com": "kktiktok.com",
  "www.tiktok.com": "kktiktok.com",
  "reddit.com": "rxddit.com",
  "www.reddit.com": "rxddit.com",
};
```

Preserve the path, and any remaining non-tracking query parameters, when rewriting the hostname.

## Tracking Parameter List

Maintain the list of stripped query parameter names (or prefixes, e.g. `utm_*`) as a single exported array or set in `src/lib/trackingParams.ts`. Strip a parameter if its key exactly matches an entry or matches a known prefix pattern. Never strip parameters that are not on the known-tracking list, even if they look unfamiliar, since they may carry functional meaning for the target site.

## Conventions

- Use `async`/`await`, not raw Promise chains.
- Validate all environment variables at startup in `config.ts`; fail fast with a clear error if any are missing. Currently only `DISCORD_TOKEN` is required.
- Do not log message content containing user data at info level; use debug level if logging is needed for troubleshooting.
- Attempt to delete the original message; silently ignore failures (e.g. missing `MANAGE_MESSAGES` permission).
- All new domain rewrites or tracking parameters should be added to the respective config file, not hardcoded inline in logic.

## Testing

Unit test URL cleaning and rewriting logic in isolation (no live Discord connection required). Cover:
- URLs with multiple tracking parameters mixed with legitimate parameters
- URLs from rewrite-mapped domains with and without paths/query strings
- Messages containing multiple URLs, only some of which need changes
- Messages with no URLs (no-op case)