import { deepEqual, equal } from 'node:assert/strict'
import { afterEach, beforeEach, describe, test } from 'node:test'

import {
  type Experiment,
  experimentChoices,
  type ExperimentRecords,
  experiments,
  getEnvironment,
  getExperimentRecords,
  setupEnvironment,
  toggleExperiment
} from '../index.ts'
import { cleanClient, startClient } from './utils.ts'

describe('experiments', () => {
  let original: Experiment[]
  let log: string[] = []
  let records: ExperimentRecords

  beforeEach(() => {
    original = experiments.splice(
      0,
      experiments.length,
      {
        autostart: false,
        collects: false,
        description: '',
        hidden: false,
        name: 'feature',
        onStart() {
          log.push('start feature')
          return () => {
            log.push('stop feature')
          }
        },
        sending: false,
        title: 'Feature'
      },
      {
        autostart: false,
        collects: true,
        description: '',
        hidden: false,
        name: 'collector',
        onStart(helpers) {
          log.push('start collector')
          records = helpers
        },
        sending: false,
        title: 'Collector'
      },
      {
        autostart: true,
        collects: false,
        description: '',
        hidden: true,
        name: 'default',
        onStart() {
          log.push('start default')
          return () => {
            log.push('stop default')
          }
        },
        sending: false,
        title: 'Default'
      }
    )
    startClient({
      restartApp() {
        log.push('restart')
      }
    })
    log = []
  })

  afterEach(async () => {
    experiments.splice(0, experiments.length, ...original)
    experimentChoices.set({})
    await cleanClient()
  })

  test('starts enabled experiments on every app start', () => {
    toggleExperiment('feature', true)
    deepEqual(log, ['start feature'])

    toggleExperiment('feature', true)
    deepEqual(log, ['start feature'])

    log = []
    setupEnvironment(getEnvironment())
    deepEqual(log, [
      'stop default',
      'stop feature',
      'start feature',
      'start default'
    ])
  })

  test('stops disabled experiment or restarts the app', () => {
    toggleExperiment('feature', true)
    toggleExperiment('collector', true)
    log = []

    toggleExperiment('feature', false)
    deepEqual(log, ['stop feature'])

    toggleExperiment('feature', true)
    deepEqual(log, ['stop feature', 'start feature'])

    toggleExperiment('collector', false)
    deepEqual(log, ['stop feature', 'start feature', 'restart'])

    toggleExperiment('default', false)
    deepEqual(log, ['stop feature', 'start feature', 'restart', 'stop default'])

    log = []
    setupEnvironment(getEnvironment())
    deepEqual(log, ['stop feature', 'start feature'])
  })

  test('follows changes from other tabs', () => {
    experimentChoices.set({ default: false, feature: true, unknown: true })
    deepEqual(log, ['start feature', 'stop default'])

    experimentChoices.set({})
    deepEqual(log, [
      'start feature',
      'stop default',
      'stop feature',
      'start default'
    ])
  })

  test('forgets choices for removed experiments on start', () => {
    experimentChoices.set({ feature: true, unknown: true })
    setupEnvironment(getEnvironment())
    deepEqual(experimentChoices.get(), { feature: true })
  })

  test('collects records only for enabled experiment', () => {
    equal(getExperimentRecords('collector'), '[]')

    toggleExperiment('collector', true)
    records.addRecord('one')
    records.addRecord({ two: 2 })
    equal(getExperimentRecords('collector'), '["one",{"two":2}]')

    records.setRecord('three')
    equal(getExperimentRecords('collector'), '["three"]')
    deepEqual(records.loadRecords(), ['three'])

    setupEnvironment(getEnvironment())
    equal(getExperimentRecords('collector'), '["three"]')

    toggleExperiment('collector', false)
    equal(getExperimentRecords('collector'), '[]')

    records.addRecord('four')
    records.setRecord('five')
    equal(getExperimentRecords('collector'), '[]')
  })

  test('cleans records without enabled experiment on start', () => {
    let environment = getEnvironment()
    environment.persistentStore['slowreader:experiment:collector'] = '["old"]'
    environment.persistentStore['slowreader:experiment:unknown'] = '["old"]'
    environment.persistentStore['slowreader:experiments:other'] = 'other'

    setupEnvironment(environment)
    deepEqual(
      Object.keys(environment.persistentStore).filter(i => {
        return i.startsWith('slowreader:experiment')
      }),
      ['slowreader:experiments:other']
    )
  })
})
