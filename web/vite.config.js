import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import svelteSVG from 'vite-plugin-svelte-svg'
import resolve from '@rollup/plugin-node-resolve'

export default defineConfig(() => ({
  plugins: [
    svelte(),
    resolve({
      extensions: ['.js', '.ts']
    }),
    svelteSVG()
  ]
}))
