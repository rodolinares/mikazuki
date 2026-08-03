import { describe, it, expect, vi } from 'vitest'
import { extractUrls } from '../src/lib/processMessage.js'

vi.mock('../src/config.js', () => ({
  config: { token: 'mock-token' }
}))

describe('extractUrls', () => {
  it('extracts plain URLs', () => {
    expect(extractUrls('see https://example.com/a now')).toEqual(['https://example.com/a'])
  })

  it('trims trailing punctuation', () => {
    expect(extractUrls('see https://example.com/a, then https://example.com/b.'))
      .toEqual(['https://example.com/a', 'https://example.com/b'])
  })

  it('trims trailing quotes and marks', () => {
    expect(extractUrls('check "https://example.com/a!"')).toEqual(['https://example.com/a'])
  })

  it('keeps balanced parentheses in URLs', () => {
    expect(extractUrls('see https://en.wikipedia.org/wiki/Foo_(bar) here'))
      .toEqual(['https://en.wikipedia.org/wiki/Foo_(bar)'])
  })

  it('trims unmatched closing parens', () => {
    expect(extractUrls('(see https://example.com/a)')).toEqual(['https://example.com/a'])
  })

  it('preserves markdown link URLs', () => {
    expect(extractUrls('[click](https://x.com/a?fbclid=1)')).toEqual([
      'https://x.com/a?fbclid=1'
    ])
  })

  it('extracts multiple URLs', () => {
    const urls = extractUrls('a https://x.com/1 b https://y.com/2 c https://z.com/3')
    expect(urls).toHaveLength(3)
  })

  it('returns empty for no URLs', () => {
    expect(extractUrls('no urls here')).toEqual([])
  })
})
