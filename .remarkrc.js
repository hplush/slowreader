// Configuration file used to find popular mistakes in .md files.

import remarkLintTitleCapitalization from './remark-custom-rules/title-capitalization/remarkLintTitleCapitalization.js'

export default {
  plugins: [
    'remark-lint-no-dead-urls',
    'remark-validate-links',
    [
      remarkLintTitleCapitalization,
      { exceptionWords: { '2FA': true, 'GitHub': true } }
    ]
  ]
}
