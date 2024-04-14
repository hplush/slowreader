import { nodeResolve } from '@rollup/plugin-node-resolve'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig } from 'vite'

export default defineConfig(() => ({
  build: {
    assetsInlineLimit: 0
  },
  plugins: [
    svelte(),
    nodeResolve({
      extensions: ['.js', '.ts']
    }),
    {
      enforce: 'pre',
      name: 'html-transform',
      transformIndexHtml(html) {
        if (process.env.NODE_ENV === 'development' || process.env.STAGING) {
          return html
            .replace(
              '<link rel="icon" href="/favicon.ico" sizes="32x32" />',
              ''
            )
            .replace(
              /<link rel="icon" href="[^"]+" type="image\/svg\+xml" \/>/,
              '<link rel="icon" href="/campfire.svg" type="image/svg+xml" />'
            )
        } else {
          return html
        }
      }
    }
  ]
}))
