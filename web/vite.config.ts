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
    })
  ]
}))
