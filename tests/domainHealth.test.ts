import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import {
  recordSuccess,
  recordFailure,
  getFailureRate,
  prioritizeDomains,
  save,
  clearAll
} from '../src/lib/domainHealth.js'

vi.mock('../src/config.js', () => ({
  config: { domainHealthFile: '/tmp/mikazuki-domain-health-test.json' }
}))

const STATE_PATH = '/tmp/mikazuki-domain-health-test.json'

describe('domainHealth', () => {
  beforeEach(() => {
    clearAll()
    fs.rmSync(STATE_PATH, { force: true })
  })
  afterEach(() => {
    clearAll()
  })

  it('unknown domains default to 0.5 failure rate', () => {
    expect(getFailureRate('unknown.example')).toBe(0.5)
  })

  it('tracks plain success/failure counters', () => {
    recordSuccess('a.com')
    expect(getFailureRate('a.com')).toBe(0)

    recordFailure('b.com')
    expect(getFailureRate('b.com')).toBe(1)

    recordFailure('c.com')
    recordFailure('c.com')
    recordFailure('c.com')
    recordSuccess('c.com')
    expect(getFailureRate('c.com')).toBe(0.75)
  })

  it('prioritizes lower failure rate first', () => {
    recordFailure('bad.example')
    recordFailure('bad.example')
    recordSuccess('good.example')

    const ordered = prioritizeDomains(['good.example', 'mid.example', 'bad.example'])
    expect(ordered[0]).toBe('good.example')
    expect(ordered[2]).toBe('bad.example')
  })

  it('writes state to disk on save and reloads it', async () => {
    recordSuccess('good.com')
    recordFailure('good.com')
    recordFailure('good.com')
    save()

    const disk = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'))
    expect(disk['good.com'].failures).toBe(2)

    vi.resetModules()
    const reloaded = await import('../src/lib/domainHealth.js')
    expect(reloaded.getFailureRate('good.com')).toBe(2 / 3)
  })
})
