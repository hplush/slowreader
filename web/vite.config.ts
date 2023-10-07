import resolve from '@rollup/plugin-node-resolve'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig } from 'vite'
import pluginRewriteAll from 'vite-plugin-rewrite-all'

// Until we have type conflict between Vite and @rollup/plugin-node-resolve
// because of the different dependencies versions
// @ts-expect-error
export default defineConfig(() => ({
  plugins: [
    svelte(),
    resolve({
      extensions: ['.js', '.ts']
    }),
    // TODO: Remove this plugin when this issue is fixed
    // https://github.com/vitejs/vite/issues/2415
    pluginRewriteAll()
  ]
}))
