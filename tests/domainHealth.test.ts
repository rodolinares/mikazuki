import { describe, it, expect, beforeEach } from 'vitest'
import {
  recordFailure,
  recordSuccess,
  getFailureRate,
  getHealthyDomains,
  isDomainSuspect,
  clearAll
} from '../src/lib/domainHealth.js'

describe('domainHealth', () => {
  beforeEach(() => {
    clearAll()
  })

  describe('recordFailure', () => {
    it('increments failure count', () => {
      recordFailure('example.com')
      recordFailure('example.com')
      expect(getFailureRate('example.com')).toBe(1)
    })
  })

  describe('recordSuccess', () => {
    it('increments success count', () => {
      recordSuccess('example.com')
      recordSuccess('example.com')
      expect(getFailureRate('example.com')).toBe(0)
    })
  })

  describe('getFailureRate', () => {
    it('returns 0 for unknown domain', () => {
      expect(getFailureRate('unknown.com')).toBe(0)
    })

    it('calculates failure rate correctly', () => {
      recordSuccess('example.com')
      recordSuccess('example.com')
      recordFailure('example.com')
      expect(getFailureRate('example.com')).toBeCloseTo(1 / 3)
    })
  })

  describe('getHealthyDomains', () => {
    it('sorts domains by health', () => {
      recordFailure('bad.com')
      recordFailure('bad.com')
      recordFailure('bad.com')
      recordSuccess('good.com')
      recordSuccess('good.com')
      recordSuccess('good.com')

      const sorted = getHealthyDomains(['bad.com', 'good.com'])
      expect(sorted[0]).toBe('good.com')
      expect(sorted[1]).toBe('bad.com')
    })
  })

  describe('isDomainSuspect', () => {
    it('returns true for domains with >90% failure rate', () => {
      for (let i = 0; i < 10; i++) {
        recordFailure('suspect.com')
      }
      recordSuccess('suspect.com')
      expect(isDomainSuspect('suspect.com')).toBe(true)
    })

    it('returns false for healthy domains', () => {
      recordSuccess('healthy.com')
      recordSuccess('healthy.com')
      expect(isDomainSuspect('healthy.com')).toBe(false)
    })
  })

})