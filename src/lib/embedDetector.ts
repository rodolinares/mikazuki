import { TextChannel } from 'discord.js'
import { config } from '../config.js'

export async function hasEmbed(channel: TextChannel, messageId: string): Promise<boolean> {
  try {
    const message = await channel.messages.fetch(messageId)
    return message.embeds.length > 0
  } catch {
    return false
  }
}

export async function waitForEmbed(channel: TextChannel, messageId: string): Promise<boolean> {
  const timeout = config.embedWaitTimeout
  const checkInterval = 500
  const startTime = Date.now()

  while (Date.now() - startTime < timeout) {
    if (await hasEmbed(channel, messageId)) {
      return true
    }
    await new Promise(resolve => setTimeout(resolve, checkInterval))
  }

  return false
}
