import { VERSION } from '@slowreader/api'

import { createPage } from './common.ts'

export const aboutPage = createPage('about', () => {
  return {
    appVersion: VERSION,
    exit() {},
    params: {}
  }
})

export type AboutPage = ReturnType<typeof aboutPage>
