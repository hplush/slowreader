import type { StorybookConfig } from '@storybook/svelte-vite'
import type { InlineConfig } from 'vite'

export default {
  addons: ['@storybook/addon-svelte-csf', '@storybook/addon-themes'],
  core: {
    disableTelemetry: true
  },
  framework: '@storybook/svelte-vite',
  stories: ['../stories/**/*.stories.svelte'],
  viteFinal(config: InlineConfig) {
    config.publicDir = false
    return Promise.resolve(config)
  }
} satisfies StorybookConfig
