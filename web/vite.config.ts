import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig } from 'vite'

function replaceIcon(html: string, icon: string): string {
  return html
    .replace('<link rel="icon" href="/favicon.ico" sizes="32x32" />', '')
    .replace(
      /<link rel="icon" href="[^"]+" type="image\/svg\+xml" \/>/,
      `<link rel="icon" href="/${icon}.svg" type="image/svg+xml" />`
    )
}

export default defineConfig(() => ({
  plugins: [
    svelte(),
    {
      enforce: 'pre',
      name: 'html-transform',
      transformIndexHtml(html) {
        if (process.env.NODE_ENV === 'development') {
          return replaceIcon(html, 'icon-dev')
        } else if (process.env.STAGING) {
          return replaceIcon(html, 'icon-staging')
        } else {
          return html
        }
      }
    }
  ]
}))
