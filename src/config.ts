export const config = {
  token:
    process.env.DISCORD_TOKEN ??
    (() => {
      throw new Error('Missing env var: DISCORD_TOKEN')
    })(),
  webhookImpersonation: process.env.WEBHOOK_IMPERSONATION === 'true'
} as const
