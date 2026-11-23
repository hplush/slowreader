import { deepEqual, equal } from 'node:assert/strict'
import { afterEach, beforeEach, describe, test } from 'node:test'

import {
  type Experiment,
  experimentChoices,
  type ExperimentRecords,
  experiments,
  hasCloud,
  toggleExperiment,
  waitLoading
} from '../../index.ts'
import {
  checkLoadedPopup,
  cleanClient,
  openTestPopup,
  startClient
} from '../utils.ts'

describe('experiments popup', () => {
  let original: Experiment[]
  let records: ExperimentRecords

  beforeEach(() => {
    original = experiments.splice(
      0,
      experiments.length,
      {
        autostart: false,
        collects: false,
        description: 'Feature description',
        hidden: false,
        name: 'feature',
        onStart() {
          return () => {}
        },
        sending: true,
        title: 'Feature'
      },
      {
        autostart: true,
        collects: true,
        description: 'Collector description',
        hidden: false,
        name: 'collector',
        onStart(helpers) {
          records = helpers
          return () => {}
        },
        sending: false,
        title: 'Collector'
      },
      {
        autostart: false,
        collects: false,
        description: 'Secret description',
        hidden: true,
        name: 'secret',
        onStart() {},
        sending: false,
        title: 'Secret'
      }
    )
    startClient()
  })

  afterEach(async () => {
    experiments.splice(0, experiments.length, ...original)
    experimentChoices.set({})
    await cleanClient()
  })

  test('lists experiments for users with their state', async t => {
    records.addRecord('one')
    let opened = openTestPopup('experiments', '1')
    await waitLoading(opened.loading)
    let list = checkLoadedPopup(opened).experiments
    t.after(list.listen(() => {}))
    deepEqual(
      list.get().map(i => [i.experiment.name, i.hint]),
      [
        ['feature', undefined],
        ['collector', '1 record']
      ]
    )

    records.addRecord('two')
    toggleExperiment('feature', true)
    deepEqual(
      list.get().map(i => [i.experiment.name, i.hint]),
      [
        ['feature', 'Enabled'],
        ['collector', '2 records']
      ]
    )

    toggleExperiment('collector', false)
    deepEqual(
      list.get().map(i => [i.experiment.name, i.hint]),
      [
        ['feature', 'Enabled'],
        ['collector', undefined]
      ]
    )
  })

  test('tells about sending data only to cloud users', async t => {
    toggleExperiment('feature', true)
    let opened = openTestPopup('experiments', '1')
    await waitLoading(opened.loading)
    let list = checkLoadedPopup(opened).experiments
    t.after(list.listen(() => {}))
    deepEqual(
      list.get().map(i => [i.experiment.name, i.hint]),
      [
        ['feature', 'Enabled'],
        ['collector', 'Enabled']
      ]
    )

    hasCloud.set(true)
    deepEqual(
      list.get().map(i => [i.experiment.name, i.hint]),
      [
        ['feature', 'Sending'],
        ['collector', 'Enabled']
      ]
    )

    toggleExperiment('feature', false)
    deepEqual(
      list.get().map(i => [i.experiment.name, i.hint]),
      [
        ['feature', undefined],
        ['collector', 'Enabled']
      ]
    )
  })

  test('lists hidden experiment after user enabled it', async t => {
    toggleExperiment('secret', true)
    let opened = openTestPopup('experiments', '1')
    await waitLoading(opened.loading)
    let list = checkLoadedPopup(opened).experiments
    t.after(list.listen(() => {}))
    deepEqual(
      list.get().map(i => i.experiment.name),
      ['feature', 'collector', 'secret']
    )

    toggleExperiment('secret', false)
    deepEqual(
      list.get().map(i => i.experiment.name),
      ['feature', 'collector']
    )
  })

  test('is missing without experiments for users', async () => {
    experiments.splice(0, 2)
    let opened = openTestPopup('experiments', '1')
    await waitLoading(opened.loading)
    equal(opened.notFound, true)
  })
})
