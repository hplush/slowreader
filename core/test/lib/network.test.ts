import { atom } from 'nanostores'
import { equal } from 'node:assert/strict'
import { afterEach, beforeEach, describe, test } from 'node:test'

import {
  canDetectSaveData,
  canUseNetwork,
  followNetworkUse,
  isSaveData,
  type NetworkUse,
  saveData,
  saveDataMode,
  setupEnvironment
} from '../../index.ts'
import { getTestEnvironment, setTestNetwork } from '../utils.ts'

describe('network', () => {
  beforeEach(() => {
    setupEnvironment(getTestEnvironment())
  })

  afterEach(() => {
    saveDataMode.set('auto')
  })

  test('follows system Save Data in auto mode', () => {
    equal(canDetectSaveData(), false)
    equal(isSaveData(), false)
    equal(saveData.get(), false)
    equal(canUseNetwork('always'), true)

    setTestNetwork({ saveData: true, type: 'free' })
    equal(canDetectSaveData(), true)
    equal(saveData.get(), true)
    equal(canUseNetwork('always'), false)
    equal(canUseNetwork('free'), false)

    setTestNetwork({ saveData: false, type: 'free' })
    equal(saveData.get(), false)
    equal(canUseNetwork('free'), true)
  })

  test('overrides system Save Data by user setting', () => {
    setTestNetwork({ saveData: true, type: 'free' })
    saveDataMode.set('off')
    equal(saveData.get(), false)
    equal(canUseNetwork('free'), true)

    setTestNetwork({ saveData: false, type: 'paid' })
    saveDataMode.set('on')
    equal(saveData.get(), true)
    equal(canUseNetwork('always'), false)
    equal(canUseNetwork('free'), false)

    saveDataMode.set('off')
    equal(canUseNetwork('free'), false)
    equal(canUseNetwork('never'), false)
  })

  test('saves data only on paid network', () => {
    saveDataMode.set('paid')
    setTestNetwork({ saveData: false, type: 'paid' })
    equal(saveData.get(), true)
    equal(canUseNetwork('always'), false)

    setTestNetwork({ saveData: true, type: 'free' })
    equal(saveData.get(), false)
    equal(canUseNetwork('always'), true)
  })

  test('follows setting, network, and Save Data changes', t => {
    let setting = atom<NetworkUse>('never')
    let allowed = followNetworkUse(setting)
    let unbind = allowed.listen(() => {})
    t.after(unbind)
    equal(allowed.get(), false)

    setting.set('free')
    equal(allowed.get(), true)

    setTestNetwork({ saveData: false, type: 'paid' })
    equal(allowed.get(), false)

    setting.set('always')
    equal(allowed.get(), true)

    saveDataMode.set('on')
    equal(allowed.get(), false)
  })

  test('ignores Save Data without network type', () => {
    setTestNetwork({ saveData: true, type: 'unknown' })
    equal(canDetectSaveData(), false)
    equal(saveData.get(), false)
  })
})
