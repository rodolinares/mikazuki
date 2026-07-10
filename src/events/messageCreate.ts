import { Events, Message } from 'discord.js'
import { processMessage } from '../lib/processMessage.js'

export const name = Events.MessageCreate

export const execute = (msg: Message): void => {
  if (msg.author.bot) return
  processMessage(msg)
}
