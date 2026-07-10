export const EMBED_REWRITES: Record<string, string> = {
  'instagram.com': 'kkinstagram.com',
  'www.instagram.com': 'kkinstagram.com',
  'x.com': 'fxtwitter.com',
  'www.x.com': 'fxtwitter.com',
  'twitter.com': 'fxtwitter.com',
  'www.twitter.com': 'fxtwitter.com',
  'tiktok.com': 'kktiktok.com',
  'vt.tiktok.com': 'kktiktok.com',
  'www.tiktok.com': 'kktiktok.com',
  'reddit.com': 'rxddit.com',
  'www.reddit.com': 'rxddit.com'
}

export const rewriteDomain = (url: URL): boolean => {
  const host = url.hostname.toLowerCase()
  const replacement = EMBED_REWRITES[host]
  if (!replacement) return false
  url.hostname = replacement
  return true
}
