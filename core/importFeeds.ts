import { atom, onMount, computed } from 'nanostores'
import { readonlyExport } from './lib/stores.js'
import { addCategory } from './category.js'
import { addFeed } from './feed.js'

let $importedFeedsByCategory = atom([])
export const importedFeedsByCategory = readonlyExport($importedFeedsByCategory)

let $selectedCategories = atom<string[]>([])
let $selectedFeeds = atom<string[]>([])
export const importedCategories = readonlyExport($selectedCategories)
export const importedFeeds = readonlyExport($selectedFeeds)

let $categories = atom()
let $feeds = atom()

$importedFeedsByCategory.subscribe(feedsByCategory => {
  $feeds.set(
    Array.from(
      new Set(
        feedsByCategory.flatMap(([category, feeds]) => feeds.map(feed => feed))
      )
    )
  )

  $categories.set(
    Array.from(
      new Set(feedsByCategory.flatMap(([category, feeds]) => category))
    )
  )
})

export function selectAllImportedFeeds() {
  $selectedCategories.set($categories.get().map(category => category.id))
  $selectedFeeds.set($feeds.get().map(feed => feed.id))
}

export function clearImportSelections() {
  $selectedCategories.set([])
  $selectedFeeds.set([])
}

export function toggleImportedCategory(categoryId: string) {
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

export function toggleImportedFeed(feedId: string, categoryId: string) {
  const selectedCategories = new Set($selectedCategories.get())
  const selectedFeeds = new Set($selectedFeeds.get())

  if (selectedFeeds.has(feedId)) {
    selectedFeeds.delete(feedId)
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

export function handleImportFile(file) {
  const reader = new FileReader()
  reader.onload = function (e) {
    const content = e.target.result

    // Check if the content is JSON
    try {
      const jsonData = JSON.parse(content)
      console.log('File is in JSON format', jsonData)
      $importedFeedsByCategory.set(jsonData)
      selectAllImportedFeeds()
    } catch (jsonError) {
      // Not a JSON, check if it's OPML
      try {
        const parser = new DOMParser()
        const xmlDoc = parser.parseFromString(content, 'text/xml')
        if (xmlDoc.documentElement.nodeName === 'opml') {
          console.log('File is in OPML format', xmlDoc)
        } else {
          console.log('File is not in JSON or OPML format')
        }
      } catch (xmlError) {
        console.log('File is not in JSON or OPML format')
      }
    }
  }
  reader.readAsText(file)
}

export async function submitImport() {
  const categoryPromises = []
  const feedPromises = []

  for (let item of $importedFeedsByCategory.get()) {
    const category = item[0]
    const feeds = item[1]

    // Если категория не 'general', добавляем её
    if (category.id !== 'general') {
      categoryPromises.push(addCategory({ title: category.title }))
    }

    // Добавляем все фиды из категории
    for (let feed of feeds) {
      feedPromises.push(addFeed(feed))
    }
  }

  // Ожидаем завершения всех промисов
  await Promise.all(categoryPromises)
  await Promise.all(feedPromises)
}
