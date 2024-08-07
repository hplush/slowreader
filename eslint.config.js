import loguxSvelteConfig from '@logux/eslint-config/svelte'

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    ignores: [
      'web/dist/',
      'web/storybook-static/',
      'proxy/dist/',
      'web/vite.config.ts.*'
    ]
  },
  ...loguxSvelteConfig,
  {
    files: ['web/stories/*.ts'],
    rules: {
      'no-console': 'off'
    }
  },
  {
    files: ['web/pages/**/*', 'web/ui/**/*', 'web/main/**/*', 'core/test/**/*'],
    rules: {
      'n/no-unsupported-features/node-builtins': 'off'
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
