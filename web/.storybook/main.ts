import type { StorybookConfig } from '@storybook/svelte-vite'

export default {
  stories: ['../stories/**/*.stories.svelte'],
  addons: ['@storybook/addon-svelte-csf', '@storybook/addon-themes'],
  framework: '@storybook/svelte-vite',
  staticDirs: ['../public']
} satisfies StorybookConfig
