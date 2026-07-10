import fs from 'fs'
import os from 'os'
import path from 'path'

interface DomainStats {
  failures: number
  successes: number
  lastUpdated: number
}

const statePath = path.join(
  process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config'),
  'opencode',
  '.domain-health.json'
)

let healthData: Map<string, DomainStats> = new Map()

function loadHealthData(): void {
  try {
    const data = JSON.parse(fs.readFileSync(statePath, 'utf8'))
    healthData = new Map(Object.entries(data))
  } catch {
    healthData = new Map()
  }
}

function saveHealthData(): void {
  const data = Object.fromEntries(healthData)
  fs.mkdirSync(path.dirname(statePath), { recursive: true })
  fs.writeFileSync(statePath, JSON.stringify(data, null, 2))
}

export function recordFailure(domain: string): void {
  const stats = healthData.get(domain) || { failures: 0, successes: 0, lastUpdated: Date.now() }
  stats.failures++
  stats.lastUpdated = Date.now()
  healthData.set(domain, stats)
  saveHealthData()
}

export function recordSuccess(domain: string): void {
  const stats = healthData.get(domain) || { failures: 0, successes: 0, lastUpdated: Date.now() }
  stats.successes++
  stats.lastUpdated = Date.now()
  healthData.set(domain, stats)
  saveHealthData()
}

export function getFailureRate(domain: string): number {
  const stats = healthData.get(domain)
  if (!stats) return 0
  const total = stats.failures + stats.successes
  if (total === 0) return 0
  return stats.failures / total
}

export function getHealthyDomains(domains: string[]): string[] {
  return [...domains].sort((a, b) => {
    const rateA = getFailureRate(a)
    const rateB = getFailureRate(b)
    return rateA - rateB
  })
}

export function isDomainSuspect(domain: string): boolean {
  return getFailureRate(domain) > 0.9
}

export function resetDaily(): void {
  const now = Date.now()
  const oneDay = 24 * 60 * 60 * 1000

  for (const [domain, stats] of healthData) {
    if (now - stats.lastUpdated > oneDay) {
      healthData.delete(domain)
    }
  }
  saveHealthData()
}

export function clearAll(): void {
  healthData.clear()
  saveHealthData()
}

loadHealthData()
