import { describe, it, expect, vi, beforeEach } from 'vitest'
import { checkHttpStatus } from '../src/lib/urlValidator.js'

vi.mock('../src/config.js', () => ({
  config: {
    urlValidationTimeout: 3000,
    embedWaitTimeout: 3000,
    enableUrlValidation: true,
    enableEmbedDetection: true
  }
}))

describe('urlValidator', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  describe('checkHttpStatus', () => {
    it('returns ok for successful HEAD request', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        status: 200
      }))

      const result = await checkHttpStatus('https://example.com')
      expect(result.ok).toBe(true)
      expect(result.status).toBe(200)
    })

    it('falls back to GET on 405', async () => {
      const fetchMock = vi.fn()
        .mockResolvedValueOnce({ ok: false, status: 405 })
        .mockResolvedValueOnce({ ok: true, status: 200 })

      vi.stubGlobal('fetch', fetchMock)

      const result = await checkHttpStatus('https://example.com')
      expect(result.ok).toBe(true)
      expect(fetchMock).toHaveBeenCalledTimes(2)
    })

    it('returns not ok for failed request', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: false,
        status: 404
      }))

      const result = await checkHttpStatus('https://example.com')
      expect(result.ok).toBe(false)
      expect(result.status).toBe(404)
    })

    it('returns not ok on network error', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')))

      const result = await checkHttpStatus('https://example.com')
      expect(result.ok).toBe(false)
      expect(result.status).toBe(0)
    })
  })

})