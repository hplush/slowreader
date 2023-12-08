import type { Preview } from '@storybook/svelte'
import { withThemeByClassName } from '@storybook/addon-themes'

import '../main/index.css'
import '../stories/environment.js'
import '../main/browser.js'

export default {
  decorators: [
    withThemeByClassName({
      themes: {
        light: 'is-light-theme',
        dark: 'is-dark-theme'
      },
      defaultTheme: 'light'
    })
  ],
  parameters: {}
} satisfies Preview
