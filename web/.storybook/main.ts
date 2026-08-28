import type { StorybookConfig } from '@storybook/svelte-vite'
import type { InlineConfig } from 'vite'

export default {
  addons: [
    '@storybook/addon-svelte-csf',
    '@storybook/addon-themes',
    '@storybook/addon-a11y'
  ],
  core: {
    disableTelemetry: true
  },
  features: {
    sidebarOnboardingChecklist: false
  },
  framework: '@storybook/svelte-vite',
  stories: ['../stories/**/*.stories.svelte'],
  viteFinal(config: InlineConfig) {
    config.publicDir = 'public'
    return config
  }
} satisfies StorybookConfig
