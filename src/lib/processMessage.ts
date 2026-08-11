import { ChannelType, EmbedBuilder, Message, TextChannel, Webhook } from 'discord.js'
import { config } from '../config.js'
import { extractPostId, detectCarouselImages } from './carouselDetector.js'
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
  'www.x.com': ['s'],
  'twitter.com': ['s'],
  'www.twitter.com': ['s'],
  'mobile.twitter.com': ['s']
}

const isTrackingParam = (key: string, host: string): boolean => {
  const lower = key.toLowerCase()
  if (TRACKING_PARAMS.includes(lower)) return true
  if (TRACKING_PREFIXES.some(p => lower.startsWith(p))) return true
  return (TRACKING_PARAMS_BY_DOMAIN[host] ?? []).includes(lower)
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

const webhookCache = new Map<string, Webhook>()

const getOrCreateWebhook = async (msg: Message): Promise<Webhook | null> => {
  const cached = webhookCache.get(msg.channelId)
  if (cached) return cached

  if (
    msg.channel.type !== ChannelType.GuildText &&
    msg.channel.type !== ChannelType.GuildAnnouncement
  ) {
    return null
  }

  try {
    const channel = msg.channel as TextChannel
    let webhook = (await channel.fetchWebhooks()).find(w => w.name === 'Mikazuki')
    if (!webhook) {
      webhook = await channel.createWebhook({ name: 'Mikazuki' })
    }
    webhookCache.set(msg.channelId, webhook)
    return webhook
  } catch {
    return null
  }
}

interface CleanedUrl {
  original: string
  cleaned: string
  alternatives: string[]
  carouselImages?: string[]
}

const cleanUrl = async (match: string): Promise<CleanedUrl> => {
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

    const postId = chain[chain.length - 1] === 'instagram.com' ? extractPostId(url.pathname) : null
    const carouselImages = postId ? await detectCarouselImages(postId, domain) : []
    return {
      original: match,
      cleaned: testUrl.toString(),
      alternatives: chain.filter(d => d !== domain),
      carouselImages
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
  embeds?: EmbedBuilder[],
  files?: RepostFile[]
): Promise<Message | null> => {
  const webhook = config.webhookImpersonation ? await getOrCreateWebhook(msg) : null

  if (webhook) {
    try {
      const sent = await webhook.send({
        content,
        embeds,
        files,
        username: msg.author.username,
        avatarURL: msg.author.displayAvatarURL()
      })
      return sent
    } catch {
      // webhook failed, fall through to text
    }
  }

  if ('send' in msg.channel) {
    try {
      const text = content
        ? `🧹 Link cleaned - originally shared by <@${msg.author.id}>\n> ${content}`
        : ''
      return await msg.channel.send({ content: text, embeds, files })
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
    const cleaned = await cleanUrl(match)
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
  const carouselUrls = cleanedUrls.filter(c => c.carouselImages && c.carouselImages.length > 1)

  let sentMsg: Message | null

  if (carouselUrls.length > 0) {
    let carouselClean = original
    for (const cleaned of cleanedUrls) {
      if (cleaned.carouselImages && cleaned.carouselImages.length > 1) {
        carouselClean = carouselClean.replace(cleaned.original, '')
      } else {
        carouselClean = carouselClean.replace(cleaned.original, cleaned.cleaned)
      }
    }
    carouselClean = carouselClean.replace(/\s{2,}/g, ' ').trim()

    const embeds: EmbedBuilder[] = []
    for (const c of carouselUrls) {
      for (const imgUrl of c.carouselImages!) {
        embeds.push(new EmbedBuilder().setURL(c.cleaned).setImage(imgUrl))
      }
    }

    sentMsg = await postMessage(msg, carouselClean, embeds, files)
  } else {
    sentMsg = await postMessage(msg, clean, undefined, files)
  }

  if (!sentMsg) return
  await msg.delete().catch(() => null)

  if (carouselUrls.length > 0) {
    for (const c of carouselUrls) {
      const host = new URL(c.cleaned).hostname
      appendEntry(buildEntry(c.cleaned, [host, ...c.alternatives], 'success', [], host, 'carousel'))
    }
    return
  }
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
      recordFailure(alt)
      attempts.push({ domain: alt, embed: false })
    }

    recordFailure(firstDomain)
    appendEntry(
      buildEntry(cleaned.cleaned, [firstDomain, ...cleaned.alternatives], 'failure', attempts, null)
    )
  }
}
