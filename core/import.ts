import { nanoid } from 'nanoid'
import { atom } from 'nanostores'

import {
  addCategory,
  type CategoryValue,
  type FeedsByCategory
} from './category.ts'
import type { InternalExport } from './export.ts'
import { addFeed, type FeedValue } from './feed.ts'
import { readonlyExport, waitLoading } from './lib/stores.ts'
import { unique } from './loader/utils.ts'
import { importMessages } from './messages/index.ts'
import { pages } from './pages/index.ts'

let $importedFeedsByCategory = atom<FeedsByCategory>([])
export const importedFeedsByCategory = readonlyExport($importedFeedsByCategory)

let $importedCategories = atom<string[]>([])
export const importedCategories = readonlyExport($importedCategories)

let $importedFeeds = atom<string[]>([])
export const importedFeeds = readonlyExport($importedFeeds)

let $unLoadedFeeds = atom<string[]>([])
export const importUnLoadedFeeds = readonlyExport($unLoadedFeeds)

let $importLoadingFeeds = atom<{ [key: string]: boolean }>({})
export const importLoadingFeeds = readonlyExport($importLoadingFeeds)

let $reading = atom<boolean>(false)
export const importReading = readonlyExport($reading)

let $importing = atom<boolean>(false)
export const importing = readonlyExport($importing)

let $importErrors = atom<string[]>([])
export const importErrors = readonlyExport($importErrors)

let $categories = atom<CategoryValue[]>([])
let $feeds = atom<FeedValue[]>([])

// just subscribe() does not work in test
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

export async function createFeedFromUrl(
  url: string,
  categoryId: string = 'general'
): Promise<FeedValue> {
  let addPage = pages.add()
  try {
    addPage.params.url.set(url)
    await waitLoading(addPage.searching)

    let candidate = addPage.candidates.get().find(i => i.url === url)
    if (!candidate) {
      throw new Error('No suitable loader found for the given URL')
    }

    return {
      categoryId,
      id: nanoid(),
      lastPublishedAt: Date.now() / 1000,
      loader: candidate.name,
      reading: 'fast',
      title: candidate.title,
      url
    }
  } finally {
    addPage.destroy()
  }
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
  } catch {
    let currentLoadingFeeds = { ...$importLoadingFeeds.get() }
    delete currentLoadingFeeds[feedUrl]
    $importLoadingFeeds.set(currentLoadingFeeds)
    $unLoadedFeeds.set(unique([...$unLoadedFeeds.get(), feedUrl]))
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

function isInternalExport(json: unknown): json is InternalExport {
  return (
    typeof json === 'object' &&
    json !== null &&
    'type' in json &&
    json.type === 'feedsByCategory' &&
    'data' in json &&
    Array.isArray(json.data)
  )
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
          if (isInternalExport(jsonData)) {
            $importedFeedsByCategory.set(jsonData.data)
            importSubscribe()
            selectAllImportedFeeds()
          } else {
            $importErrors.set([
              ...$importErrors.get(),
              importMessages.get().invalidJSONError
            ])
          }
        } catch {
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

                  if (categoryTitle === brokenCategory.title) {
                    categoryId = brokenCategory.id
                  } else if (categoryTitle === generalCategory.title) {
                    categoryId = generalCategory.id
                  } else {
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
        } catch {
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
  $importing.set(true)
  let feedPromises = []

  for (let item of $importedFeedsByCategory.get()) {
    let categoryId = ''
    let category = item[0]
    let feeds = item[1]
    if (
      category.id !== 'general' &&
      category.id !== 'broken' &&
      $importedCategories.get().includes(category.id)
    ) {
      categoryId = await addCategory({ title: category.title })
    } else {
      categoryId = category.id
    }

    for (let feed of feeds) {
      if ($importedFeeds.get().includes(feed.id)) {
        feedPromises.push(addFeed({ ...feed, categoryId }))
      }
    }
  }

  await Promise.all(feedPromises)

  $importedFeedsByCategory.set([])
  $importedCategories.set([])
  $importedFeeds.set([])
  importSubscribe()
  $unLoadedFeeds.set([])
  $importing.set(false)
}
