const required = (key: string): string => {
  const val = process.env[key]
  if (!val) throw new Error(`Missing env var: ${key}`)
  return val
}

export const config = {
  token: required('DISCORD_TOKEN')
} as const
