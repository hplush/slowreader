import { atom } from 'nanostores'

import {
  changeAccount,
  deleteAccount,
  getAccount,
  openAccountSignInPage,
  signInErrorToMessage,
  startAccountSignIn,
  updateAccountProfile
} from '../account.ts'
import { getCategories, getCategoryOptions } from '../category.ts'
import { NotFoundError } from '../errors.ts'
import { createDownloadTask } from '../lib/download.ts'
import { storeFromColumn, waitSql } from '../lib/stores.ts'
import { loaders } from '../loader/index.ts'
import { closeLastPopup } from '../router.ts'
import { type CreatedLoadedPopup, definePopup } from './common.ts'

export const account = definePopup('account', async id => {
  let categoriesStore = getCategories()
  let [$account] = await Promise.all([
    waitSql(getAccount(id)),
    waitSql(categoriesStore)
  ])
  let loaded = $account.get().value
  if (!loaded) throw new NotFoundError()
  let task = createDownloadTask()
  void updateAccountProfile(task, loaded)
  let $signInError = atom<string | undefined>()
  let $signingIn = atom(false)
  return {
    account: $account,
    categories: getCategoryOptions(categoriesStore),
    changeCategory(categoryId: string): Promise<void> {
      return changeAccount(id, { categoryId })
    },
    destroy() {
      task.destroy()
    },
    follow: storeFromColumn($account, 'follow', false, follow =>
      changeAccount(id, { follow })
    ),
    async remove(): Promise<void> {
      closeLastPopup()
      await deleteAccount(id)
    },
    /**
     * Credentials are synced, so a new sign in on any device fixes all.
     * Web leaves the app, and Accounts page saves the new credentials
     * to the same account on the return.
     */
    async signInAgain(): Promise<void> {
      let row = $account.get().value ?? loaded
      $signInError.set(undefined)
      $signingIn.set(true)
      try {
        let step = await startAccountSignIn(
          row.service,
          row[loaders[row.service].account!.firstField]
        )
        if (step.type === 'open') await openAccountSignInPage(row.service, step)
      } catch (e) {
        $signInError.set(signInErrorToMessage(e))
      } finally {
        $signingIn.set(false)
      }
    },
    signInError: $signInError,
    signingIn: $signingIn
  }
})

export type AccountPopup = CreatedLoadedPopup<typeof account>
