import { equal, match } from 'node:assert/strict'
import { afterEach, beforeEach, describe, test } from 'node:test'

import {
  experimentChoices,
  experiments,
  toggleExperiment
} from '../../index.ts'
import { cleanClient, startClient, openPage, openRoute } from '../utils.ts'

describe('about page', () => {
  beforeEach(() => {
    startClient()
    openRoute({
      params: {},
      route: 'fatal'
    })
  })

  afterEach(async () => {
    await cleanClient()
  })

  test('has app version', () => {
    let page = openPage({
      params: {},
      route: 'about'
    })
    match(page.appVersion, /\d+\.\d+\.\d+/)
  })

  test('has experiments only if user can see them', t => {
    let original = experiments.splice(0, experiments.length, {
      autostart: true,
      collects: false,
      description: '',
      hidden: true,
      name: 'secret',
      onStart() {
        return () => {}
      },
      sending: false,
      title: 'Secret'
    })
    t.after(() => {
      experiments.splice(0, experiments.length, ...original)
      experimentChoices.set({})
    })
    let page = openPage({ params: {}, route: 'about' })
    equal(page.hasExperiments.get(), false)

    toggleExperiment('secret', true)
    equal(page.hasExperiments.get(), true)

    toggleExperiment('secret', false)
    equal(page.hasExperiments.get(), false)

    openRoute({ params: {}, route: 'fatal' })
    experiments.push({
      autostart: false,
      collects: false,
      description: '',
      hidden: false,
      name: 'feature',
      onStart() {},
      sending: false,
      title: 'Feature'
    })
    equal(openPage({ params: {}, route: 'about' }).hasExperiments.get(), true)
  })
})
