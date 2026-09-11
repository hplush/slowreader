import { atom } from 'nanostores'

import { busyDuring } from '../busy.ts'
import { resetDatabase } from '../client.ts'
import { getEnvironment } from '../environment.ts'
import { formatCurrentTime } from '../format.ts'
import { storageMessages } from '../messages/index.ts'
import { getDatabaseSize, rebuildDatabase } from '../schema.ts'
import { hasPassword, isDemo } from '../settings.ts'
import { createPage } from './common.ts'

export const storagePage = createPage('storage', () => {
  let $size = atom<number | undefined>()

  async function updateSize(): Promise<void> {
    $size.set(undefined)
    $size.set(await getDatabaseSize())
  }
  void updateSize()

  let unbindDemo = isDemo.listen(() => {
    void updateSize()
  })

  let env = getEnvironment()
  let exporter = env.exportDatabase

  return {
    compact() {
      return busyDuring(
        storageMessages.get().compacting,
        async () => {
          await rebuildDatabase()
          await updateSize()
        },
        true
      )
    },
    exit() {
      unbindDemo()
    },
    exportDatabase: exporter
      ? () => {
          return busyDuring(
            storageMessages.get().exporting,
            async () => {
              let file = await exporter()
              env.saveFile(`slowreader-${formatCurrentTime()}.sqlite`, file)
            },
            true
          )
        }
      : undefined,
    hasCloud: hasPassword,
    params: {},
    resetDatabase() {
      return resetDatabase('user-request')
    },
    size: $size
  }
})

export type StoragePage = ReturnType<typeof storagePage>
