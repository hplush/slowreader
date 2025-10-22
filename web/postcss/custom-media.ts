// PostCSS plugin for @custom-media. We are using own implementation
// to load definitions from specific file.

import { readFileSync } from 'node:fs'
import { type AtRule, parse, type PluginCreator } from 'postcss'

type CustomMediaMap = [string, string][]

function parseCustomMedia(file: string): CustomMediaMap {
  let root = parse(readFileSync(file, 'utf-8'), { from: file })
  let customMediaMap: CustomMediaMap = []
  root.walkAtRules('custom-media', atrule => {
    // Parse: @custom-media --name (query)
    let match = atrule.params.match(/^(--[\w-]+)\s+(.+)$/)
    if (match) {
      customMediaMap.push([match[1]!, match[2]!])
    }
  })
  return customMediaMap
}

const plugin: PluginCreator<{ file: string }> = opts => {
  if (!opts) throw new Error('Define file with custom media definitions')
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
}
plugin.postcss = true

export default plugin
