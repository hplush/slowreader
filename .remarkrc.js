// Configuration file used to set up a tool to find mistakes in .md files.
// Add the name of the plugin you want to use to the list of plugins.

export default {
  plugins: [
    'remark-lint-no-dead-urls',
    'remark-validate-links',
    'remark-lint-code-block-style'
  ]
}
