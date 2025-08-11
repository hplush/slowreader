import { deleteUser } from '@slowreader/api'
import { atom, computed } from 'nanostores'

import { signOut } from '../auth.ts'
import { getClient, syncStatus } from '../client.ts'
import { hasPassword, userId } from '../settings.ts'
import { createPage } from './common.ts'

export const profilePage = createPage('profile', () => {
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
    signOut,
    unsavedData: $unsavedData,
    userId
  }
})

export type ProfilePage = ReturnType<typeof profilePage>
