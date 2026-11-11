export interface TelegramApp {
  apiHash: string
  apiId: number
}

function mask(text: string): string {
  let key = 'Zq7mV2xLp9Wd4sJk'
  return Array.from(text, (char, index) =>
    String.fromCharCode(char.charCodeAt(0) ^ key.charCodeAt(index % key.length))
  ).join('')
}

/**
 * It is not a protection: every web client gets the app ID. It only hides
 * the app ID from scanners, which look for a hex hash in server’s answers.
 */
export function encodeTelegramApp(app: TelegramApp): string {
  return btoa(mask(`${app.apiId}:${app.apiHash}`))
}

export function decodeTelegramApp(encoded: string): TelegramApp | undefined {
  let match
  try {
    match = /^(\d+):(\w+)$/.exec(mask(atob(encoded)))
  } catch {
    return undefined
  }
  return match ? { apiHash: match[2]!, apiId: Number(match[1]) } : undefined
}
