import { atom, type WritableAtom } from 'nanostores'

import { loadAccounts, needFollowsSync, syncFollows } from '../../account.ts'

export type FollowsSync = 'checking' | 'done' | 'none' | 'syncing'

/**
 * Feeds list shows the loader with the follows sync.
 *
 * `none` means no sync needed on this page, so the page will not reserve space
 *  for the loader.
 */
export function injectFollowsSync(): { sync: WritableAtom<FollowsSync> } {
  let $sync = atom<FollowsSync>('checking')
  void loadAccounts().then(accounts => {
    let needUpdate = new Set(
      accounts.filter(needFollowsSync).map(account => account.service)
    )
    if (needUpdate.size === 0) {
      $sync.set('none')
      return
    }
    $sync.set('syncing')
    void Promise.all([...needUpdate].map(syncFollows)).then(() => {
      $sync.set('done')
    })
  })
  return { sync: $sync }
}
