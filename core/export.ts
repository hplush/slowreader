import { commonMessages as common } from './messages/index.js'

export function selectAllFeeds(feedsByCategory) {
  const selectedCategories = new Set()
  const selectedFeeds = new Set()

  feedsByCategory.forEach(([category, feeds]) => {
    selectedCategories.add(category.id)
    feeds.forEach(feed => selectedFeeds.add(feed.id))
  })

  return { selectedCategories, selectedFeeds }
}

export function clearSelections() {
  return { selectedCategories: new Set(), selectedFeeds: new Set() }
}

export function getCategoryTitle(category) {
  if (category.id === 'general') {
    return common.value.generalCategory
  } else if (category.id === 'broken') {
    return common.value.brokenCategory
  } else {
    return category.title
  }
}

export function exportToOPML(
  feedsByCategory,
  selectedCategories,
  selectedFeeds
) {
  let opml =
    '<?xml version="1.0" encoding="UTF-8"?>\n<opml version="2.0">\n<head>\n<title>Feeds</title>\n</head>\n<body>\n'

  feedsByCategory.forEach(([category, feeds]) => {
    if (selectedCategories.has(category.id)) {
      opml += `<outline text="${getCategoryTitle(category)}">\n`
      feeds.forEach(feed => {
        if (selectedFeeds.has(feed.id)) {
          opml += `<outline text="${feed.title}" type="rss" xmlUrl="${feed.url}" />\n`
        }
      })
      opml += `</outline>\n`
    }
  })

  opml += '</body>\n</opml>'

  // Trigger download
  const blob = new Blob([opml], { type: 'application/xml' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'feeds.opml'
  a.click()
  URL.revokeObjectURL(url)
}
