import { ChannelType, Message, TextChannel } from 'discord.js'
import { config } from '../config.js'
import { getRewriteChain } from './embedRewrites.js'
import { waitForEmbed } from './embedDetector.js'
import { recordFailure, recordSuccess } from './domainHealth.js'
import { appendEntry, buildEntry } from './linkLog.js'

const URL_REGEX = /https?:\/\/[^\s<>"]+/g

const TRACKING_PARAMS = [
  'fbclid',
  'gclid',
  'igsh',
  'igshid',
  'is_from_webapp',
  'ref',
  'sender_device',
  'si',
  'ttclid',
  'msclkid',
  'mc_cid',
  'mc_eid',
  '_hsenc',
  '_hsmi',
  'gbraid',
  'wbraid',
  'yclid',
  'oly_enc_id',
  'oly_anon_id',
  'mkt_tok',
  'rb_clickid',
  'vero_id',
  '_openstat',
  'dclid',
  'cjevent',
  'spm',
  'scm',
  'ref_src',
  'ref_url',
  'twclid',
  'bpctr',
  'ucat',
  'mibextid'
]

const TRACKING_PREFIXES = ['utm_']

// `s` is WordPress search on most of the web; only a share-tracking param on X/Twitter
const TRACKING_PARAMS_BY_DOMAIN: Record<string, string[]> = {
  'x.com': ['s'],
  'twitter.com': ['s']
}

const isTrackingParam = (key: string, host: string): boolean => {
  const lower = key.toLowerCase()
  if (TRACKING_PARAMS.includes(lower)) return true
  if (TRACKING_PREFIXES.some(p => lower.startsWith(p))) return true
  return Object.entries(TRACKING_PARAMS_BY_DOMAIN).some(
    ([domain, params]) => (host === domain || host.endsWith(`.${domain}`)) && params.includes(lower)
  )
}

export const stripTrackingParams = (url: URL, host?: string): void => {
  const h = host ?? url.hostname.toLowerCase()
  for (const key of [...url.searchParams.keys()]) {
    if (isTrackingParam(key, h)) url.searchParams.delete(key)
  }
}

const trimTrailingPunct = (url: string): string => {
  let trimmed = url.replace(/[.,;!?:'"\u201d\u2019]+$/, '')
  while (/[)\]]$/.test(trimmed)) {
    const ch = trimmed[trimmed.length - 1]
    const open = ch === ')' ? '(' : '['
    const opens = trimmed.split(open).length - 1
    const closes = trimmed.split(ch).length - 1
    if (closes > opens) trimmed = trimmed.slice(0, -1)
    else break
  }
  return trimmed
}

export const extractUrls = (content: string): string[] =>
  [...content.matchAll(URL_REGEX)].map(m => trimTrailingPunct(m[0]))

interface CleanedUrl {
  original: string
  cleaned: string
  alternatives: string[]
}

const cleanUrl = (match: string): CleanedUrl => {
  try {
    const url = new URL(match)
    const originalHost = url.hostname.toLowerCase()
    const chain = getRewriteChain(originalHost)

    const before = url.search
    stripTrackingParams(url, originalHost)
    const stripped = url.search !== before

    if (chain.length === 0) {
      return stripped
        ? { original: match, cleaned: url.toString(), alternatives: [] }
        : { original: match, cleaned: match, alternatives: [] }
    }

    const domain = chain[0]
    const testUrl = new URL(url.toString())
    testUrl.hostname = domain

    return {
      original: match,
      cleaned: testUrl.toString(),
      alternatives: chain.filter(d => d !== domain)
    }
  } catch {
    return { original: match, cleaned: match, alternatives: [] }
  }
}

interface RepostFile {
  attachment: string
  name?: string
}

const postMessage = async (
  msg: Message,
  content: string,
  files?: RepostFile[]
): Promise<Message | null> => {
  if ('send' in msg.channel) {
    try {
      const text = content
        ? `🧹 Link cleaned - originally shared by <@${msg.author.id}>\n> ${content.replace(/\n/g, '\n> ')}`
        : ''
      return await msg.channel.send({ content: text, files })
    } catch {
      return null
    }
  }

  return null
}

export const processMessage = async (msg: Message): Promise<void> => {
  const original = msg.content
  const urlMatches = extractUrls(original)

  if (urlMatches.length === 0) return

  const cleanedUrls: CleanedUrl[] = []
  let anyChanged = false

  for (const match of urlMatches) {
    const cleaned = cleanUrl(match)
    cleanedUrls.push(cleaned)
    if (cleaned.original !== cleaned.cleaned) {
      anyChanged = true
    }
  }

  if (!anyChanged) return

  console.log(
    `[${new Date().toLocaleString('sv-SE')}] [CLEAN] #${msg.channelId} @${msg.author.username}: ${original}`
  )

  let clean = original
  for (const cleaned of cleanedUrls) {
    clean = clean.replace(cleaned.original, cleaned.cleaned)
  }

  const files = msg.attachments.map(a => ({ attachment: a.url, name: a.name ?? undefined }))

  const sentMsg = await postMessage(msg, clean, files)
  if (!sentMsg) return
  await msg.delete().catch(() => null)

  if (!config.enableEmbedDetection) return

  if (
    msg.channel.type !== ChannelType.GuildText &&
    msg.channel.type !== ChannelType.GuildAnnouncement
  ) {
    return
  }

  const channel = msg.channel as TextChannel

  const firstHasEmbed = await waitForEmbed(channel, sentMsg.id)

  if (firstHasEmbed) {
    for (const cleaned of cleanedUrls) {
      if (cleaned.alternatives.length === 0) continue
      const firstDomain = new URL(cleaned.cleaned).hostname
      recordSuccess(firstDomain)
      appendEntry(
        buildEntry(
          cleaned.cleaned,
          [firstDomain, ...cleaned.alternatives],
          'success',
          [{ domain: firstDomain, embed: true }],
          firstDomain
        )
      )
    }
    return
  }

  for (const cleaned of cleanedUrls) {
    if (cleaned.alternatives.length === 0) continue

    const firstDomain = new URL(cleaned.cleaned).hostname
    const attempts: { domain: string; embed: boolean }[] = [{ domain: firstDomain, embed: false }]

    let currentUrl = cleaned.cleaned
    for (const alt of cleaned.alternatives) {
      const altUrl = new URL(cleaned.cleaned)
      altUrl.hostname = alt

      const newUrl = altUrl.toString()
      const newContent = sentMsg.content.replace(currentUrl, newUrl)
      const edited = await sentMsg.edit(newContent).catch(() => null)
      if (edited) currentUrl = newUrl

      const altHasEmbed = await waitForEmbed(channel, sentMsg.id)
      if (altHasEmbed) {
        recordSuccess(alt)
        recordFailure(firstDomain)
        for (const failed of attempts.slice(1)) recordFailure(failed.domain)
        appendEntry(
          buildEntry(
            cleaned.cleaned,
            [firstDomain, ...cleaned.alternatives],
            'success',
            [...attempts, { domain: alt, embed: true }],
            alt
          )
        )
        return
      }
      attempts.push({ domain: alt, embed: false })
    }
  }
}
