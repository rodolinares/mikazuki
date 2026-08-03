const IG: string[] = [
  'ddinstagram.com',
  'uuinstagram.com',
  'xnstagram.com',
  'kkinstagram.com',
  'eeinstagram.com',
  'instagram.com'
]
const X: string[] = ['fxtwitter.com', 'fixupx.com', 'vxtwitter.com', 'fixvx.com', 'x.com']
const TWITTER: string[] = ['fxtwitter.com', 'vxtwitter.com', 'fixvx.com', 'twitter.com']
const TIKTOK: string[] = ['tnktok.com', 'kktiktok.com', 'tfxktok.com', 'tiktok.com']
const REDDIT: string[] = ['rxddit.com', 'redditez.com', 'vxreddit.com', 'reddit.com']
const FACEBOOK: string[] = ['facebed.com', 'fxfb.seria.moe', 'facebook.com']

export const EMBED_REWRITE_CHAINS: Record<string, string[]> = {
  'instagram.com': IG,
  'x.com': X,
  'twitter.com': TWITTER,
  'tiktok.com': TIKTOK,
  'reddit.com': REDDIT,
  'facebook.com': FACEBOOK
}

const CHAIN_ALIASES: Record<string, string> = {
  'www.instagram.com': 'instagram.com',
  'm.instagram.com': 'instagram.com',
  'instagr.am': 'instagram.com',
  'www.x.com': 'x.com',
  'www.twitter.com': 'twitter.com',
  'mobile.twitter.com': 'twitter.com',
  'vt.tiktok.com': 'tiktok.com',
  'www.tiktok.com': 'tiktok.com',
  'vm.tiktok.com': 'tiktok.com',
  'm.tiktok.com': 'tiktok.com',
  'www.reddit.com': 'reddit.com',
  'old.reddit.com': 'reddit.com',
  'm.reddit.com': 'reddit.com',
  'www.facebook.com': 'facebook.com',
  'm.facebook.com': 'facebook.com'
}

import { prioritizeDomains } from './domainHealth.js'

const FIXER_CHAINS = new Map<string, string[]>()
for (const chain of new Set(Object.values(EMBED_REWRITE_CHAINS))) {
  for (const fixer of chain.slice(0, -1)) {
    if (!FIXER_CHAINS.has(fixer)) FIXER_CHAINS.set(fixer, chain)
  }
}

export const getRewriteChain = (host: string): string[] => {
  const canonical = CHAIN_ALIASES[host] ?? host
  return prioritizeDomains(EMBED_REWRITE_CHAINS[canonical] ?? FIXER_CHAINS.get(host) ?? [])
}
