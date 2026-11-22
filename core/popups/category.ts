import { atom, computed } from 'nanostores'

import {
  changeCategory,
  deleteCategory,
  getCategory,
  loadCategory
} from '../category.ts'
import { NotFoundError } from '../errors.ts'
import { changeReader } from '../reader.ts'
import type { UsefulReaderName } from '../readers/common.ts'
import { navigate } from '../router.ts'
import { GENERAL_CATEGORY } from '../schema.ts'
import { type CreatedLoadedPopup, definePopup } from './common.ts'

export const category = definePopup('category', async id => {
  let found = await loadCategory(id)
  if (!found) throw new NotFoundError()
  let $category = atom(found)
  let unbindCategory = getCategory(id).subscribe(row => {
    if (row.status === 'ready' && row.value) $category.set(row.value)
  })
  let common = {
    category: $category,
    changeReader(reader: UsefulReaderName): Promise<void> {
      return changeReader({ categoryId: id }, reader)
    },
    destroy() {
      unbindCategory()
    },
    reader: computed($category, row => row.reader ?? 'feed')
  }
  if (id === GENERAL_CATEGORY) return { ...common, general: true as const }
  return {
    ...common,
    general: false as const,
    async remove(): Promise<void> {
      navigate(route => ({
        ...((route.route === 'fast' || route.route === 'slow') &&
        route.params.category === id
          ? { params: {}, route: route.route }
          : route),
        popups: route.popups.slice(0, -1)
      }))
      await deleteCategory(id)
    },
    async rename(title: string): Promise<void> {
      if (title.trim()) await changeCategory(id, { title: title.trim() })
    }
  }
})

export type CategoryPopup = CreatedLoadedPopup<typeof category>
