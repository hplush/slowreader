// Configuration file used to find popular mistakes in .md files.

export default {
  plugins: [
    'remark-lint-no-dead-urls',
    'remark-validate-links',
    'remark-lint-heading-capitalization',
    'remark-lint-code-block-split-list'
  ]
}
