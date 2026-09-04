import { atom } from 'nanostores'

import { busyDuring } from '../busy.ts'
import { deleteCategory, loadCategories } from '../category.ts'
import { resetDatabase } from '../client.ts'
import { deleteAllFeeds } from '../feed.ts'
import { storageMessages } from '../messages/index.ts'
import {
  freeDatabasePages,
  getDatabaseSize,
  rebuildDatabase
} from '../schema.ts'
import { hasPassword, isDemo } from '../settings.ts'
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
          await rebuildDatabase()
          await updateSize()
        },
        true
      )
    },
    async dropDemo() {
      await busyDuring(
        storageMessages.get().deletingDemo,
        async () => {
          await deleteAllFeeds()
          for (let category of await loadCategories()) {
            await deleteCategory(category.id)
          }
          isDemo.set(false)
          await freeDatabasePages()
          await updateSize()
        },
        true
      )
    },
    exit() {},
    hasCloud: hasPassword,
    keepDemo() {
      isDemo.set(false)
    },
    params: {},
    resetDatabase() {
      return resetDatabase('user-request')
    },
    size: $size
  }
})

export type StoragePage = ReturnType<typeof storagePage>
