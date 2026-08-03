import fs from 'fs'
import path from 'path'
import { config } from '../config.js'

interface DomainStats {
  successes: number
  failures: number
}

const SAVE_DEBOUNCE_MS = 1000

const health = new Map<string, DomainStats>()
let loaded = false
let saveTimer: ReturnType<typeof setTimeout> | null = null

const load = (): void => {
  if (loaded) return
  loaded = true
  try {
    const raw = JSON.parse(fs.readFileSync(config.domainHealthFile, 'utf8')) as Record<
      string,
      DomainStats
    >
    for (const [domain, stats] of Object.entries(raw)) {
      if (typeof stats?.failures === 'number' && typeof stats?.successes === 'number') {
        health.set(domain, stats)
      }
    }
  } catch {
    // first run or unreadable file
  }
}

const bump = (domain: string, kind: 'successes' | 'failures'): void => {
  load()
  const prev = health.get(domain)
  const stats = prev ?? { successes: 0, failures: 0 }
  stats[kind] += 1
  health.set(domain, stats)
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(save, SAVE_DEBOUNCE_MS)
}

// ponytail: best-effort persistence; health loss is non-critical, never crash the bot for it
export const save = (): void => {
  load()
  try {
    const data = Object.fromEntries(health)
    fs.mkdirSync(path.dirname(config.domainHealthFile), { recursive: true })
    fs.writeFileSync(config.domainHealthFile, JSON.stringify(data, null, 2))
  } catch {
    // unwritable path
  }
}

export const recordSuccess = (domain: string): void => bump(domain, 'successes')
export const recordFailure = (domain: string): void => bump(domain, 'failures')

export const getFailureRate = (domain: string): number => {
  load()
  const stats = health.get(domain)
  if (!stats) return 0.5
  const total = stats.successes + stats.failures
  if (total === 0) return 0.5
  return stats.failures / total
}

export const prioritizeDomains = (domains: string[]): string[] =>
  [...domains].sort((a, b) => getFailureRate(a) - getFailureRate(b))

export const clearAll = (): void => {
  load()
  if (saveTimer) clearTimeout(saveTimer)
  health.clear()
}

process.once('exit', () => {
  if (saveTimer) clearTimeout(saveTimer)
  save()
})
