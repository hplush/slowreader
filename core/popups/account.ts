import {
  changeAccount,
  deleteAccount,
  getAccount,
  updateAccountProfile
} from '../account.ts'
import { getCategories, getCategoryOptions } from '../category.ts'
import { NotFoundError } from '../errors.ts'
import { createDownloadTask } from '../lib/download.ts'
import { storeFromColumn, waitSql } from '../lib/stores.ts'
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
    }
  }
})

export type AccountPopup = CreatedLoadedPopup<typeof account>
