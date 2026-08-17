import fs from 'fs'
import { Client, Events, GatewayIntentBits, Message, PartialMessage } from 'discord.js'
import { config } from './config.js'
import { processMessage } from './lib/processMessage.js'
import { logInfo, logError } from './lib/logger.js'

const HEARTBEAT_FILE = process.env.HEARTBEAT_FILE ?? '/tmp/mikazuki-alive'

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
    .then(() => processMessage(msg))
    .catch(err => logError('processMessage', err, { msgId: msg.id }))
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

client.once(Events.ClientReady, c => {
  logInfo('ready', { tag: c.user.tag })
})

client.on(Events.MessageCreate, (msg: Message): void => handleMessage(msg))
client.on(Events.MessageUpdate, (_old, msg): void => {
  handleUpdate(msg).catch(err => logError('messageUpdate', err))
})

// ponytail: single setFileSync beat; systemd/journald + docker healthcheck consume this
setInterval(() => {
  try {
    fs.writeFileSync(HEARTBEAT_FILE, String(Date.now()))
  } catch {
    // non-critical; healthcheck degrades gracefully
  }
}, 60_000)

process.on('unhandledRejection', err => {
  logError('unhandledRejection', err)
  process.exit(1)
})

process.on('uncaughtException', err => {
  logError('uncaughtException', err)
  process.exit(1)
})

client.login(config.token)
