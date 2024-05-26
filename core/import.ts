import { atom } from 'nanostores'
import { readonlyExport } from './lib/stores.js'
import {
  addCategory,
  type CategoryValue,
  type FeedsByCategory
} from './category.js'
import { addFeed, type FeedValue } from './feed.js'
import { getFeedFromUrl } from './preview.js'

let $importedFeedsByCategory = atom<FeedsByCategory>([])
export const importedFeedsByCategory = readonlyExport($importedFeedsByCategory)

let $importedCategories = atom<string[]>([])
let $importedFeeds = atom<string[]>([])
let $reading = atom<boolean>(false)
let $submiting = atom<boolean>(false)

export const importedCategories = readonlyExport($importedCategories)
export const importedFeeds = readonlyExport($importedFeeds)
export const reading = readonlyExport($reading)
export const submiting = readonlyExport($submiting)

let $categories = atom<CategoryValue[]>([])
let $feeds = atom<FeedValue[]>([])

$importedFeedsByCategory.subscribe(feedsByCategory => {
  $feeds.set(
    Array.from(
      new Set(feedsByCategory.flatMap(([, feeds]) => feeds.map(feed => feed)))
    )
  )

  $categories.set(
    Array.from(new Set(feedsByCategory.flatMap(([category]) => category)))
  )
})

export function selectAllImportedFeeds() {
  $importedCategories.set($categories.get().map(category => category.id))
  $importedFeeds.set($feeds.get().map(feed => feed.id))
}

export function clearImportSelections() {
  $importedCategories.set([])
  $importedFeeds.set([])
}

export function toggleImportedCategory(categoryId: string) {
  const selectedCategories = new Set($importedCategories.get())
  const selectedFeeds = new Set($importedFeeds.get())

  const feeds = $feeds.get().filter(feed => feed.categoryId === categoryId)

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

export function toggleImportedFeed(feedId: string, categoryId: string) {
  const selectedCategories = new Set($importedCategories.get())
  const selectedFeeds = new Set($importedFeeds.get())

  if (selectedFeeds.has(feedId)) {
    selectedFeeds.delete(feedId)
    const remainingFeedsInCategory = $feeds
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

export function handleImportFile(file: File): void {
  $reading.set(true)
  $importedFeedsByCategory.set([])
  const reader = new FileReader()
  reader.onload = async function (e) {
    try {
      const content = e.target?.result as string
      const fileExtension = file.name.split('.').pop()?.toLowerCase()

      if (fileExtension === 'json') {
        try {
          const jsonData = JSON.parse(content)
          if (jsonData.type === 'feedsByCategory') {
            $importedFeedsByCategory.set(jsonData.data)
            selectAllImportedFeeds()
            return
          } else {
            throw new Error('Invalid JSON structure')
          }
        } catch (jsonError) {
          console.error('Failed to parse JSON or invalid structure:', jsonError)
          return
        }
      } else if (fileExtension === 'opml') {
        try {
          const parser = new DOMParser()
          const xmlDoc = parser.parseFromString(content, 'text/xml')

          if (xmlDoc.documentElement.nodeName === 'opml') {
            const feedsByCategory: FeedsByCategory = []
            const outlines = xmlDoc.getElementsByTagName('outline')

            // General category to hold uncategorized feeds
            const generalCategory: CategoryValue = {
              id: 'general',
              title: 'General'
            }
            const generalFeeds: FeedValue[] = []

            // Flag to track the existence of the General category in the file
            let generalCategoryExists = false

            for (let i = 0; i < outlines.length; i++) {
              const outline = outlines[i]
              if (outline && outline.parentElement) {
                if (
                  outline.parentElement.nodeName === 'body' &&
                  outline.children.length > 0
                ) {
                  // Top-level outline element with children, considered a category
                  const categoryId = outline.getAttribute('text')!.toLowerCase()
                  const categoryTitle = outline.getAttribute('text')!

                  if (categoryId === 'general') {
                    generalCategoryExists = true
                  }

                  const category: CategoryValue = {
                    id: categoryId,
                    title: categoryTitle
                  }
                  const feeds: FeedValue[] = []

                  const childOutlines = outline.children
                  for (let j = 0; j < childOutlines.length; j++) {
                    const feedOutline = childOutlines[j]
                    const feedUrl = feedOutline?.getAttribute('xmlUrl')
                    if (feedUrl) {
                      const feed = await getFeedFromUrl(feedUrl, category.id)
                      feeds.push(feed)
                    }
                  }
                  feedsByCategory.push([category, feeds])
                } else if (
                  outline.parentElement.nodeName === 'body' &&
                  outline.getAttribute('xmlUrl')
                ) {
                  // Feed directly under body without a parent category, add to General
                  const feedUrl = outline.getAttribute('xmlUrl')
                  if (feedUrl) {
                    const feed = await getFeedFromUrl(
                      feedUrl,
                      generalCategory.id
                    )
                    generalFeeds.push(feed)
                  }
                }
              }
            }

            if (generalFeeds.length > 0) {
              if (generalCategoryExists) {
                // If the General category already exists, add feeds without parent to it
                for (let i = 0; i < feedsByCategory.length; i++) {
                  if (feedsByCategory[i][0].id === 'general') {
                    feedsByCategory[i][1].push(...generalFeeds)
                    break
                  }
                }
              } else {
                // If there is no General category, create it
                feedsByCategory.push([generalCategory, generalFeeds])
              }
            }

            $importedFeedsByCategory.set(feedsByCategory)
            selectAllImportedFeeds()
          } else {
            throw new Error('File is not in OPML format')
          }
        } catch (xmlError) {
          console.error('File is not in OPML format')
        }
      } else {
        console.error('Unsupported file format')
      }
    } finally {
      $reading.set(false)
    }
  }
  reader.readAsText(file)
}

export async function submitImport() {
  $submiting.set(true)
  const categoryPromises = []
  const feedPromises = []

  for (let item of $importedFeedsByCategory.get()) {
    const category = item[0]
    const feeds = item[1]

    if (category.id !== 'general') {
      categoryPromises.push(addCategory({ title: category.title }))
    }

    for (let feed of feeds) {
      feedPromises.push(addFeed(feed))
    }
  }

  await Promise.all(categoryPromises)
  await Promise.all(feedPromises)

  $importedFeedsByCategory.set([])
  $submiting.set(false)
}
