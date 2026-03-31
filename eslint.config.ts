import loguxSvelteConfig from '@logux/eslint-config/svelte'
import type { Linter } from 'eslint'

let config: Linter.Config[] = [
  {
    ignores: [
      '*/dist/',
      'web/storybook-static/',
      'web/vite.config.ts.*',
      'server/web/',
      'web/.svelte-check',
      '**/*.js',
      '**/*.ts'
    ]
  },
  ...loguxSvelteConfig.map(item => {
    let parserOptions = item.languageOptions?.parserOptions as
      | { project?: unknown; projectService?: boolean }
      | undefined
    if (parserOptions?.project) {
      delete parserOptions.project
      parserOptions.projectService = true
    }
    return item
  }),
  {
    rules: {
      '@typescript-eslint/no-base-to-string': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/no-unsafe-type-assertion': 'off'
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
        {
          allowedClassNames: [
            'loader',
            'sr-only',
            'is-dark-theme',
            'is-light-theme',
            'is-comfort-mode',
            'is-non-comfort-mode'
          ]
        }
      ],
      'svelte/sort-attributes': 'warn'
    }
  }
] satisfies Linter.Config[]

export default config
