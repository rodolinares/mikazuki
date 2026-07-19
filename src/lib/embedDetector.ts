import { TextChannel } from 'discord.js'
import { config } from '../config.js'

export async function waitForEmbed(channel: TextChannel, messageId: string): Promise<boolean> {
  const timeout = config.embedWaitTimeout
  const checkInterval = 500
  const startTime = Date.now()

  while (Date.now() - startTime < timeout) {
    try {
      const message = await channel.messages.fetch(messageId)
      if (message.embeds.some(e => e.image || e.video)) return true
    } catch {
      return false
    }
    await new Promise(resolve => setTimeout(resolve, checkInterval))
  }

  return false
}
