import type { Preview } from '@storybook/svelte'
import { withThemeByClassName } from '@storybook/addon-themes'

import '../main/index.css'
import '../main/environment.js'

export default {
  decorators: [
    withThemeByClassName({
      themes: {
        light: 'is-light',
        lightSlow: 'is-light is-slow',
        dark: 'is-dark',
        darkSlow: 'is-dark is-slow'
      },
      defaultTheme: 'light'
    })
  ],
  parameters: {}
} satisfies Preview
