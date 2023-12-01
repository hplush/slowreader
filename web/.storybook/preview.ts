import type { Preview } from '@storybook/svelte'
import { withThemeByClassName } from '@storybook/addon-themes'

import '../main/index.css'
import '../main/environment.js'
import '../main/browser.js'

export default {
  decorators: [
    withThemeByClassName({
      themes: {
        light: 'is-light',
        dark: 'is-dark'
      },
      defaultTheme: 'light'
    })
  ],
  parameters: {}
} satisfies Preview
