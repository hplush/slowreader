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

type FeedWithPosts = {
  posts?: PostValue[]
} & FeedValue

let $categories = atom<CategoryValue[]>([])
let $allFeeds = atom<FeedValue[]>([])
let $exportingFeedsByCategory = atom<[CategoryValue, FeedWithPosts[]][]>([])
let $exporting = atom<boolean>(false)

export const exportingFeedsByCategory = readonlyExport(
  $exportingFeedsByCategory
)
export const exporting = readonlyExport($exporting)

onMount(exportingFeedsByCategory, () => {
  Promise.all([loadValue(getCategories()), loadValue(getFeeds())]).then(
    ([categoriesValue, feedsValue]) => {
      $categories.set(categoriesValue.list)
      $allFeeds.set(feedsValue.list)
      $exportingFeedsByCategory.set(
        feedsByCategory($categories.get(), $allFeeds.get())
      )

      selectAllExportingFeeds()
    }
  )
})

let $selectedCategories = atom<string[]>([])
let $selectedFeeds = atom<string[]>([])

export const exportingCategories = readonlyExport($selectedCategories)
export const exportingFeeds = readonlyExport($selectedFeeds)

export function selectAllExportingFeeds(): void {
  let selectedCategoriesSet = new Set<string>()
  let selectedFeedsSet = new Set<string>()

  $exportingFeedsByCategory
    .get()
    .forEach(([category, feeds]: [CategoryValue, FeedWithPosts[]]) => {
      selectedCategoriesSet.add(category.id)
      feeds.forEach(feed => selectedFeedsSet.add(feed.id))
    })

  $selectedCategories.set(Array.from(selectedCategoriesSet))
  $selectedFeeds.set(Array.from(selectedFeedsSet))
}

export function clearExportingSelections(): void {
  $selectedCategories.set([])
  $selectedFeeds.set([])
}

export function getOPMLBlob(): Blob {
  $exporting.set(true)
  let opml =
    '<?xml version="1.0" encoding="UTF-8"?>\n<opml version="2.0">\n<head>\n<title>Feeds</title>\n</head>\n<body>\n'

  $exportingFeedsByCategory
    .get()
    .forEach(([category, feeds]: [CategoryValue, FeedWithPosts[]]) => {
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

  $exporting.set(false)

  return new Blob([opml], { type: 'application/xml' })
}

export async function getInternalBlob(isIncludePosts: Boolean): Promise<Blob> {
  $exporting.set(true)
  let posts: PostValue[]
  /* eslint-disable-next-line @typescript-eslint/no-unnecessary-condition */
  if (isIncludePosts) {
    posts = await loadValue(getPosts()).then(value => value.list)
  }
  let enrichedData = $exportingFeedsByCategory
    .get()
    .map(([category, feeds]: [CategoryValue, FeedWithPosts[]]) => {
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
  $exporting.set(false)
  return new Blob([jsonStr], { type: 'application/json' })
}

export function toggleExportingCategory(categoryId: string): void {
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

export function toggleExportingFeed(feedId: string, categoryId: string): void {
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
