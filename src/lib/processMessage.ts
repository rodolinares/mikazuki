import { Message } from 'discord.js'
import { extractUrls } from './urlExtractor.js'
import { stripTrackingParams } from './trackingParams.js'
import { rewriteDomain } from './embedRewrites.js'

export const processMessage = async (msg: Message): Promise<void> => {
  const urls = extractUrls(msg.content)
  if (!urls.length) return

  let changed = false

  for (const url of urls) {
    const before = url.toString()
    rewriteDomain(url)
    stripTrackingParams(url)
    if (url.toString() !== before) changed = true
  }

  if (!changed) return

  const clean = urls.map(u => u.toString()).join('\n')

  const hasPerm = msg.member?.permissions.has('ManageMessages')
  if (hasPerm) {
    await msg.delete().catch(() => null)
    if ('send' in msg.channel) {
      await msg.channel.send({ content: clean }).catch(() => null)
    }
  } else {
    await msg.reply({ content: clean }).catch(() => null)
  }
}
