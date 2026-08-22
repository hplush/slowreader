import { deleteUser } from '@slowreader/api'
import { atom, computed } from 'nanostores'

import { signOut } from '../auth.ts'
import { getClient, resetDatabase, syncStatus } from '../client.ts'
import { hasPassword, userId } from '../settings.ts'
import { createPage } from './common.ts'

export const cloudPage = createPage('cloud', () => {
  let $unsavedData = computed(syncStatus, status => /wait/i.test(status))

  let $deletingAccount = atom(false)
  async function deleteAccount(): Promise<void> {
    $deletingAccount.set(true)
    await getClient().sync(deleteUser({}))
    await signOut()
  }

  return {
    deleteAccount,
    deletingAccount: $deletingAccount,
    exit() {},
    hasCloud: hasPassword,
    params: {},
    redownloadData() {
      return resetDatabase('user-request')
    },
    unsavedData: $unsavedData,
    userId
  }
})

export type CloudPage = ReturnType<typeof cloudPage>
