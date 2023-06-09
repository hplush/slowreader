import resolve from '@rollup/plugin-node-resolve'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig } from 'vite'

export default defineConfig(() => ({
  plugins: [
    svelte(),
    resolve({
      extensions: ['.js', '.ts']
    })
  ]
}))
