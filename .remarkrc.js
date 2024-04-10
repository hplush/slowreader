// Configuration file used to find popular mistakes in .md files.
import remarkLintCodeBlockSplitList from './remark/remark-lint-code-block-split-list/index.js'

export default {
  plugins: [
    'remark-lint-no-dead-urls',
    'remark-validate-links',
    'remark-lint-heading-capitalization',
    remarkLintCodeBlockSplitList
  ]
}
