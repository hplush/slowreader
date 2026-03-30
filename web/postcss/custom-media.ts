// PostCSS plugin for @custom-media. We are using own implementation
// to load definitions from specific file.

import { readFileSync } from 'node:fs'
import { type AtRule, parse, type Plugin, type PluginCreator } from 'postcss'

type CustomMediaMap = [string, string][]

function parseCustomMedia(file: string): CustomMediaMap {
  let root = parse(readFileSync(file, 'utf-8'), { from: file })
  let customMediaMap: CustomMediaMap = []
  root.walkAtRules('custom-media', atrule => {
    let match = atrule.params.match(/^(--[\w-]+)\s+(.+)$/)
    if (match) {
      customMediaMap.push([match[1]!, match[2]!])
    }
  })
  return customMediaMap
}

export function definePlugin<O>(fn: (opts: O) => Plugin): PluginCreator<O> {
  return Object.assign(fn as (opts?: O) => Plugin, { postcss: true as const })
}

export default definePlugin<{ file: string }>(opts => {
  let customMedias = parseCustomMedia(opts.file)

  return {
    AtRule: {
      media(atrule: AtRule) {
        if (atrule.params.includes('--')) {
          for (let i of customMedias) {
            let [name, value] = i
            atrule.params = atrule.params.replaceAll(name, value)
          }
          let missed = atrule.params.match(/--[\w-]+/)
          if (missed) {
            throw atrule.error(`Unknown custom media ${missed[0]}`, {
              word: missed[0]
            })
          }
        }
      }
    },
    postcssPlugin: 'custom-media-resolver'
  }
})
