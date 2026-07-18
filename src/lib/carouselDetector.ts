const INSTAGRAM_PATHS = /^\/(?:p|reel|reels|tv)\/([a-zA-Z0-9_-]+)/
const USER_INSTAGRAM_PATH = /^\/[a-zA-Z0-9_.-]+\/(?:p|reel)\/([a-zA-Z0-9_-]+)/

export const extractPostId = (pathname: string): string | null => {
  const m = pathname.match(INSTAGRAM_PATHS) ?? pathname.match(USER_INSTAGRAM_PATH)
  return m?.[1] ?? null
}

const INSTAFIX_DOMAINS = ['ddinstagram.com', 'uuinstagram.com', 'eeinstagram.com']
const PROBE_TIMEOUT = 1500

const imgUrl = (domain: string, postId: string, n: number) =>
  `https://${domain}/images/${postId}/${n}`

const imageExists = async (url: string): Promise<boolean> => {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(PROBE_TIMEOUT),
      redirect: 'follow'
    })
    return res.ok && (res.headers.get('content-type')?.startsWith('image/') ?? false)
  } catch {
    return false
  }
}

const probeDomain = async (postId: string, domain: string): Promise<string[]> => {
  const [has2, has3, has4] = await Promise.all([
    imageExists(imgUrl(domain, postId, 2)),
    imageExists(imgUrl(domain, postId, 3)),
    imageExists(imgUrl(domain, postId, 4))
  ])

  if (!has2) return []

  const urls = [imgUrl(domain, postId, 1), imgUrl(domain, postId, 2)]
  if (has3) urls.push(imgUrl(domain, postId, 3))
  if (has4) urls.push(imgUrl(domain, postId, 4))
  return urls
}

export const detectCarouselImages = async (
  postId: string,
  workingDomain: string
): Promise<string[]> => {
  const candidates = [...new Set([...INSTAFIX_DOMAINS, workingDomain])]

  for (const domain of candidates) {
    const images = await probeDomain(postId, domain)
    if (images.length > 1) return images
  }

  return []
}
