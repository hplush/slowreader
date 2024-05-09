import {
  getCategoryTitle,
  type FeedsByCategory,
  getCategories,
  feedsByCategory
} from './category.js'
import { atom, onMount } from 'nanostores'
import { readonlyExport } from './lib/stores.js'
import { getFeeds, type FeedValue } from './feed.js'
import { loadValue } from '@logux/client'

let $categories = atom({ isLoading: true })
let $allFeeds = atom({ isLoading: true })
let $feedsByCategoryList = atom([])

export const feedsByCategoryList = readonlyExport($feedsByCategoryList)

onMount(feedsByCategoryList, () => {
  Promise.all([loadValue(getCategories()), loadValue(getFeeds())]).then(
    ([categoriesValue, feedsValue]) => {
      $categories.set({ list: categoriesValue.list, isLoading: false })
      $allFeeds.set({ list: feedsValue.list, isLoading: false })
      $feedsByCategoryList.set(
        feedsByCategory($categories.get().list, $allFeeds.get().list)
      )
      selectAllFeeds()
    }
  )
})

let $selectedCategories = atom<string[]>([])
let $selectedFeeds = atom<string[]>([])

export const selectedCategories = readonlyExport($selectedCategories)
export const selectedFeeds = readonlyExport($selectedFeeds)

export function selectAllFeeds() {
  const selectedCategoriesSet = new Set<string>()
  const selectedFeedsSet = new Set<string>()

  $feedsByCategoryList.get().forEach(([category, feeds]) => {
    selectedCategoriesSet.add(category.id)
    feeds.forEach(feed => selectedFeedsSet.add(feed.id))
  })

  $selectedCategories.set(Array.from(selectedCategoriesSet))
  $selectedFeeds.set(Array.from(selectedFeedsSet))
}

export function clearSelections() {
  $selectedCategories.set(new Set())
  $selectedFeeds.set(new Set())
}

export function getOPMLBlob() {
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

  return new Blob([opml], { type: 'application/xml' })
}

export function toggleCategory(categoryId: string) {
  const selectedCategories = new Set($selectedCategories.get())
  const selectedFeeds = new Set($selectedFeeds.get())

  const feeds = $allFeeds
    .get()
    .list.filter(feed => feed.categoryId === categoryId)

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

export function toggleFeed(feedId: string, categoryId: string) {
  const selectedCategories = new Set($selectedCategories.get())
  const selectedFeeds = new Set($selectedFeeds.get())

  if (selectedFeeds.has(feedId)) {
    selectedFeeds.delete(feedId)
    // Проверяем, остались ли еще ленты в этой категории
    const remainingFeedsInCategory = $allFeeds
      .get()
      .list.filter(
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
