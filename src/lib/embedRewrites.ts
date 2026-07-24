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

export const EMBED_REWRITE_CHAINS: Record<string, string[]> = {
  'instagram.com': IG,
  'www.instagram.com': IG,
  'm.instagram.com': IG,
  'instagr.am': IG,
  'x.com': X,
  'www.x.com': X,
  'twitter.com': TWITTER,
  'www.twitter.com': TWITTER,
  'mobile.twitter.com': TWITTER,
  'tiktok.com': TIKTOK,
  'vt.tiktok.com': TIKTOK,
  'www.tiktok.com': TIKTOK,
  'vm.tiktok.com': TIKTOK,
  'm.tiktok.com': TIKTOK,
  'reddit.com': REDDIT,
  'www.reddit.com': REDDIT,
  'old.reddit.com': REDDIT,
  'm.reddit.com': REDDIT
}
