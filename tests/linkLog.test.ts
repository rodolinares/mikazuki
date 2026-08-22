import { describe, it, expect, vi } from 'vitest'
import { buildEntry } from '../src/lib/linkLog.js'

vi.mock('../src/config.js', () => ({
  config: { linkLogFile: '/tmp/mikazuki-link-log-test.jsonl' }
}))

describe('linkLog.buildEntry', () => {
  it('extracts host and path from url, copies chain', () => {
    const chain = ['fxtwitter.com', 'fixupx.com', 'x.com']
    const entry = buildEntry(
      'https://fxtwitter.com/someuser/status/123456',
      chain,
      'success',
      [{ domain: 'fxtwitter.com', embed: true }],
      'fxtwitter.com'
    )
    expect(entry.host).toBe('fxtwitter.com')
    expect(entry.path).toBe('/someuser/status/123456')
    expect(entry.chain).toEqual(chain)
    expect(entry.chain).not.toBe(chain)
  })

  it('preserves query string in path for content-type analysis', () => {
    const entry = buildEntry(
      'https://kkinstagram.com/p/abc123/?img_index=1',
      ['kkinstagram.com', 'instagram.com'],
      'success',
      [],
      'kkinstagram.com'
    )
    expect(entry.path).toBe('/p/abc123/')
  })

  it('records failure with attempts and no winner', () => {
    const entry = buildEntry(
      'https://facebed.com/some/path',
      ['facebed.com', 'facebook.com'],
      'failure',
      [{ domain: 'facebed.com', embed: false }],
      null
    )
    expect(entry.outcome).toBe('failure')
    expect(entry.winner).toBeNull()
    expect(entry.attempts).toEqual([{ domain: 'facebed.com', embed: false }])
  })
})
