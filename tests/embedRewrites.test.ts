import { describe, it, expect, vi } from 'vitest'
import { EMBED_REWRITE_CHAINS, getRewriteChain } from '../src/lib/embedRewrites.js'

vi.mock('../src/config.js', () => ({
  config: { domainHealthFile: '/tmp/mikazuki-embed-rewrites-health.json' }
}))

describe('EMBED_REWRITE_CHAINS', () => {
  it('all rewrite chains are valid', () => {
    for (const [from, chain] of Object.entries(EMBED_REWRITE_CHAINS)) {
      expect(from).toMatch(/^[a-z0-9.-]+$/)
      for (const to of chain) {
        expect(to).toMatch(/^[a-z0-9.-]+$/)
      }
    }
  })

  it('chains end with distinct canonical hosts', () => {
    const ends = [...new Set(Object.values(EMBED_REWRITE_CHAINS))].map(c => c[c.length - 1])
    expect(new Set(ends).size).toBe(ends.length)
  })
})

describe('getRewriteChain', () => {
  it('returns the chain for original domains', () => {
    expect(getRewriteChain('instagram.com')).toEqual(EMBED_REWRITE_CHAINS['instagram.com'])
    expect(getRewriteChain('facebook.com')).toEqual([
      'facebed.com',
      'fxfb.seria.moe',
      'facebook.com'
    ])
  })

  it('resolves fixer domains to their platform chain', () => {
    expect(getRewriteChain('vxtwitter.com')).toEqual(getRewriteChain('x.com'))
    expect(getRewriteChain('ddinstagram.com')).toEqual(getRewriteChain('instagram.com'))
    expect(getRewriteChain('facebed.com')).toEqual(getRewriteChain('facebook.com'))
  })

  it('returns empty array for unknown hosts', () => {
    expect(getRewriteChain('unknown.example')).toEqual([])
  })
})
