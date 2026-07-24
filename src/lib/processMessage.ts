import { ChannelType, EmbedBuilder, Message, TextChannel, Webhook } from 'discord.js'
import { config } from '../config.js'
import { extractPostId, detectCarouselImages } from './carouselDetector.js'
import { EMBED_REWRITE_CHAINS } from './embedRewrites.js'
import { checkHttpStatus } from './urlValidator.js'
import { waitForEmbed } from './embedDetector.js'

const URL_REGEX = /https?:\/\/[^\s<>"]+/g

const TRACKING_PARAMS = [
  'fbclid',
  'gclid',
  'igsh',
  'igshid',
  'is_from_webapp',
  'ref',
  's',
  'sender_device',
  'si'
]

const TRACKING_PREFIXES = ['utm_']

const isTrackingParam = (key: string): boolean => {
  const lower = key.toLowerCase()
  if (TRACKING_PARAMS.includes(lower)) return true
  return TRACKING_PREFIXES.some(p => lower.startsWith(p))
}

export const stripTrackingParams = (url: URL): void => {
  for (const key of [...url.searchParams.keys()]) {
    if (isTrackingParam(key)) url.searchParams.delete(key)
  }
}

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
    const host = url.hostname.toLowerCase()
    const chain = EMBED_REWRITE_CHAINS[host.toLowerCase()] ?? []

    if (chain.length === 0) {
      return { original: match, cleaned: match, alternatives: [] }
    }

    for (const [i, domain] of chain.entries()) {
      const testUrl = new URL(url.toString())
      testUrl.hostname = domain
      stripTrackingParams(testUrl)

      if (config.enableUrlValidation && i > 0) {
        const result = await checkHttpStatus(testUrl.toString())
        if (!result.ok) continue
      }

      const postId = extractPostId(url.pathname)
      const carouselImages = postId ? await detectCarouselImages(postId, domain) : []
      return {
        original: match,
        cleaned: testUrl.toString(),
        alternatives: chain.filter(d => d !== domain),
        carouselImages
      }
    }

    const fallbackUrl = new URL(url.toString())
    stripTrackingParams(fallbackUrl)
    return {
      original: match,
      cleaned: fallbackUrl.toString(),
      alternatives: []
    }
  } catch {
    return { original: match, cleaned: match, alternatives: [] }
  }
}

const postMessage = async (
  msg: Message,
  content: string,
  embeds?: EmbedBuilder[]
): Promise<Message | null> => {
  const webhook = config.webhookImpersonation ? await getOrCreateWebhook(msg) : null

  if (webhook) {
    try {
      const sent = await webhook.send({
        content,
        embeds,
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
      return await msg.channel.send({ content: text, embeds })
    } catch {
      return null
    }
  }

  return null
}

export const processMessage = async (msg: Message): Promise<void> => {
  const original = msg.content
  const urlMatches = [...original.matchAll(URL_REGEX)]

  if (urlMatches.length === 0) return

  const cleanedUrls: CleanedUrl[] = []
  let anyChanged = false

  for (const match of urlMatches) {
    const cleaned = await cleanUrl(match[0])
    cleanedUrls.push(cleaned)
    if (cleaned.original !== cleaned.cleaned) {
      anyChanged = true
    }
  }

  if (!anyChanged) return

  console.log(
    `[${new Date().toLocaleString('sv-SE')}] [CLEAN] #${msg.channelId} @${msg.author.username}: ${original}`
  )

  await msg.delete().catch(() => null)

  let clean = original
  for (const cleaned of cleanedUrls) {
    clean = clean.replace(cleaned.original, cleaned.cleaned)
  }

  const carouselUrls = cleanedUrls.filter(c => c.carouselImages && c.carouselImages.length > 1)

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

    await postMessage(msg, carouselClean, embeds)

    return
  }

  const sentMsg = await postMessage(msg, clean)

  if (!sentMsg || !config.enableEmbedDetection) return

  if (
    msg.channel.type !== ChannelType.GuildText &&
    msg.channel.type !== ChannelType.GuildAnnouncement
  ) {
    return
  }

  const channel = msg.channel as TextChannel

  const firstHasEmbed = await waitForEmbed(channel, sentMsg.id)

  if (firstHasEmbed) return

  for (const cleaned of cleanedUrls) {
    if (cleaned.alternatives.length === 0) continue

    let currentUrl = cleaned.cleaned
    for (const alt of cleaned.alternatives) {
      const altUrl = new URL(cleaned.cleaned)
      altUrl.hostname = alt
      stripTrackingParams(altUrl)

      if (config.enableUrlValidation) {
        const result = await checkHttpStatus(altUrl.toString())
        if (!result.ok) continue
      }

      const newUrl = altUrl.toString()
      const newContent = sentMsg.content.replace(currentUrl, newUrl)
      const edited = await sentMsg.edit(newContent).catch(() => null)
      if (edited) currentUrl = newUrl

      const altHasEmbed = await waitForEmbed(channel, sentMsg.id)
      if (altHasEmbed) return
    }
  }
}
