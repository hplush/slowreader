import loguxOxlintConfig from '@logux/oxc-configs/lint'
import { defineConfig } from 'oxlint'

export default defineConfig({
  extends: [loguxOxlintConfig],
  rules: {
    'unicorn/consistent-function-scoping': 'off'
  },
  overrides: [
    {
      files: ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts'],
      rules: {
        'typescript/no-unsafe-type-assertion': 'off',
        'typescript/consistent-return': 'off'
      }
    },
    {
      files: ['web/stories/*.ts', 'core/devtools.ts'],
      rules: {
        'no-console': 'off'
      }
    },
    {
      files: ['**/*.test.ts'],
      rules: {
        'typescript/no-misused-spread': 'off',
        'typescript/only-throw-error': 'off'
      }
    },
    {
      files: ['core/router.ts'],
      rules: {
        'typescript/no-empty-object-type': 'off'
      }
    }
  ]
})
