import { atom, type WritableAtom } from 'nanostores'

import { loadAccounts, needFollowsSync, syncAccounts } from '../../account.ts'

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
    if (!accounts.some(needFollowsSync)) {
      $sync.set('none')
      return
    }
    $sync.set('syncing')
    void syncAccounts(accounts).then(() => {
      $sync.set('done')
    })
  })
  return { sync: $sync }
}
