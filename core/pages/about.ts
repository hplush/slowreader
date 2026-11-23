import { VERSION } from '@slowreader/api'
import { computed } from 'nanostores'

import {
  experimentChoices,
  experiments,
  isExperimentListed
} from '../experiments/index.ts'
import { createPage } from './common.ts'

export const aboutPage = createPage('about', () => {
  return {
    appVersion: VERSION,
    exit() {},
    hasExperiments: computed(experimentChoices, choices => {
      return experiments.some(i => isExperimentListed(i, choices))
    }),
    params: {}
  }
})

export type AboutPage = ReturnType<typeof aboutPage>
