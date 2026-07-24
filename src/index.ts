import { Client, Events, GatewayIntentBits, Message } from 'discord.js'
import { config } from './config.js'
import { processMessage } from './lib/processMessage.js'

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
})

client.once(Events.ClientReady, c =>
  console.log(`[${new Date().toLocaleString('sv-SE')}] Ready: ${c.user.tag}`)
)

client.on(Events.MessageCreate, (msg: Message): void => {
  if (msg.author.bot) return
  processMessage(msg)
})

client.login(config.token)
