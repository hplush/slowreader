import loguxSvelteConfig from '@logux/eslint-config/svelte'
import type { Linter } from 'eslint'

export default [
  {
    ignores: [
      '*/dist/',
      'web/storybook-static/',
      'web/vite.config.ts.*',
      'server/web/',
      'web-archive/'
    ]
  },
  ...loguxSvelteConfig,
  {
    rules: {
      '@typescript-eslint/no-base-to-string': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-type-assertion': 'off'
    }
  },
  {
    files: ['**/*.test.ts'],
    rules: {
      '@typescript-eslint/no-misused-spread': 'off',
      '@typescript-eslint/only-throw-error': 'off'
    }
  },
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
        'warn',
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
      '@typescript-eslint/no-confusing-void-expression': 'off',
      '@typescript-eslint/no-unnecessary-type-assertion': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      'svelte/no-unused-class-name': [
        'error',
        { allowedClassNames: ['loader', 'sr-only'] }
      ],
      'svelte/sort-attributes': 'warn'
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
] satisfies Linter.Config[]
