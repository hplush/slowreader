import { busyDuring } from './busy.ts'
import { deleteCategory, loadCategories } from './category.ts'
import { deleteAllFeeds } from './feed.ts'
import { welcomeMessages } from './messages/index.ts'
import { freeDatabasePages } from './schema.ts'
import { isDemo } from './welcome.ts'

export async function deleteDemo(): Promise<void> {
  await deleteAllFeeds()
  for (let category of await loadCategories()) {
    await deleteCategory(category.id)
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
