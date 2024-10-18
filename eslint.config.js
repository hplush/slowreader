import loguxSvelteConfig from '@logux/eslint-config/svelte'

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    ignores: [
      '*/dist/',
      'web/storybook-static/',
      'web/vite.config.ts.*',
      'server/web/'
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
          groups: [
            'side-effect',
            'side-effect-style',
            'style',
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
          newlinesBetween: 'always',
          order: 'asc',
          type: 'alphabetical'
        }
      ]
    }
  },
  {
    files: ['web/**/*.svelte'],
    rules: {
      '@typescript-eslint/no-confusing-void-expression': 'off'
    }
  },
  {
    files: ['**/scripts/**.ts'],
    rules: {
      'n/no-unsupported-features/node-builtins': [
        'error',
        {
          ignores: ['fs.globSync']
        }
      ]
    }
  },
  {
    files: ['core/router.ts'],
    rules: {
      '@typescript-eslint/no-empty-object-type': 'off'
    }
  }
]
