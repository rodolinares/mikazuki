const isTTY = process.stdout.isTTY === true

const c = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  gray: '\x1b[90m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
}

const fmt = (level: string, levelColor: string, msg: string, extra?: object): string => {
  const time = new Date().toLocaleTimeString('sv-SE')
  const extraStr = extra ? ` ${c.dim}${JSON.stringify(extra)}${c.reset}` : ''
  return `${c.dim}${time}${c.reset} ${levelColor}${level}${c.reset} ${c.bold}${msg}${c.reset}${extraStr}`
}

export const logInfo = (msg: string, extra?: object): void => {
  if (isTTY) {
    console.log(fmt('info', c.green, msg, extra))
  } else {
    console.log(JSON.stringify({ ts: new Date().toISOString(), level: 'info', msg, ...extra }))
  }
}

export const logError = (msg: string, err: unknown, extra?: object): void => {
  const e = err instanceof Error ? { err: err.message, stack: err.stack } : { err: String(err) }
  if (isTTY) {
    console.error(fmt('error', c.red, msg, { ...e, ...extra }))
  } else {
    console.error(
      JSON.stringify({ ts: new Date().toISOString(), level: 'error', msg, ...e, ...extra })
    )
  }
}

export const logDebug = (msg: string, extra?: object): void => {
  if (isTTY) {
    console.debug(fmt('debug', c.gray, msg, extra))
  } else {
    console.debug(JSON.stringify({ ts: new Date().toISOString(), level: 'debug', msg, ...extra }))
  }
}
