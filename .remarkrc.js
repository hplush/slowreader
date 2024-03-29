/*
File for setting up the markdown linter configuration.
Add the required plugin to the plugins array.
*/

const preset = {
  plugins: [
    'remark-lint-no-dead-urls',
    'remark-validate-links',
    'remark-lint-code-block-style'
  ]
}

export default preset
