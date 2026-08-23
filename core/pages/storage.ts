import { atom } from 'nanostores'

import { resetDatabase } from '../client.ts'
import { getDatabaseSize } from '../schema.ts'
import { hasPassword } from '../settings.ts'
import { createPage } from './common.ts'

export const storagePage = createPage('storage', () => {
  let $size = atom<number | undefined>()
  void getDatabaseSize().then(size => {
    $size.set(size)
  })

  return {
    exit() {},
    hasCloud: hasPassword,
    params: {},
    rebuildDatabase() {
      return resetDatabase('user-request')
    },
    size: $size
  }
})

export type StoragePage = ReturnType<typeof storagePage>
