const TRACKING_PARAMS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'fbclid',
  'gclid',
  'igshid',
  'si',
  'ref',
  'igsh',
  'is_from_webapp',
  'sender_device'
]

const TRACKING_PREFIXES = ['utm_']

export const isTrackingParam = (key: string): boolean => {
  const lower = key.toLowerCase()
  if (TRACKING_PARAMS.includes(lower)) return true
  return TRACKING_PREFIXES.some(p => lower.startsWith(p))
}

export const stripTrackingParams = (url: URL): void => {
  for (const key of [...url.searchParams.keys()]) {
    if (isTrackingParam(key)) url.searchParams.delete(key)
  }
}
