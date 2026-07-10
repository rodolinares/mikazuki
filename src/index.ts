import { Client, Events, GatewayIntentBits } from 'discord.js'
import { config } from './config.js'
import { execute, name } from './events/messageCreate.js'

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
})

client.once(Events.ClientReady, c => console.log(`Ready: ${c.user.tag}`))
client.on(name, execute)

client.login(config.token)
