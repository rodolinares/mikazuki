import { getHealthyDomains, isDomainSuspect } from './domainHealth.js'

export const EMBED_REWRITE_CHAINS: Record<string, string[]> = {
  'instagram.com': [
    'ddinstagram.com',
    'xnstagram.com',
    'kkinstagram.com',
    'eeinstagram.com',
    'instagram.com'
  ],
  'www.instagram.com': [
    'ddinstagram.com',
    'xnstagram.com',
    'kkinstagram.com',
    'eeinstagram.com',
    'instagram.com'
  ],
  'm.instagram.com': [
    'ddinstagram.com',
    'xnstagram.com',
    'kkinstagram.com',
    'eeinstagram.com',
    'instagram.com'
  ],
  'instagr.am': [
    'ddinstagram.com',
    'xnstagram.com',
    'kkinstagram.com',
    'eeinstagram.com',
    'instagram.com'
  ],
  'x.com': ['fxtwitter.com', 'fixupx.com', 'vxtwitter.com', 'fixvx.com', 'x.com'],
  'www.x.com': ['fxtwitter.com', 'fixupx.com', 'vxtwitter.com', 'fixvx.com', 'x.com'],
  'twitter.com': ['fxtwitter.com', 'vxtwitter.com', 'fixvx.com', 'twitter.com'],
  'www.twitter.com': ['fxtwitter.com', 'vxtwitter.com', 'fixvx.com', 'twitter.com'],
  'mobile.twitter.com': ['fxtwitter.com', 'vxtwitter.com', 'fixvx.com', 'twitter.com'],
  'tiktok.com': ['tnktok.com', 'kktiktok.com', 'tfxktok.com', 'tiktok.com'],
  'vt.tiktok.com': ['tnktok.com', 'kktiktok.com', 'tfxktok.com', 'tiktok.com'],
  'www.tiktok.com': ['tnktok.com', 'kktiktok.com', 'tfxktok.com', 'tiktok.com'],
  'vm.tiktok.com': ['tnktok.com', 'kktiktok.com', 'tfxktok.com', 'tiktok.com'],
  'm.tiktok.com': ['tnktok.com', 'kktiktok.com', 'tfxktok.com', 'tiktok.com'],
  'reddit.com': ['rxddit.com', 'redditez.com', 'vxreddit.com', 'reddit.com'],
  'www.reddit.com': ['rxddit.com', 'redditez.com', 'vxreddit.com', 'reddit.com'],
  'old.reddit.com': ['rxddit.com', 'redditez.com', 'vxreddit.com', 'reddit.com'],
  'm.reddit.com': ['rxddit.com', 'redditez.com', 'vxreddit.com', 'reddit.com']
}

export const rewriteDomain = (url: URL): boolean => {
  const host = url.hostname.toLowerCase()
  const chain = EMBED_REWRITE_CHAINS[host]
  if (!chain || chain.length === 0) return false
  url.hostname = chain[0]
  return true
}

export const getRewriteChain = (host: string): string[] => {
  const chain = EMBED_REWRITE_CHAINS[host.toLowerCase()] || []
  return getHealthyDomains(chain).filter(d => !isDomainSuspect(d))
}
