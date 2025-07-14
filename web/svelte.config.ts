import postcss, { type Message } from 'postcss'
import loadPostcssConfig from 'postcss-load-config'
import type { PreprocessorGroup } from 'svelte/compiler'

let { plugins } = await loadPostcssConfig({}, import.meta.filename)
let processor = postcss(plugins)

interface SvelteConfig {
  preprocess: PreprocessorGroup
}

interface Dependency {
  file: string
  type: 'dependency'
}

function isDependency(msg: Message): msg is Dependency {
  return (
    msg.type === 'dependency' && 'file' in msg && typeof msg.file === 'string'
  )
}

/**
 * @type {SvelteConfig}
 */
export default {
  preprocess: {
    async style({ content, filename }) {
      let { css, map, messages } = await processor.process(content, {
        from: filename,
        map: { annotation: false, inline: false }
      })
      let dependencies = messages.reduce<string[]>((list, msg) => {
        if (isDependency(msg)) list.push(msg.file)
        return list
      }, [])
      return {
        code: css,
        dependencies,
        map
      }
    }
  }
} satisfies SvelteConfig
