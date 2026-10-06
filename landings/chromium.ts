import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { type Browser, chromium } from 'playwright'

export function launchChromium(): Promise<Browser> {
  // GitHub runners have Chrome, so CI does not need to download a browser
  if (process.env.CI) return chromium.launch({ channel: 'chrome' })
  if (!existsSync(chromium.executablePath())) {
    execFileSync(
      'pnpm',
      ['exec', 'playwright', 'install', '--no-shell', 'chromium'],
      { cwd: import.meta.dirname, stdio: 'inherit' }
    )
  }
  return chromium.launch({ channel: 'chromium' })
}
