import { atom } from 'nanostores'

import { busyDuring } from '../busy.ts'
import { resetDatabase } from '../client.ts'
import { storageMessages } from '../messages/index.ts'
import { compactDatabase, getDatabaseSize } from '../schema.ts'
import { hasPassword } from '../settings.ts'
import { createPage } from './common.ts'

export const storagePage = createPage('storage', () => {
  let $size = atom<number | undefined>()

  async function updateSize(): Promise<void> {
    $size.set(await getDatabaseSize())
  }
  void updateSize()

  return {
    compact() {
      return busyDuring(
        storageMessages.get().compacting,
        async () => {
          await compactDatabase()
          await updateSize()
        },
        true
      )
    },
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
