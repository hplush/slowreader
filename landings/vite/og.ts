import { copyFile } from 'node:fs/promises'
import { join } from 'node:path'
import sharp from 'sharp'
import type { Plugin } from 'vite'

import { launchChromium } from '../chromium.ts'

export function og(): Plugin {
  return {
    name: 'og',

    async writeBundle(options) {
      let dist = options.dir!
      // Docker image build has no browser and takes the image from demo stage
      if (process.env.OG_IMAGE) {
        await copyFile(process.env.OG_IMAGE, join(dist, 'og.jpg'))
        return
      }
      let browser = await launchChromium()
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
