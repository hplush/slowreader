import debounce from 'just-debounce-it'
import { atom, computed, map } from 'nanostores'

import { getEnvironment, isMobile } from '../environment.ts'
import {
  createDownloadTask,
  type DownloadTask,
  ignoreAbortError,
  type TextResponse
} from '../lib/download.ts'
import {
  type FeedLoader,
  getLoaderForText,
  type LoaderName,
  loaders
} from '../loader/index.ts'
import { closeAllPopups, setPopups } from '../router.ts'
import { createPage } from './common.ts'
import { injectOpenedFeed } from './mixins/opened-feed.ts'

export type AddLinksValue = Record<
  string,
  | {
      error: 'invalidUrl'
      state: 'invalid'
    }
  | {
      state: 'loading'
    }
  | {
      state: 'processed'
    }
  | {
      state: 'unknown'
    }
  | {
      state: 'unloadable'
    }
>

function isValidDomain(url: string): boolean {
  // Heuristic for https→http check, so we don't need to be 100% accurate
  let parsed = new URL(url)
  return /\w+\.\w\w\w*/.test(parsed.hostname)
}

function normalizeUrl(url: string): string {
  return url.replace(/\/$/, '')
}

function findSimilarUrl(links: AddLinksValue, url: string): string | undefined {
  let normalized = normalizeUrl(url)
  return Object.keys(links).find(i => normalizeUrl(i) === normalized)
}

export const addPage = createPage('add', () => {
  let $url = atom<string | undefined>()

  /**
   * Map of all URLs found in the document with URLs as keys and loading state
   * as values.
   */
  let $links = map<AddLinksValue>({})

  /**
   * List of feed URLs extracted from the given URL so user will decide
   * what to follow
   */
  let $candidates = atom<FeedLoader[]>([])

  let $error = computed(
    $links,
    (links): 'invalidUrl' | 'unloadable' | undefined => {
      let first = Object.keys(links)[0]
      if (typeof first !== 'undefined') {
        let link = links[first]!
        if (link.state === 'invalid') {
          return link.error
        } else if (link.state === 'unloadable') {
          return 'unloadable'
        }
      }
      return undefined
    }
  )

  let openedFeedMixin = injectOpenedFeed()

  let $sortedCandidates = computed($candidates, candidates => {
    return candidates.sort((a, b) => {
      return a.title.localeCompare(b.title)
    })
  })

  let httpsTest = false
  let $searching = computed($links, links => {
    return (
      httpsTest ||
      Object.keys(links).some(url => links[url]!.state === 'loading')
    )
  })

  let $noResults = computed(
    [$searching, $url, $candidates, $error],
    (searching, url, candidates, error) => {
      return !searching && !!url && candidates.length === 0 && !error
    }
  )

  function reset(): void {
    debouncedInput.cancel()
    $links.set({})
    $candidates.set([])
    prevTask?.destroy()
    closeAllPopups()
  }

  let debouncedInput = debounce((value: string) => {
    if (value === '') {
      $url.set(undefined)
    } else {
      $url.set(value)
    }
  }, 500)

  let lastUrl = ''
  function inputUrl(value: string): void {
    lastUrl = value
    debouncedInput(value)
  }

  let prevTask: DownloadTask | undefined
  let prevUrl: string | undefined
  let inited = false
  let unbindUrl = $url.listen(url => {
    lastUrl = url ?? ''
    if (url === prevUrl) return
    prevUrl = url
    if (inited) reset()
    inited = true
    if (!url) return
    prevTask = createDownloadTask({ cache: 'write' })
    addLink(prevTask, url)
    let normalizedUrl = Object.keys($links.get())[0] ?? ''
    prevUrl = normalizedUrl
    $url.set(normalizedUrl)
  })

  /**
   * Extracts links to all known feed types from the HTTP response containing
   * the HTML document.
   */
  function getLinksFromText(response: TextResponse): string[] {
    let names = Object.keys(loaders) as LoaderName[]
    return names.reduce<string[]>((links, name) => {
      return links.concat(loaders[name].getMineLinksFromText(response))
    }, [])
  }

  /** Guess a list of default/fallback links for all feed types */
  function getSuggestedLinksFromText(response: TextResponse): string[] {
    let names = Object.keys(loaders) as LoaderName[]
    return names.reduce<string[]>((links, name) => {
      return links.concat(loaders[name].getSuggestedLinksFromText(response))
    }, [])
  }

  /**
   * Adds a possible feed URL, its meta and type, to the list of possible URLs.
   */
  function addCandidate(url: string, candidate: FeedLoader): void {
    if ($candidates.get().some(i => i.url === url)) return

    $links.setKey(url, { state: 'processed' })
    $candidates.set([...$candidates.get(), candidate])
  }

  /**
   * Given the link to the document, checks every link found in the document
   * for a feed. Populates the list of pending URLs, "candidates".
   * Also accepts a direct feed link.
   */
  async function addLink(
    task: DownloadTask,
    url: string,
    deep = false
  ): Promise<void> {
    url = url.trim()
    if (url === '') return

    let httpsGuest = false
    if (!url.startsWith('https://') && !url.startsWith('http://')) {
      if (/^\w+:/.test(url)) {
        $links.setKey(url, { error: 'invalidUrl', state: 'invalid' })
        return
      } else {
        url = 'https://' + url
        httpsGuest = true
      }
    }

    function unloadable(e: unknown): void {
      if (e instanceof Error) {
        getEnvironment().warn(e)
      }
      if (httpsGuest && isValidDomain(url) && lastUrl === url) {
        httpsTest = true
        $url.set(url.replace(/^https:\/\//, 'http://'))
        httpsTest = false
      } else {
        $links.setKey(url, { state: 'unloadable' })
      }
    }

    if (findSimilarUrl($links.get(), url)) return

    if (!URL.canParse(url)) {
      $links.setKey(url, { error: 'invalidUrl', state: 'invalid' })
      return
    }

    $links.setKey(url, { state: 'loading' })
    try {
      let response
      try {
        response = await task.text(url)
      } catch (e) {
        unloadable(e)
        return
      }
      let byText = getLoaderForText(response)
      if (!deep) {
        let links = getLinksFromText(response)
        if (links.length > 0) {
          await Promise.all(links.map(i => addLink(task, i, true)))
        } else if ($candidates.get().length === 0) {
          let suggested = getSuggestedLinksFromText(response)
          await Promise.all(suggested.map(i => addLink(task, i, true)))
        }
      }
      if (byText) {
        addCandidate(url, byText)
      } else {
        $links.setKey(url, { state: 'unknown' })
      }
    } catch (error) {
      ignoreAbortError(error)
    }
  }

  let unbindSearching = $searching.listen(searching => {
    if (!searching) {
      unbindSearching()
      let found = $sortedCandidates.get()
      if (!isMobile.get() && !openedFeedMixin.opened.get() && found[0]) {
        setPopups([['feed', found[0].url]])
      }
    }
  })

  return {
    ...openedFeedMixin,
    candidates: $sortedCandidates,
    error: $error,
    exit() {
      unbindUrl()
      unbindSearching()
      reset()
    },
    inputUrl,
    noResults: $noResults,
    params: {
      url: $url
    },
    searching: $searching
  }
})

export type AddPage = ReturnType<typeof addPage>
