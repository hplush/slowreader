import { join } from 'node:path'
import { chromium } from 'playwright'
import sharp from 'sharp'
import type { Plugin } from 'vite'

export function og(): Plugin {
  return {
    name: 'og',

    async writeBundle(options) {
      let dist = options.dir!
      // GitHub runners have Chrome, so CI does not need to download a browser
      let browser = await chromium.launch(
        process.env.CI ? { channel: 'chrome' } : {}
      )
      try {
        let page = await browser.newPage({
          viewport: { height: 630, width: 1200 }
        })
        await page.route('**/*', async route => {
          let path = new URL(route.request().url()).pathname
          await route.fulfill({
            path: join(dist, path.endsWith('/') ? `${path}index.html` : path)
          })
        })
        await page.goto('http://localhost/og/')
        await page.waitForFunction(() =>
          [...document.images].every(image => image.complete)
        )
        await page.evaluate(() => document.fonts.ready)
        await sharp(await page.screenshot())
          .jpeg({ mozjpeg: true, quality: 85 })
          .toFile(join(dist, 'og.jpg'))
      } finally {
        await browser.close()
      }
    }
  }
}
