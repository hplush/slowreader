import '../stories/environment.ts'
import '../main/browser.ts'

import '../main/index.css'
import '../main/loader.css'

import { withThemeByClassName } from '@storybook/addon-themes'
import type { Preview } from '@storybook/svelte'
import { INITIAL_VIEWPORTS, MINIMAL_VIEWPORTS } from 'storybook/viewport'

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
  parameters: {
    viewport: {
      defaultViewport: 'responsive',
      options: {
        ...INITIAL_VIEWPORTS,
        ...MINIMAL_VIEWPORTS,
        big: {
          name: 'Big screen',
          styles: {
            height: '1000px',
            width: '1873px'
          },
          type: 'desktop'
        }
      }
    }
  }
} satisfies Preview
