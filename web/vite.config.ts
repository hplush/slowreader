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
      name: 'html-transform',
      enforce: 'pre' as const,
      transformIndexHtml: (html: string) => {
        return html.replace(
          '/main/icon.svg',
          process.env.NODE_ENV === 'development'
            ? '/main/campfire.svg'
            : '/main/icon.svg'
        )
      }
    }
  ]
}))
