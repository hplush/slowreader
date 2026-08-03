import { deepStrictEqual } from 'node:assert/strict'
import { describe, test } from 'node:test'

import { reportLoader, setLoaderReporter } from '../index.ts'

describe('loader', () => {
  test('does nothing without reporter', () => {
    reportLoader('test')()
  })

  test('reports loaders to the reporter', () => {
    let calls: string[] = []
    setLoaderReporter(name => {
      calls.push(`show ${name}`)
      return () => {
        calls.push(`hide ${name}`)
      }
    })

    let hide = reportLoader('posts')
    deepStrictEqual(calls, ['show posts'])
    hide()
    deepStrictEqual(calls, ['show posts', 'hide posts'])

    setLoaderReporter(() => {
      return () => {}
    })
  })
})
