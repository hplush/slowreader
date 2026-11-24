import { persistentJSON } from '@nanostores/persistent'

import { getEnvironment, onEnvironment } from '../environment.ts'
import type { Experiment, ExperimentRecords } from './common.ts'
import { errors } from './errors.ts'
import { telegram } from './telegram.ts'

export type { Experiment, ExperimentRecords }

export const experiments: Experiment[] = [errors, telegram]

/**
 * User’s choices on this device. Experiment without a choice follows
 * its `autostart`.
 */
export const experimentChoices = persistentJSON<Record<string, boolean>>(
  'slowreader:experiments',
  {}
)

export function isExperimentEnabled(
  experiment: Experiment,
  choices: Record<string, boolean>
): boolean {
  return choices[experiment.name] ?? experiment.autostart
}

/**
 * Hidden experiment gets into the list only after user enabled it
 * by a direct link.
 */
export function isExperimentListed(
  experiment: Experiment,
  choices: Record<string, boolean>
): boolean {
  return !experiment.hidden || choices[experiment.name] === true
}

export function toggleExperiment(name: string, enabled: boolean): void {
  experimentChoices.set({ ...experimentChoices.get(), [name]: enabled })
}

function getRecordsKey(name: string): string {
  return `slowreader:experiment:${name}`
}

/**
 * JSON list of records collected by the experiment on this device.
 */
export function getExperimentRecords(name: string): string {
  return getEnvironment().persistentStore[getRecordsKey(name)] ?? '[]'
}

function saveRecords(experiment: Experiment, records: unknown[]): void {
  if (isExperimentEnabled(experiment, experimentChoices.get())) {
    getEnvironment().persistentStore[getRecordsKey(experiment.name)] =
      JSON.stringify(records)
  }
}

onEnvironment(({ persistentStore, restartApp }) => {
  let saved = Object.entries(experimentChoices.get())
  let known = saved.filter(([name]) => experiments.some(i => i.name === name))
  if (known.length < saved.length) {
    experimentChoices.set(Object.fromEntries(known))
  }

  for (let key of Object.keys(persistentStore)) {
    if (
      key.startsWith(getRecordsKey('')) &&
      !experiments.some(i => {
        return (
          key === getRecordsKey(i.name) &&
          isExperimentEnabled(i, experimentChoices.get())
        )
      })
    ) {
      delete persistentStore[key]
    }
  }

  let stops = new Map<string, (() => void) | void>()
  let unbind = experimentChoices.subscribe(choices => {
    for (let experiment of experiments) {
      let name = experiment.name
      if (isExperimentEnabled(experiment, choices)) {
        if (!stops.has(name)) {
          let stop = experiment.collects
            ? experiment.onStart({
                addRecord(record) {
                  saveRecords(experiment, [
                    ...(JSON.parse(getExperimentRecords(name)) as unknown[]),
                    record
                  ])
                },
                loadRecords() {
                  return JSON.parse(getExperimentRecords(name)) as unknown[]
                },
                setRecords(records) {
                  saveRecords(experiment, records)
                }
              })
            : experiment.onStart()
          stops.set(name, stop)
        }
      } else if (stops.has(name)) {
        let stop = stops.get(name)
        stops.delete(name)
        delete persistentStore[getRecordsKey(name)]
        if (stop) {
          stop()
        } else {
          restartApp()
        }
      }
    }
  })

  return () => {
    unbind()
    for (let stop of stops.values()) stop?.()
    stops.clear()
  }
})
