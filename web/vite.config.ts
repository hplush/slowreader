import { svelte } from '@sveltejs/vite-plugin-svelte'
import { PluginPure } from 'rollup-plugin-pure'
import { defineConfig, type Plugin } from 'vite'

function replaceIcon(html: string, icon: string): string {
  return html
    .replace('<link rel="icon" href="/favicon.ico" sizes="32x32" />', '')
    .replace(
      /<link rel="icon" href="[^"]+" type="image\/svg\+xml" \/>/,
      `<link rel="icon" href="/${icon}.svg" type="image/svg+xml" />`
    )
}

function fixOrder(plugin: Plugin): Plugin {
  plugin.enforce = 'pre'
  // @ts-expect-error Hacking into the plugin ignoring types
  plugin.transform.order = 'pre'
  return plugin
}

export default defineConfig(() => ({
  plugins: [
    fixOrder(
      PluginPure({
        functions: [
          'i18n',
          'atom',
          'map',
          'syncMapTemplate',
          'persistentAtom',
          'computed'
        ],
        include: [/.ts$/]
      })
    ),
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
