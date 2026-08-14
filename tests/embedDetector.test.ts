import { describe, it, expect, vi } from 'vitest'
import { hasRealEmbed } from '../src/lib/embedDetector.js'

vi.mock('../src/config.js', () => ({
  config: { embedWaitTimeout: 20000 }
}))

describe('hasRealEmbed', () => {
  it('accepts embeds with real image, thumbnail, or video', () => {
    expect(hasRealEmbed([{ image: { url: 'https://facecot.com/media/real.jpg' } }])).toBe(true)
    expect(hasRealEmbed([{ thumbnail: { url: 'https://cdn.facecot.com/thumb.jpg' } }])).toBe(true)
    expect(hasRealEmbed([{ video: { url: 'https://facecot.com/media/reel.mp4' } }])).toBe(true)
  })

  it('rejects embeds whose media is a known placeholder', () => {
    expect(hasRealEmbed([{ image: { url: 'https://facecot.com/og.png' } }])).toBe(false)
  })

  it('rejects embeds without media', () => {
    expect(hasRealEmbed([{}])).toBe(false)
    expect(hasRealEmbed([])).toBe(false)
  })
})
