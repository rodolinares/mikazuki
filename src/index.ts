import { Client, Events, GatewayIntentBits, Message, PartialMessage } from 'discord.js'
import { config } from './config.js'
import { processMessage } from './lib/processMessage.js'

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
})

// ponytail: global serial gate so delete+repost bursts don't hit 429; per-channel gates if throughput matters
let queue: Promise<void> = Promise.resolve()
const inFlight = new Set<string>()

const handleMessage = (msg: Message): void => {
  if (msg.author.bot) return
  if (config.cleanChannelIds.length > 0 && !config.cleanChannelIds.includes(msg.channelId)) return
  if (inFlight.has(msg.id)) return
  inFlight.add(msg.id)
  queue = queue
    .then(() => processMessage(msg).catch(() => {}))
    .finally(() => inFlight.delete(msg.id))
}

const handleUpdate = async (msg: Message | PartialMessage): Promise<void> => {
  if (msg.author?.bot) return
  if (msg.partial) {
    try {
      msg = await msg.fetch()
    } catch {
      return
    }
  }
  handleMessage(msg)
}

client.once(Events.ClientReady, c =>
  console.log(`[${new Date().toLocaleString('sv-SE')}] Ready: ${c.user.tag}`)
)

client.on(Events.MessageCreate, (msg: Message): void => handleMessage(msg))
client.on(Events.MessageUpdate, (_old, msg): void => {
  handleUpdate(msg).catch(() => null)
})

client.login(config.token)
