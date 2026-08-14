import fs from 'fs'
import path from 'path'
import { config } from '../config.js'

export interface LinkLogEntry {
  ts: string
  host: string
  path: string
  chain: string[]
  outcome: 'success' | 'failure'
  winner: string | null
  attempts: { domain: string; embed: boolean }[]
}

export const buildEntry = (
  url: string,
  chain: string[],
  outcome: 'success' | 'failure',
  attempts: { domain: string; embed: boolean }[],
  winner: string | null
): LinkLogEntry => {
  const u = new URL(url)
  return {
    ts: new Date().toISOString(),
    host: u.hostname,
    path: u.pathname,
    chain: [...chain],
    outcome,
    winner,
    attempts
  }
}

// ponytail: best-effort audit log; a lost line is non-critical, never crash the bot for it
export const appendEntry = (entry: LinkLogEntry): void => {
  try {
    fs.mkdirSync(path.dirname(config.linkLogFile), { recursive: true })
    fs.appendFileSync(config.linkLogFile, `${JSON.stringify(entry)}\n`)
  } catch {
    // unwritable path
  }
}
