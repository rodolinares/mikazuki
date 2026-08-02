import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import fs from 'fs'
import {
  recordFailure,
  recordSuccess,
  getFailureRate,
  prioritizeDomains,
  save,
  clearAll
} from '../src/lib/domainHealth.js'

vi.mock('../src/config.js', () => ({
  config: { domainHealthFile: '/tmp/mikazuki-domain-health-test.json' }
}))

const STATE_PATH = '/tmp/mikazuki-domain-health-test.json'

beforeEach(() => {
  clearAll()
  fs.rmSync(STATE_PATH, { force: true })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('domainHealth', () => {
  describe('recordFailure / recordSuccess', () => {
    it('tracks failures', () => {
      recordFailure('example.com')
      recordFailure('example.com')
      expect(getFailureRate('example.com')).toBeCloseTo(3 / 4)
    })

    it('tracks successes', () => {
      recordSuccess('example.com')
      recordSuccess('example.com')
      expect(getFailureRate('example.com')).toBeCloseTo(1 / 4)
    })

    it('calculates failure rate', () => {
      recordSuccess('example.com')
      recordSuccess('example.com')
      recordFailure('example.com')
      expect(getFailureRate('example.com')).toBeCloseTo(2 / 5)
    })

    it('returns neutral 0.5 for unknown domain', () => {
      expect(getFailureRate('unknown.com')).toBe(0.5)
    })
  })

  describe('decay', () => {
    it('pulls failure rate toward neutral as it ages', () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-01-01'))
      recordFailure('slow.com')
      expect(getFailureRate('slow.com')).toBeCloseTo(2 / 3)

      vi.setSystemTime(new Date('2026-01-08'))
      expect(getFailureRate('slow.com')).toBeCloseTo(3 / 5)
    })
  })

  describe('prioritizeDomains', () => {
    it('sorts healthiest first', () => {
      recordFailure('bad.com')
      recordFailure('bad.com')
      recordFailure('bad.com')
      recordSuccess('good.com')
      recordSuccess('good.com')
      recordSuccess('good.com')

      const sorted = prioritizeDomains(['bad.com', 'good.com'])
      expect(sorted[0]).toBe('good.com')
      expect(sorted[1]).toBe('bad.com')
    })

    it('preserves original order for untracked domains', () => {
      expect(prioritizeDomains(['a.com', 'b.com'])).toEqual(['a.com', 'b.com'])
    })
  })

  describe('persistence', () => {
    it('writes state to disk on save and reloads it', async () => {
      recordSuccess('good.com')
      recordFailure('good.com')
      recordFailure('good.com')
      save()

      const disk = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'))
      expect(disk['good.com'].failures).toBe(2)

      clearAll()
      expect(getFailureRate('good.com')).toBe(0.5)

      vi.resetModules()
      const reloaded = await import('../src/lib/domainHealth.js')
      expect(reloaded.getFailureRate('good.com')).toBeCloseTo(3 / 5)
    })
  })
})
