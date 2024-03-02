import '../main/browser.js'
import '../stories/environment.js'

import '../main/index.css'

import { withThemeByClassName } from '@storybook/addon-themes'
import type { Preview } from '@storybook/svelte'

export default {
  decorators: [
    withThemeByClassName({
      defaultTheme: 'light',
      themes: {
        dark: 'is-dark-theme',
        light: 'is-light-theme'
      }
    })
  ],
  parameters: {}
} satisfies Preview
