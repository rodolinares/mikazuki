import { TextChannel } from 'discord.js'
import { config } from '../config.js'

const PLACEHOLDER_EMBED_IMAGES = ['facecot.com/og.png']

export interface EmbedMedia {
  image?: { url?: string } | null
  thumbnail?: { url?: string } | null
  video?: { url?: string } | null
}

export const hasRealEmbed = (embeds: EmbedMedia[]): boolean =>
  embeds.some(
    e =>
      (e.image || e.thumbnail || e.video) &&
      !PLACEHOLDER_EMBED_IMAGES.some(p => (e.image?.url ?? e.thumbnail?.url)?.includes(p))
  )

export async function waitForEmbed(channel: TextChannel, messageId: string): Promise<boolean> {
  const timeout = config.embedWaitTimeout
  const checkInterval = 500
  const startTime = Date.now()

  while (Date.now() - startTime < timeout) {
    try {
      const message = await channel.messages.fetch({ message: messageId, force: true })
      if (hasRealEmbed(message.embeds)) return true
    } catch {
      return false
    }
    await new Promise(resolve => setTimeout(resolve, checkInterval))
  }

  const message = await channel.messages
    .fetch({ message: messageId, force: true })
    .catch(() => null)
  console.debug(
    `[embedDetector] no embed after ${timeout}ms (message ${messageId}):`,
    message?.embeds.map(e => ({
      type: e.type,
      image: !!e.image,
      thumbnail: !!e.thumbnail,
      video: !!e.video
    }))
  )

  return false
}
