import { ChannelType, Message, TextChannel, Webhook } from 'discord.js'
import { config } from '../config.js'
import { getRewriteChain } from './embedRewrites.js'
import { checkHttpStatus } from './urlValidator.js'
import { waitForEmbed, hasEmbed } from './embedDetector.js'
import { recordFailure, recordSuccess } from './domainHealth.js'

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
  'si',
  'utm_campaign',
  'utm_content',
  'utm_medium',
  'utm_source',
  'utm_term'
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
}

const cleanUrl = async (match: string): Promise<CleanedUrl> => {
  try {
    const url = new URL(match)
    const host = url.hostname.toLowerCase()
    const chain = getRewriteChain(host)

    if (chain.length === 0) {
      return { original: match, cleaned: match, alternatives: [] }
    }

    for (const domain of chain) {
      const testUrl = new URL(url.toString())
      testUrl.hostname = domain
      stripTrackingParams(testUrl)

      if (config.enableUrlValidation) {
        const result = await checkHttpStatus(testUrl.toString())
        if (result.ok) {
          recordSuccess(domain)
          return {
            original: match,
            cleaned: testUrl.toString(),
            alternatives: chain.filter(d => d !== domain)
          }
        } else {
          recordFailure(domain)
        }
      } else {
        return {
          original: match,
          cleaned: testUrl.toString(),
          alternatives: chain.filter(d => d !== domain)
        }
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

const postMessage = async (msg: Message, content: string): Promise<Message | null> => {
  const webhook = config.webhookImpersonation ? await getOrCreateWebhook(msg) : null

  if (webhook) {
    try {
      const sent = await webhook.send({
        content,
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
      return await msg.channel.send({
        content: `🧹 Link cleaned - originally shared by <@${msg.author.id}>\n> ${content}`
      })
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

  console.log(`[CLEAN] #${msg.channelId} @${msg.author.username}: ${original}`)
  await msg.delete().catch(() => null)

  let clean = original
  for (const cleaned of cleanedUrls) {
    clean = clean.replace(cleaned.original, cleaned.cleaned)
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

  let bestMsg = sentMsg

  for (const cleaned of cleanedUrls) {
    if (cleaned.alternatives.length === 0) continue

    for (const alt of cleaned.alternatives) {
      const altUrl = new URL(cleaned.cleaned)
      altUrl.hostname = alt
      stripTrackingParams(altUrl)

      if (config.enableUrlValidation) {
        const result = await checkHttpStatus(altUrl.toString())
        if (!result.ok) {
          recordFailure(alt)
          continue
        }
        recordSuccess(alt)
      }

      const altClean = clean.replace(cleaned.cleaned, altUrl.toString())
      const altSent = await postMessage(msg, altClean)

      if (altSent) {
        await bestMsg.delete().catch(() => null)
        bestMsg = altSent

        const altHasEmbed = await waitForEmbed(channel, altSent.id)
        if (altHasEmbed) return
      }

      if (await hasEmbed(channel, sentMsg.id)) return
    }
  }
}
