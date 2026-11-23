import { deepEqual, equal } from 'node:assert/strict'
import { afterEach, beforeEach, describe, test } from 'node:test'

import {
  type Experiment,
  experimentChoices,
  type ExperimentRecords,
  experiments,
  waitLoading
} from '../../index.ts'
import {
  checkLoadedPopup,
  cleanClient,
  openTestPopup,
  startClient
} from '../utils.ts'

describe('experiment popup', () => {
  let original: Experiment[]
  let records: ExperimentRecords

  beforeEach(() => {
    original = experiments.splice(
      0,
      experiments.length,
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
        onStart() {
          return () => {}
        },
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

  test('enables hidden experiment', async t => {
    let opened = openTestPopup('experiment', 'secret')
    await waitLoading(opened.loading)
    let popup = checkLoadedPopup(opened)
    equal(popup.experiment.title, 'Secret')
    t.after(popup.enabled.listen(() => {}))
    equal(popup.enabled.get(), false)

    popup.enabled.set(true)
    equal(popup.enabled.get(), true)
    deepEqual(experimentChoices.get(), { secret: true })

    experimentChoices.set({})
    equal(popup.enabled.get(), false)
  })

  test('is missing for unknown experiment', async () => {
    let opened = openTestPopup('experiment', 'unknown')
    await waitLoading(opened.loading)
    equal(opened.notFound, true)
  })

  test('shows the latest records by request', async t => {
    records.addRecord('one')
    let opened = openTestPopup('experiment', 'collector')
    await waitLoading(opened.loading)
    let popup = checkLoadedPopup(opened)
    t.after(popup.enabled.listen(() => {}))
    t.after(popup.records.listen(() => {}))
    equal(popup.enabled.get(), true)
    equal(popup.records.get(), '["one"]')

    records.addRecord('two')
    equal(popup.records.get(), '["one"]')

    popup.updateRecords()
    equal(popup.records.get(), '["one","two"]')

    popup.enabled.set(false)
    equal(popup.records.get(), '[]')
  })
})
