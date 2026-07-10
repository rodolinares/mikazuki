import { ChannelType, Message, Webhook } from 'discord.js'
import { URL_REGEX } from './urlExtractor.js'
import { stripTrackingParams } from './trackingParams.js'
import { rewriteDomain } from './embedRewrites.js'

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
    const channel = msg.channel as import('discord.js').TextChannel
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

export const processMessage = async (msg: Message): Promise<void> => {
  let changed = false
  const original = msg.content

  const clean = original.replace(URL_REGEX, match => {
    try {
      const url = new URL(match)
      const before = url.toString()
      rewriteDomain(url)
      stripTrackingParams(url)
      if (url.toString() !== before) {
        changed = true
        return url.toString()
      }
    } catch {
      // invalid URL, leave as-is
    }
    return match
  })

  if (!changed) return

  console.log(`[CLEAN] #${msg.channelId} @${msg.author.username}: ${original} → ${clean}`)

  await msg.delete().catch(() => null)

  const webhook = await getOrCreateWebhook(msg)
  if (webhook) {
    await webhook
      .send({
        content: clean,
        username: msg.author.username,
        avatarURL: msg.author.displayAvatarURL()
      })
      .catch(() => null)
  } else if ('send' in msg.channel) {
    await msg.channel.send({ content: `<@${msg.author.id}>\n> ${clean}` }).catch(() => null)
  }
}
