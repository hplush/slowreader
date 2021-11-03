import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import resolve from '@rollup/plugin-node-resolve'

export default defineConfig(() => ({
  plugins: [
    svelte(),
    resolve({
      extensions: ['.js', '.ts']
    })
  ]
}))
