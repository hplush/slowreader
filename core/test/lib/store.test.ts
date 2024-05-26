import { atom, map } from 'nanostores'
import { deepStrictEqual } from 'node:assert'
import { test } from 'node:test'

import {
  computeFrom,
  increaseKey,
  isWritableAtom,
  listenMany,
  readonlyExport
} from '../../lib/stores.js'

test('writable atom type guard', () => {
  const $a = atom(0)
  const readOnly = readonlyExport($a)

  deepStrictEqual(isWritableAtom(readOnly), true)
})

test('increases keys', () => {
  let $map = map({ a: 0, b: 0 })

  increaseKey($map, 'a')
  deepStrictEqual($map.get(), { a: 1, b: 0 })
})

test('listens many stores', () => {
  let $a = atom(0)
  let $b = atom<string[]>([])
  let results: number[] = []

  let unbind = listenMany([$a, $b], (a, b) => {
    results.push(a + b.length)
  })
  deepStrictEqual(results, [0])

  $a.set(10)
  deepStrictEqual(results, [0, 10])

  $b.set(['1', '2'])
  deepStrictEqual(results, [0, 10, 12])

  unbind()
  $a.set(20)
  deepStrictEqual(results, [0, 10, 12])
})

test('listens many stores and save value to another store', () => {
  let $a = atom(0)
  let $b = atom<string[]>([])
  let $result = atom(0)

  let unbind = computeFrom($result, [$a, $b], (a, b) => a + b.length)
  deepStrictEqual($result.get(), 0)

  $a.set(10)
  deepStrictEqual($result.get(), 10)

  $b.set(['1', '2'])
  deepStrictEqual($result.get(), 12)

  unbind()
  $a.set(20)
  deepStrictEqual($result.get(), 12)
})
