import { atom, onMount } from 'nanostores'

import { NotFoundError } from '../errors.ts'
import {
  experimentChoices,
  experiments,
  getExperimentRecords,
  isExperimentEnabled,
  toggleExperiment
} from '../experiments/index.ts'
import { viewOf } from '../lib/stores.ts'
import { type CreatedLoadedPopup, definePopup } from './common.ts'

export const experiment = definePopup('experiment', name => {
  let found = experiments.find(i => i.name === name)
  if (!found) return Promise.reject(new NotFoundError())
  let $records = atom(getExperimentRecords(name))
  onMount($records, () => {
    return experimentChoices.subscribe(() => {
      $records.set(getExperimentRecords(name))
    })
  })
  return Promise.resolve({
    destroy() {},
    enabled: viewOf(
      experimentChoices,
      choices => isExperimentEnabled(found, choices),
      value => {
        toggleExperiment(name, value)
      }
    ),
    experiment: found,
    records: $records,
    updateRecords() {
      $records.set(getExperimentRecords(name))
    }
  })
})

export type ExperimentPopup = CreatedLoadedPopup<typeof experiment>
