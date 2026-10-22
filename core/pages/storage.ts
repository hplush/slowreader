import { atom } from 'nanostores'

import { busyDuring } from '../busy.ts'
import { resetDatabase } from '../client.ts'
import { getEnvironment } from '../environment.ts'
import { formatCurrentTime } from '../format.ts'
import { clearMediaCache } from '../media-cache.ts'
import { storageMessages } from '../messages/index.ts'
import { getDatabaseSize, rebuildDatabase } from '../schema.ts'
import { hasCloud } from '../settings.ts'
import { isDemo } from '../welcome.ts'
import { createPage } from './common.ts'

export const storagePage = createPage('storage', () => {
  let $size = atom<number | undefined>()
  let $mediaSize = atom<number | undefined>()

  async function updateSize(): Promise<void> {
    $size.set(undefined)
    $size.set(await getDatabaseSize())
  }
  void updateSize()

  let env = getEnvironment()

  async function updateMediaSize(): Promise<void> {
    $mediaSize.set(undefined)
    $mediaSize.set(await env.mediaCache.size())
  }
  void updateMediaSize()

  let unbindDemo = isDemo.listen(() => {
    void updateSize()
  })

  let dumper = env.dumpDatabase

  return {
    async clearMedia() {
      await clearMediaCache()
      await updateMediaSize()
    },
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
    dumpDatabase: dumper
      ? () => {
          return busyDuring(
            storageMessages.get().dumping,
            async () => {
              let file = await dumper()
              env.saveFile(`slowreader-${formatCurrentTime()}.sqlite`, file)
            },
            true
          )
        }
      : undefined,
    exit() {
      unbindDemo()
    },
    hasCloud,
    mediaSize: $mediaSize,
    params: {},
    resetDatabase() {
      return resetDatabase('user-request')
    },
    size: $size
  }
})

export type StoragePage = ReturnType<typeof storagePage>
