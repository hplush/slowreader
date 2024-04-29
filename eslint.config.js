import loguxSvelteConfig from '@logux/eslint-config/svelte'

/** @type {import('eslint').Linter.FlatConfig[]} */
export default [
  {
    ignores: ['web/dist/', 'web/storybook-static/', 'proxy/dist/']
  },
  ...loguxSvelteConfig,
  {
    files: ['web/stories/*.ts'],
    rules: {
      'no-console': 'off'
    }
  },
  {
    files: ['**/*.ts', '**/*.js', '**/*.svelte'],
    rules: {
      'perfectionist/sort-imports': [
        'error',
        {
          'groups': [
            'side-effect',
            ['side-effect-style', 'style'],
            ['builtin-type', 'type', 'builtin', 'external', 'unknown'],
            [
              'internal-type',
              'parent-type',
              'sibling-type',
              'index-type',
              'internal',
              'parent',
              'sibling',
              'index'
            ],
            ['object']
          ],
          'newlines-between': 'always',
          'order': 'asc',
          'type': 'alphabetical'
        }
      ]
    }
  }
]
