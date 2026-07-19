export const config = {
  token:
    process.env.DISCORD_TOKEN ??
    (() => {
      throw new Error('Missing env var: DISCORD_TOKEN')
    })(),
  webhookImpersonation: process.env.WEBHOOK_IMPERSONATION === 'true',
  urlValidationTimeout: parseInt(process.env.URL_VALIDATION_TIMEOUT || '3000', 10),
  embedWaitTimeout: parseInt(process.env.EMBED_WAIT_TIMEOUT || '7000', 10),
  enableUrlValidation: process.env.ENABLE_URL_VALIDATION !== 'false',
  enableEmbedDetection: process.env.ENABLE_EMBED_DETECTION !== 'false'
}
