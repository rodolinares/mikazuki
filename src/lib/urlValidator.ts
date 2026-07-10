import { config } from '../config.js'

export interface ValidationResult {
  ok: boolean
  status: number
  url: string
}

export async function checkHttpStatus(url: string): Promise<ValidationResult> {
  const timeout = config.urlValidationTimeout

  try {
    // Try HEAD first, fallback to GET if 405
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

export async function validateUrl(url: string): Promise<boolean> {
  const result = await checkHttpStatus(url)
  return result.ok
}

export async function findWorkingUrl(urls: string[]): Promise<string | null> {
  for (const url of urls) {
    const result = await checkHttpStatus(url)
    if (result.ok) {
      return url
    }
  }
  return null
}
