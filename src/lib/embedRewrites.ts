export const EMBED_REWRITES: Record<string, string> = {
  "instagram.com": "ddinstagram.com",
  "www.instagram.com": "ddinstagram.com",
  "x.com": "fixupx.com",
  "twitter.com": "fixupx.com",
  "tiktok.com": "vxtiktok.com",
  "reddit.com": "rxddit.com",
};

export const rewriteDomain = (url: URL): boolean => {
  const host = url.hostname.toLowerCase();
  const replacement = EMBED_REWRITES[host];
  if (!replacement) return false;
  url.hostname = replacement;
  return true;
};
