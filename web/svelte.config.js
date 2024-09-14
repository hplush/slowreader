import postcss from 'postcss'
import loadPostcssConfig from 'postcss-load-config'

let { plugins } = await loadPostcssConfig({}, import.meta.filename)
let processor = postcss(plugins)

/**
 * @typedef {Object} SvelteConfig
 * @property {import('svelte/compiler').PreprocessorGroup} preprocess
 */

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
      let dependencies = messages.reduce((list, msg) => {
        if (msg.type === 'dependency') list.push(msg.file)
        return list
      }, [])
      return {
        code: css,
        dependencies,
        map
      }
    }
  }
}
