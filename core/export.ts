import { loadValue } from '@logux/client'
import { atom, onMount } from 'nanostores'

import {
  type CategoryValue,
  feedsByCategory,
  getCategories,
  getCategoryTitle
} from './category.js'
import { type FeedValue, getFeeds } from './feed.js'
import { readonlyExport } from './lib/stores.js'
import { getPosts, type PostValue } from './post.js'

type ExtendedFeedValue = {
  posts?: PostValue[]
} & FeedValue

let $categories = atom<CategoryValue[]>([])
let $allFeeds = atom<FeedValue[]>([])
let $feedsByCategoryList = atom<[CategoryValue, ExtendedFeedValue[]][]>([])
let $creating = atom<boolean>(false)

export const feedsByCategoryList = readonlyExport($feedsByCategoryList)
export const creating = readonlyExport($creating)

onMount(feedsByCategoryList, () => {
  Promise.all([loadValue(getCategories()), loadValue(getFeeds())]).then(
    ([categoriesValue, feedsValue]) => {
      $categories.set(categoriesValue.list)
      $allFeeds.set(feedsValue.list)
      $feedsByCategoryList.set(
        feedsByCategory($categories.get(), $allFeeds.get())
      )

      selectAllExportedFeeds()
    }
  )
})

let $selectedCategories = atom<string[]>([])
let $selectedFeeds = atom<string[]>([])

export const exportedCategories = readonlyExport($selectedCategories)
export const exportedFeeds = readonlyExport($selectedFeeds)

export function selectAllExportedFeeds(): void {
  let selectedCategoriesSet = new Set<string>()
  let selectedFeedsSet = new Set<string>()

  $feedsByCategoryList
    .get()
    .forEach(([category, feeds]: [CategoryValue, ExtendedFeedValue[]]) => {
      selectedCategoriesSet.add(category.id)
      feeds.forEach(feed => selectedFeedsSet.add(feed.id))
    })

  $selectedCategories.set(Array.from(selectedCategoriesSet))
  $selectedFeeds.set(Array.from(selectedFeedsSet))
}

export function clearExportedSelections(): void {
  $selectedCategories.set([])
  $selectedFeeds.set([])
}

export function getOPMLBlob(): Blob {
  $creating.set(true)
  let opml =
    '<?xml version="1.0" encoding="UTF-8"?>\n<opml version="2.0">\n<head>\n<title>Feeds</title>\n</head>\n<body>\n'

  $feedsByCategoryList
    .get()
    .forEach(([category, feeds]: [CategoryValue, ExtendedFeedValue[]]) => {
      if ($selectedCategories.get().includes(category.id)) {
        opml += `<outline text="${getCategoryTitle(category)}">\n`
        feeds.forEach(feed => {
          if ($selectedFeeds.get().includes(feed.id)) {
            opml += `<outline text="${feed.title}" type="${feed.loader}" xmlUrl="${feed.url}" />\n`
          }
        })
        opml += `</outline>\n`
      }
    })

  opml += '</body>\n</opml>'

  $creating.set(false)

  return new Blob([opml], { type: 'application/xml' })
}

export async function getInternalBlob(isIncludePosts: Boolean): Promise<Blob> {
  $creating.set(true)
  let posts: PostValue[]
  /* eslint-disable-next-line @typescript-eslint/no-unnecessary-condition */
  if (isIncludePosts) {
    posts = await loadValue(getPosts()).then(value => value.list)
  }
  let enrichedData = $feedsByCategoryList
    .get()
    .map(([category, feeds]: [CategoryValue, ExtendedFeedValue[]]) => {
      let categoryTitle = getCategoryTitle(category)
      /* eslint-disable-next-line @typescript-eslint/no-unnecessary-condition */
      if (isIncludePosts) {
        feeds.forEach(feed => {
          feed.posts = posts.filter(post => post.feedId === feed.id)
        })
      }
      return [{ ...category, title: categoryTitle }, feeds]
    })
  let jsonStr = JSON.stringify({
    data: enrichedData,
    type: 'feedsByCategory' // mark for validation in import
  })
  $creating.set(false)
  return new Blob([jsonStr], { type: 'application/json' })
}

export function toggleExportedCategory(categoryId: string): void {
  let selectedCategories = new Set($selectedCategories.get())
  let selectedFeeds = new Set($selectedFeeds.get())

  let feeds = $allFeeds.get().filter(feed => feed.categoryId === categoryId)

  if (selectedCategories.has(categoryId)) {
    selectedCategories.delete(categoryId)
    feeds.forEach(feed => selectedFeeds.delete(feed.id))
  } else {
    selectedCategories.add(categoryId)
    feeds.forEach(feed => selectedFeeds.add(feed.id))
  }

  $selectedCategories.set(Array.from(selectedCategories))
  $selectedFeeds.set(Array.from(selectedFeeds))
}

export function toggleExportedFeed(feedId: string, categoryId: string): void {
  let selectedCategories = new Set($selectedCategories.get())
  let selectedFeeds = new Set($selectedFeeds.get())

  if (selectedFeeds.has(feedId)) {
    selectedFeeds.delete(feedId)
    let remainingFeedsInCategory = $allFeeds
      .get()
      .filter(
        feed => feed.categoryId === categoryId && selectedFeeds.has(feed.id)
      )
    if (remainingFeedsInCategory.length === 0) {
      selectedCategories.delete(categoryId)
    }
  } else {
    selectedFeeds.add(feedId)
    selectedCategories.add(categoryId)
  }

  $selectedCategories.set(Array.from(selectedCategories))
  $selectedFeeds.set(Array.from(selectedFeeds))
}
