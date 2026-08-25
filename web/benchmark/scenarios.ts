import { closeAllPopups } from '@slowreader/core'
import { fillReaderFeed } from '@slowreader/core/benchmark'

import { getURL, pathRouter } from '../stores/url-router.ts'
import { nextFrame, waitIdle } from './measure.ts'

export interface Scenario {
  name: string
  prepare?: () => Promise<void>
  run: () => Promise<void>
}

const ADDED = 'slowreader:benchmark-added'

function nextFeedUrl(): string {
  let count = Number(localStorage.getItem(ADDED) ?? 0) + 1
  localStorage.setItem(ADDED, String(count))
  return `https://example.com/new-feed-${count}.xml`
}

const WAIT_TIMEOUT = 30000

const FREEZE_TEST = 200

function byAnchor(anchor: string): string {
  return `[data-anchor="${anchor}"]`
}

async function waitFor<Element extends HTMLElement>(
  selector: string
): Promise<Element> {
  let finish = performance.now() + WAIT_TIMEOUT
  let element = document.querySelector<Element>(selector)
  while (!element) {
    if (performance.now() > finish) {
      throw new Error(`No ${selector} on the page`)
    }
    await nextFrame()
    element = document.querySelector<Element>(selector)
  }
  return element
}

async function click(selector: string, index = 0): Promise<void> {
  await waitFor(selector)
  let elements = document.querySelectorAll<HTMLElement>(selector)
  let element = elements[index]
  if (!element) throw new Error(`No ${selector} number ${index} on the page`)
  element.click()
}

async function open(url: string): Promise<void> {
  closeAllPopups()
  pathRouter.open(url)
  await waitIdle()
}

async function typeIn(selector: string, text: string): Promise<void> {
  let input = await waitFor<HTMLInputElement>(selector)
  input.value = text
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

function slowPage(feed: string, from?: number): string {
  return getURL({ params: { feed, from }, route: 'slow' })
}

function fastPage(category: string): string {
  return getURL({ params: { category, from: undefined }, route: 'fast' })
}

export function createScenarios(
  category: string,
  readerFeed: string,
  slowFeeds: string[]
): Scenario[] {
  let feed = slowFeeds[0]!
  return [
    {
      name: 'open-slow-feed',
      async prepare() {
        await open(getURL('about'))
      },
      async run() {
        await open(slowPage(feed))
      }
    },
    {
      name: 'open-fast-category',
      async prepare() {
        await open(getURL('about'))
      },
      async run() {
        await open(fastPage(category))
      }
    },
    {
      name: 'paginate',
      async prepare() {
        await open(slowPage(feed, 0))
      },
      async run() {
        await click(byAnchor('next-page'))
      }
    },
    {
      name: 'open-feed-reader',
      async prepare() {
        await open(getURL('about'))
      },
      async run() {
        await open(slowPage(readerFeed))
      }
    },
    {
      name: 'paginate-feed-reader',
      async prepare() {
        await open(slowPage(readerFeed))
      },
      async run() {
        await click(byAnchor('next-page'))
      }
    },
    {
      name: 'switch-reader',
      async prepare() {
        await open(slowPage(feed, 0))
      },
      async run() {
        await click(byAnchor('reader-feed'))
        await waitIdle()
        await click(byAnchor('reader-list'))
      }
    },
    {
      name: 'open-post',
      async prepare() {
        closeAllPopups()
        await open(slowPage(feed, 0))
      },
      async run() {
        await click(byAnchor('post'))
        await waitFor(byAnchor('popup'))
      }
    },
    {
      name: 'menu-navigation',
      async prepare() {
        await open(slowPage(feed, 0))
      },
      async run() {
        for (let id of slowFeeds) {
          await open(slowPage(id))
        }
        await open(fastPage(category))
        await open(getURL('feedsByCategories'))
      }
    },
    {
      name: 'feeds-by-categories',
      async prepare() {
        await open(getURL('about'))
      },
      async run() {
        await open(getURL('feedsByCategories'))
      }
    },
    {
      name: 'read-page',
      async prepare() {
        await fillReaderFeed()
        await open(slowPage(readerFeed))
      },
      async run() {
        await click(byAnchor('read-page'))
      }
    },
    {
      name: 'add-feed',
      async prepare() {
        closeAllPopups()
        await open(
          getURL({
            params: { candidate: undefined, url: undefined },
            route: 'add'
          })
        )
      },
      async run() {
        let url = nextFeedUrl()
        await typeIn(byAnchor('add-url'), url)
        await click(`${byAnchor('feed')}[href*="${encodeURIComponent(url)}"]`)
        await click(byAnchor('add-feed'))
      }
    },
    {
      name: 'refresh',
      async prepare() {
        await open(slowPage(feed, 0))
      },
      async run() {
        await click(byAnchor('refresh'))
      }
    },
    {
      name: 'freeze',
      async prepare() {
        await open(getURL('about'))
      },
      run() {
        let finish = Date.now() + FREEZE_TEST
        while (Date.now() < finish) {
          document.body.getBoundingClientRect()
        }
        return Promise.resolve()
      }
    }
  ]
}
