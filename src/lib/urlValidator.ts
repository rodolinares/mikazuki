import { config } from '../config.js'

interface ValidationResult {
  ok: boolean
  status: number
  url: string
}

export async function checkHttpStatus(url: string): Promise<ValidationResult> {
  const timeout = config.urlValidationTimeout

  try {
    let response = await fetch(url, {
      method: 'HEAD',
      signal: AbortSignal.timeout(timeout),
      redirect: 'follow'
    })

    if (response.status === 405) {
      response = await fetch(url, {
        method: 'GET',
        signal: AbortSignal.timeout(timeout),
        redirect: 'follow'
      })
    }

    return {
      ok: response.ok,
      status: response.status,
      url
    }
  } catch {
    return {
      ok: false,
      status: 0,
      url
    }
  }
}
