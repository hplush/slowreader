import type { StorybookConfig } from '@storybook/svelte-vite'

export default {
  addons: ['@storybook/addon-svelte-csf', '@storybook/addon-themes'],
  framework: '@storybook/svelte-vite',
  stories: ['../stories/**/*.stories.svelte']
} satisfies StorybookConfig
