import { computed } from 'nanostores'

import { NotFoundError } from '../errors.ts'
import {
  experimentChoices,
  experiments as all,
  getExperimentRecords,
  isExperimentEnabled,
  isExperimentListed
} from '../experiments/index.ts'
import { aboutMessages } from '../messages/index.ts'
import { hasCloud } from '../settings.ts'
import { type CreatedLoadedPopup, definePopup } from './common.ts'

export const experiments = definePopup('experiments', () => {
  if (!all.some(i => isExperimentListed(i, experimentChoices.get()))) {
    return Promise.reject(new NotFoundError())
  }
  return Promise.resolve({
    destroy() {},
    experiments: computed(
      [experimentChoices, hasCloud, aboutMessages],
      (choices, cloud, t) => {
        return all
          .filter(i => isExperimentListed(i, choices))
          .map(experiment => {
            let records = (
              JSON.parse(getExperimentRecords(experiment.name)) as unknown[]
            ).length
            let hint: string | undefined
            if (records > 0) {
              hint = t.experimentRecordsCount(records)
            } else if (isExperimentEnabled(experiment, choices)) {
              // Local users expect the app to never contact our server
              hint =
                experiment.sending && cloud
                  ? t.experimentSending
                  : t.experimentEnabled
            }
            return { experiment, hint }
          })
      }
    )
  })
})

export type ExperimentsPopup = CreatedLoadedPopup<typeof experiments>
