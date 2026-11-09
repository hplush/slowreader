import { atom, type WritableAtom } from 'nanostores'

import { loadAccounts, needFollowsSync, syncFollows } from '../../account.ts'
import { createDownloadTask } from '../../lib/download.ts'

export type FollowsSync = 'checking' | 'done' | 'none' | 'syncing'

/**
 * Feeds list shows the loader with the follows sync.
 *
 * `none` means no sync needed on this page, so the page will not reserve space
 *  for the loader.
 */
export function injectFollowsSync(): {
  exit(): void
  sync: WritableAtom<FollowsSync>
} {
  let $sync = atom<FollowsSync>('checking')
  let task = createDownloadTask()
  void loadAccounts().then(accounts => {
    let needUpdate = new Set(
      accounts.filter(needFollowsSync).map(account => account.service)
    )
    if (needUpdate.size === 0) {
      $sync.set('none')
      return
    }
    $sync.set('syncing')
    void Promise.all(
      [...needUpdate].map(service => syncFollows(service, task))
    ).then(() => {
      $sync.set('done')
    })
  })
  return {
    exit() {
      task.destroy()
    },
    sync: $sync
  }
}
