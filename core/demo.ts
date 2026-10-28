import { busyDuring } from './busy.ts'
import { deleteCategory, loadCategories } from './category.ts'
import { loadFeedByUrl, RELEASES_FEED } from './feed.ts'
import { welcomeMessages } from './messages/index.ts'
import { freeDatabasePages, getTables } from './schema.ts'
import { isDemo } from './welcome.ts'

export async function deleteDemo(): Promise<void> {
  let releases = await loadFeedByUrl(RELEASES_FEED)
  await getTables().posts.deleteWhere`
    "feedId" IS NULL OR "feedId" NOT IN (
      SELECT "id" FROM "feeds" WHERE "url" = ${RELEASES_FEED}
    )
  `
  await getTables().feeds.deleteWhere`"url" != ${RELEASES_FEED}`
  for (let category of await loadCategories()) {
    if (category.id !== releases?.categoryId) {
      await deleteCategory(category.id)
    }
  }
  await freeDatabasePages()
  isDemo.set(false)
}

export function deleteDemoWithBusy(): Promise<void> {
  return busyDuring(welcomeMessages.get().deleting, deleteDemo, true)
}

export function keepDemo(): void {
  isDemo.set(false)
}
