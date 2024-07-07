import { nanoid } from 'nanoid'
import { atom } from 'nanostores'

import {
  addCategory,
  type CategoryValue,
  type FeedsByCategory
} from './category.js'
import { addFeed, type FeedValue } from './feed.js'
import { readonlyExport } from './lib/stores.js'
import { importMessages } from './messages/index.js'
import { createFeedFromUrl } from './preview.js'

let $importedFeedsByCategory = atom<FeedsByCategory>([])
let $importedCategories = atom<string[]>([])
let $importedFeeds = atom<string[]>([])
let $unLoadedFeeds = atom<string[]>([])
let $importLoadingFeeds = atom<{ [key: string]: boolean }>({})
let $reading = atom<boolean>(false)
let $submiting = atom<boolean>(false)
let $importErrors = atom<string[]>([])
let $categories = atom<CategoryValue[]>([])
let $feeds = atom<FeedValue[]>([])

export const importedFeedsByCategory = readonlyExport($importedFeedsByCategory)
export const importedCategories = readonlyExport($importedCategories)
export const importedFeeds = readonlyExport($importedFeeds)
export const importReading = readonlyExport($reading)
export const submiting = readonlyExport($submiting)
export const importUnLoadedFeeds = readonlyExport($unLoadedFeeds)
export const importErrors = readonlyExport($importErrors)
export const importLoadingFeeds = readonlyExport($importLoadingFeeds)

// just subscribe() doesnt work in test
export function importSubscribe(): void {
  $feeds.set(
    Array.from(
      new Set(
        $importedFeedsByCategory
          .get()
          .flatMap(([, feeds]) => feeds.map(feed => feed))
      )
    )
  )

  $categories.set(
    Array.from(
      new Set($importedFeedsByCategory.get().flatMap(([category]) => category))
    )
  )
}

const addFeedsToLoading = (feedUrls: string[]): void => {
  let currentLoadingFeeds = { ...$importLoadingFeeds.get() }
  feedUrls.forEach(feedUrl => {
    currentLoadingFeeds[feedUrl] = true
  })
  $importLoadingFeeds.set(currentLoadingFeeds)
}

const processFeed = async (
  feedUrl: string,
  categoryId: string
): Promise<FeedValue | undefined> => {
  try {
    let feed = await createFeedFromUrl(feedUrl, categoryId)
    $importLoadingFeeds.set({
      ...$importLoadingFeeds.get(),
      [feedUrl]: false
    })
    return feed
  } catch (error) {
    let currentLoadingFeeds = { ...$importLoadingFeeds.get() }
    delete currentLoadingFeeds[feedUrl]
    $importLoadingFeeds.set(currentLoadingFeeds)
    $unLoadedFeeds.set([...$unLoadedFeeds.get(), feedUrl])
  }
}

export const selectAllImportedFeeds = (): void => {
  $importedCategories.set($categories.get().map(category => category.id))
  $importedFeeds.set($feeds.get().map(feed => feed.id))
}

export const clearImportSelections = (): void => {
  $importedCategories.set([])
  $importedFeeds.set([])
}

export const toggleImportedCategory = (categoryId: string): void => {
  let selectedCategories = new Set($importedCategories.get())
  let selectedFeeds = new Set($importedFeeds.get())

  let feeds = $feeds.get().filter(feed => feed.categoryId === categoryId)

  if (selectedCategories.has(categoryId)) {
    selectedCategories.delete(categoryId)
    feeds.forEach(feed => selectedFeeds.delete(feed.id))
  } else {
    selectedCategories.add(categoryId)
    feeds.forEach(feed => selectedFeeds.add(feed.id))
  }

  $importedCategories.set(Array.from(selectedCategories))
  $importedFeeds.set(Array.from(selectedFeeds))
}

export const toggleImportedFeed = (
  feedId: string,
  categoryId: string
): void => {
  let selectedCategories = new Set($importedCategories.get())
  let selectedFeeds = new Set($importedFeeds.get())

  if (selectedFeeds.has(feedId)) {
    selectedFeeds.delete(feedId)
    let remainingFeedsInCategory = $feeds
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

  $importedCategories.set(Array.from(selectedCategories))
  $importedFeeds.set(Array.from(selectedFeeds))
}

export const handleImportFile = (file: File): Promise<void> => {
  return new Promise(resolve => {
    $reading.set(true)
    $importErrors.set([])
    $importedFeedsByCategory.set([])
    $unLoadedFeeds.set([])
    $importLoadingFeeds.set({})
    importSubscribe()
    let reader = new FileReader()
    reader.onload = async function (e) {
      let content = e.target?.result as string
      let fileExtension = file.name.split('.').pop()?.toLowerCase()

      if (fileExtension === 'json') {
        try {
          let jsonData = JSON.parse(content)
          if (jsonData.type === 'feedsByCategory') {
            $importedFeedsByCategory.set(jsonData.data)
            importSubscribe()
            selectAllImportedFeeds()
          } else {
            $importErrors.set([
              ...$importErrors.get(),
              importMessages.get().invalidJSONError
            ])
          }
        } catch (jsonError) {
          $importErrors.set([importMessages.get().failedParseJSONError])
        }
      } else if (fileExtension === 'opml') {
        try {
          let parser = new DOMParser()
          let xmlDoc = parser.parseFromString(content, 'text/xml')

          if (xmlDoc.documentElement.nodeName === 'opml') {
            let feedsByCategory: FeedsByCategory = []
            let outlines = xmlDoc.getElementsByTagName('outline')

            let generalCategory: CategoryValue = {
              id: 'general',
              title: 'General'
            }

            let brokenCategory: CategoryValue = {
              id: 'broken',
              title: 'Broken category'
            }

            let generalFeeds: FeedValue[] = []
            let generalCategoryExists = false
            let allFeedUrls: { categoryId: string; feedUrl: string }[] = []

            for (let i = 0; i < outlines.length; i++) {
              let outline = outlines[i]
              if (outline?.parentElement) {
                if (
                  outline.parentElement.nodeName === 'body' &&
                  outline.children.length > 0
                ) {
                  let categoryTitle = outline.getAttribute('text')!
                  let categoryId

                  switch (categoryTitle) {
                    case generalCategory.title:
                      categoryId = generalCategory.id
                      break
                    case brokenCategory.title:
                      categoryId = brokenCategory.id
                      break
                    default:
                      categoryId = nanoid()
                  }

                  if (categoryId === 'general') {
                    generalCategoryExists = true
                  }

                  let category: CategoryValue = {
                    id: categoryId,
                    title: categoryTitle
                  }
                  let feeds: FeedValue[] = []

                  let childOutlines = outline.children
                  for (let j = 0; j < childOutlines.length; j++) {
                    let feedOutline = childOutlines[j]
                    let feedUrl = feedOutline?.getAttribute('xmlUrl')
                    if (feedUrl) {
                      allFeedUrls.push({ categoryId: category.id, feedUrl })
                    }
                  }
                  feedsByCategory.push([category, feeds])
                } else if (
                  outline.parentElement.nodeName === 'body' &&
                  outline.getAttribute('xmlUrl')
                ) {
                  let feedUrl = outline.getAttribute('xmlUrl')
                  if (feedUrl) {
                    allFeedUrls.push({
                      categoryId: generalCategory.id,
                      feedUrl
                    })
                  }
                }
              }
            }

            // Add all feeds to loading
            addFeedsToLoading(allFeedUrls.map(feed => feed.feedUrl))

            // Process feeds sequentially
            for (let { categoryId, feedUrl } of allFeedUrls) {
              let feed = await processFeed(feedUrl, categoryId)
              if (feed) {
                for (let i = 0; i < feedsByCategory.length; i++) {
                  let categoryFeed = feedsByCategory[i]
                  if (categoryFeed?.[0] && categoryFeed[0].id === categoryId) {
                    categoryFeed[1].push(feed)
                    break
                  }
                }
              }
            }

            if (generalCategoryExists) {
              for (let i = 0; i < feedsByCategory.length; i++) {
                let categoryFeeds = feedsByCategory[i]
                if (categoryFeeds && categoryFeeds[0].id === 'general') {
                  categoryFeeds[1].push(...generalFeeds)
                  break
                }
              }
            } else {
              feedsByCategory.push([generalCategory, generalFeeds])
            }

            $importedFeedsByCategory.set(feedsByCategory)
            importSubscribe()
            selectAllImportedFeeds()
          } else {
            $importErrors.set([importMessages.get().OPMLError])
          }
        } catch (xmlError) {
          $importErrors.set([importMessages.get().OPMLError])
        }
      } else {
        $importErrors.set([importMessages.get().formatError])
      }

      $reading.set(false)
      if (!e.target?.error) {
        resolve()
      }
    }
    reader.readAsText(file)
  })
}

export const submitImport = async (): Promise<void> => {
  $submiting.set(true)
  let categoryPromises = []
  let feedPromises = []

  for (let item of $importedFeedsByCategory.get()) {
    let category = item[0]
    let feeds = item[1]

    if (
      category.id !== 'general' &&
      category.id !== 'broken' &&
      $importedCategories.get().includes(category.id)
    ) {
      categoryPromises.push(addCategory({ title: category.title }))
    }

    for (let feed of feeds) {
      if ($importedFeeds.get().includes(feed.id)) {
        feedPromises.push(addFeed(feed))
      }
    }
  }

  await Promise.all(categoryPromises)
  await Promise.all(feedPromises)

  $importedFeedsByCategory.set([])
  $importedCategories.set([])
  $importedFeeds.set([])
  importSubscribe()
  $unLoadedFeeds.set([])
  $submiting.set(false)
}
