import type { Plugin } from 'vite'

export function inlineCss(): Plugin {
  return {
    enforce: 'post',

    generateBundle(options, bundle) {
      let landing = bundle['root/root.html']
      if (!landing || landing.type !== 'asset') return
      landing.source = landing.source
        .toString()
        .replace(
          /<link rel="stylesheet"[^>]*href="\/([^"]+\.css)"[^>]*>/g,
          (link, name: string) => {
            let css = bundle[name]
            if (!css || css.type !== 'asset') return link
            delete bundle[name]
            return `<style>${css.source.toString()}</style>`
          }
        )
    },
    name: 'inline-css'
  }
}
