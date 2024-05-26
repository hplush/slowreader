import {
  getCategoryTitle,
  getCategories,
  feedsByCategory,
  type FeedsByCategory,
  type CategoryValue
} from './category.js'
import { atom, onMount } from 'nanostores'
import { readonlyExport } from './lib/stores.js'
import { getFeeds, type FeedValue } from './feed.js'
import { loadValue, type FilterValue } from '@logux/client'
import { getPosts, type PostValue } from './post.js'

type ExtendedFeedValue = FeedValue & {
  posts?: PostValue[]
}

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

export function selectAllExportedFeeds() {
  const selectedCategoriesSet = new Set<string>()
  const selectedFeedsSet = new Set<string>()

  $feedsByCategoryList.get().forEach(([category, feeds]) => {
    selectedCategoriesSet.add(category.id)
    feeds.forEach(feed => selectedFeedsSet.add(feed.id))
  })

  $selectedCategories.set(Array.from(selectedCategoriesSet))
  $selectedFeeds.set(Array.from(selectedFeedsSet))
}

export function clearExportedSelections() {
  $selectedCategories.set([])
  $selectedFeeds.set([])
}

export function getOPMLBlob() {
  $creating.set(true)
  let opml =
    '<?xml version="1.0" encoding="UTF-8"?>\n<opml version="2.0">\n<head>\n<title>Feeds</title>\n</head>\n<body>\n'

  $feedsByCategoryList.get().forEach(([category, feeds]) => {
    if ($selectedCategories.get().includes(category.id)) {
      opml += `<outline text="${getCategoryTitle(category)}">\n`
      feeds.forEach(feed => {
        if ($selectedFeeds.get().includes(feed.id)) {
          opml += `<outline text="${feed.title}" type="rss" xmlUrl="${feed.url}" />\n`
        }
      })
      opml += `</outline>\n`
    }
  })

  opml += '</body>\n</opml>'

  $creating.set(false)

  return new Blob([opml], { type: 'application/xml' })
}

export async function getInternalBlob(isIncludePosts: Boolean) {
  $creating.set(true)
  let posts: PostValue[]
  if (isIncludePosts) {
    posts = await loadValue(getPosts()).then(value => value.list)
  }
  const enrichedData = $feedsByCategoryList.get().map(([category, feeds]) => {
    const categoryTitle = getCategoryTitle(category)
    if (isIncludePosts) {
      feeds.forEach(feed => {
        feed.posts = posts.filter(post => post.feedId === feed.id)
      })
    }
    return [{ ...category, title: categoryTitle }, feeds]
  })
  const jsonStr = JSON.stringify({
    type: 'feedsByCategory', // mark for validation in import
    data: enrichedData
  })
  $creating.set(false)
  return new Blob([jsonStr], { type: 'application/json' })
}

export function toggleExportedCategory(categoryId: string) {
  const selectedCategories = new Set($selectedCategories.get())
  const selectedFeeds = new Set($selectedFeeds.get())

  const feeds = $allFeeds.get().filter(feed => feed.categoryId === categoryId)

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

export function toggleExportedFeed(feedId: string, categoryId: string) {
  const selectedCategories = new Set($selectedCategories.get())
  const selectedFeeds = new Set($selectedFeeds.get())

  if (selectedFeeds.has(feedId)) {
    selectedFeeds.delete(feedId)
    const remainingFeedsInCategory = $allFeeds
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
