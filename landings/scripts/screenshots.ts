// Script to make screenshots of the web client with the demo database
// for the landing pages.

import { existsSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { styleText } from 'node:util'
import { chromium, type Page } from 'playwright'
import sharp from 'sharp'
import { createServer } from 'vite'

const WEB = join(import.meta.dirname, '..', '..', 'web')
const SCREENSHOTS = join(import.meta.dirname, '..', 'screenshots')

const DEVICES = {
  laptop: { deviceScaleFactor: 2, viewport: { height: 860, width: 1290 } },
  phone: {
    deviceScaleFactor: 2,
    hasTouch: true,
    isMobile: true,
    viewport: { height: 915, width: 412 }
  }
}

interface Screenshot {
  /**
   * CSS selector to crop the screenshot to one part of the UI.
   */
  area?: string
  device: keyof typeof DEVICES
  path: string
  prepare?: (page: Page) => Promise<void>
}

async function openFeed(page: Page): Promise<void> {
  await page.locator('a[href^="/slow/"]').first().click()
}

async function openPost(page: Page): Promise<void> {
  await openFeed(page)
  await page.locator('a[data-anchor="post"]').first().click()
}

const LIST: Record<string, Screenshot> = {
  'slow-laptop': { device: 'laptop', path: '/slow', prepare: openPost },
  'slow-phone': { device: 'phone', path: '/slow', prepare: openFeed }
}

if (
  !existsSync(join(WEB, 'public', 'demo.json')) ||
  !existsSync(join(WEB, 'public', 'demo.sqlite'))
) {
  process.stderr.write(
    styleText('red', 'Run pnpm -F web build-demo to make the demo database\n')
  )
  process.exit(1)
}

await mkdir(SCREENSHOTS, { recursive: true })

let server = await createServer({
  configFile: join(WEB, 'vite.config.ts'),
  logLevel: 'error',
  root: WEB,
  server: { port: 2560 }
})
await server.listen()

let browser = await chromium.launch()
try {
  for (let [name, screenshot] of Object.entries(LIST)) {
    let context = await browser.newContext({
      ...DEVICES[screenshot.device],
      baseURL: server.resolvedUrls!.local[0],
      colorScheme: 'dark'
    })
    let page = await context.newPage()
    await page.goto('/copy-demo-db')
    await page.waitForURL('**/app')
    await page.goto(screenshot.path)
    await screenshot.prepare?.(page)
    await page.waitForLoadState('networkidle')
    await page.waitForFunction(
      () => !document.querySelector('progress, [role="progressbar"]')
    )
    await page.waitForFunction(() =>
      [...document.images].every(image => image.complete)
    )
    await page.evaluate(() => document.fonts.ready)
    // Demo has no cloud account, so the app shows the offline badge
    await page.evaluate(
      async client => {
        let { syncStatus } = (await import(client)) as {
          syncStatus: { set(status: string): void }
        }
        syncStatus.set('synchronized')
      },
      `/@fs${join(WEB, '..', 'core', 'client.ts')}`
    )
    let { size } = await sharp(
      screenshot.area
        ? await page.locator(screenshot.area).screenshot()
        : await page.screenshot()
    )
      .png({ compressionLevel: 9, effort: 10 })
      .toFile(join(SCREENSHOTS, `${name}.png`))
    await context.close()
    process.stderr.write(
      `${name}.png ${styleText('green', `${Math.round(size / 1024)} KB`)}\n`
    )
  }
} finally {
  await browser.close()
  await server.close()
}
