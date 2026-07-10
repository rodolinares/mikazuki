const URL_REGEX = /https?:\/\/[^\s<>"]+/g

export const extractUrls = (text: string): URL[] => {
  const matches = text.match(URL_REGEX) ?? []
  return matches
    .map(m => {
      try {
        return new URL(m)
      } catch {
        return null
      }
    })
    .filter((u): u is URL => u !== null)
}
