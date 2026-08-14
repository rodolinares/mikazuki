export const config = {
  token:
    process.env.DISCORD_TOKEN ??
    (() => {
      throw new Error('Missing env var: DISCORD_TOKEN')
    })(),
  embedWaitTimeout: parseInt(process.env.EMBED_WAIT_TIMEOUT || '20000', 10),
  enableEmbedDetection: process.env.ENABLE_EMBED_DETECTION !== 'false',
  domainHealthFile: process.env.DOMAIN_HEALTH_FILE ?? '.data/domain-health.json',
  linkLogFile: process.env.LINK_LOG_FILE ?? '.data/link-log.jsonl',
  cleanChannelIds: (process.env.CLEAN_CHANNEL_IDS ?? '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
}
