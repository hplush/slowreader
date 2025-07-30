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
    delay: 100,
    viewport: {
      defaultViewport: 'responsive',
      viewports: {
        ...INITIAL_VIEWPORTS,
        ...MINIMAL_VIEWPORTS,
        ipad: {
          name: 'iPad',
          styles: {
            height: '768px',
            width: '1024px'
          },
          type: 'tablet'
        }
      }
    }
  }
} satisfies Preview
