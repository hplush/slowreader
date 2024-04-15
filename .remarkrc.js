// Configuration file used to find popular mistakes in .md files.

export default {
  plugins: [
    'remark-lint-no-dead-urls',
    'remark-validate-links',
    'remark-lint-heading-capitalization',
    'remark-lint-code-block-split-list',
    'remark-lint-fenced-code-flag',
    'remark-lint-first-heading-level',
    'remark-lint-heading-increment',
    'remark-lint-no-shell-dollars',
    ['remark-lint-match-punctuation', ['“”', '()']],
    'remark-lint-check-toc'
  ]
}
