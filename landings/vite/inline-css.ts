import type { Plugin } from 'vite'

export function inlineCss(): Plugin {
  return {
    enforce: 'post',

    generateBundle(options, bundle) {
      for (let file of Object.values(bundle)) {
        if (file.type !== 'asset' || !file.fileName.endsWith('.html')) continue
        let html = file.source.toString()
        file.source = html.replace(
          /<link rel="stylesheet"[^>]*href="\/([^"]+\.css)"[^>]*>/g,
          (link, name: string) => {
            let css = bundle[name]
            if (!css || css.type !== 'asset') return link
            delete bundle[name]
            return `<style>${css.source.toString()}</style>`
          }
        )
      }
    },
    name: 'inline-css'
  }
}
