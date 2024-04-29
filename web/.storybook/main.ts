import type { StorybookConfig } from '@storybook/svelte-vite'

export default {
  addons: [
    '@storybook/addon-svelte-csf',
    '@storybook/addon-themes',
    '@storybook/addon-viewport'
  ],
  framework: '@storybook/svelte-vite',
  stories: ['../stories/**/*.stories.svelte'],
  async viteFinal(config) {
    config.publicDir = false
    return config
  }
} satisfies StorybookConfig
