import { config } from '../config.js'

interface ValidationResult {
  ok: boolean
  status: number
}

export async function checkHttpStatus(url: string): Promise<ValidationResult> {
  const timeout = config.urlValidationTimeout

  try {
    let response = await fetch(url, {
      method: 'HEAD',
      signal: AbortSignal.timeout(timeout),
      redirect: 'follow'
    })

    if (!response.ok) {
      response = await fetch(url, {
        method: 'GET',
        signal: AbortSignal.timeout(timeout),
        redirect: 'follow'
      })
    }

    return {
      ok: true,
      status: response.status
    }
  } catch {
    return {
      ok: false,
      status: 0
    }
  }
}
