import { Message } from 'discord.js'
import { URL_REGEX } from './urlExtractor.js'
import { stripTrackingParams } from './trackingParams.js'
import { rewriteDomain } from './embedRewrites.js'

export const processMessage = async (msg: Message): Promise<void> => {
  let changed = false

  const clean = msg.content.replace(URL_REGEX, match => {
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

  await msg.delete().catch(() => null)
  if ('send' in msg.channel) {
    await msg.channel.send({ content: clean }).catch(() => null)
  }
}
