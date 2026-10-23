import debounce from 'just-debounce-it'
import { atom, computed, map, onMount } from 'nanostores'

import { getEnvironment, layoutType } from '../environment.ts'
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
  loaders,
  tryLoadFeedData
} from '../loader/index.ts'
import { navigate, setPopups } from '../router.ts'
import { createPage, routeParam } from './common.ts'
import { injectOpenedFeed } from './mixins/opened-feed.ts'

function nowOrLater<Value>(
  action: (value: Value) => void,
  ms: number
): { cancel(): void; later(value: Value): void; now(value: Value): void } {
  let delayed = debounce(action, ms)
  return {
    cancel() {
      delayed.cancel()
    },
    later: delayed,
    now(value) {
      delayed.cancel()
      action(value)
    }
  }
}

export type AddLinksValue = Record<
  string,
  | {
      error: 'invalidUrl' | 'unknownHandle'
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

function toLinkKey(url: string): string {
  return normalizeUrl(url.replace(/^https?:\/\//, 'https://'))
}

function findSimilarUrl(links: AddLinksValue, url: string): string | undefined {
  let normalized = normalizeUrl(url)
  return Object.keys(links).find(i => normalizeUrl(i) === normalized)
}

export const addPage = createPage('add', () => {
  let $url = routeParam('add', 'url')

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
    (links): 'invalidUrl' | 'unknownHandle' | 'unloadable' | undefined => {
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

  /**
   * Keys of feeds which other candidates replace with more data
   */
  let $worse = atom<string[]>([])

  let $sortedCandidates = computed(
    [$candidates, $worse],
    (candidates, worse) => {
      return candidates
        .filter(i => !worse.includes(toLinkKey(i.url)))
        .toSorted((a, b) => a.title.localeCompare(b.title))
    }
  )

  let $avatars = map<Record<string, string>>({})
  onMount($avatars, () => {
    return $sortedCandidates.subscribe(candidates => {
      let task = prevTask
      if (!task) return
      for (let { name, url } of candidates) {
        if (url in $avatars.get()) continue
        $avatars.setKey(url, '')
        void tryLoadFeedData(task, name, url).then(data => {
          if (data?.avatar && task === prevTask) {
            $avatars.setKey(url, data.avatar)
          }
        })
      }
    })
  })

  let $mixed = computed($sortedCandidates, candidates => {
    return new Set(candidates.map(i => i.name)).size > 1
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
    urlSearch.cancel()
    $links.set({})
    $worse.set([])
    $candidates.set([])
    $avatars.set({})
    prevTask?.destroy()
  }

  function openUrl(url: string, replace: boolean, closePopups: boolean): void {
    navigate(
      route =>
        route.route === 'add'
          ? {
              params: { url },
              popups: closePopups ? [] : route.popups,
              route: 'add'
            }
          : route,
      replace
    )
  }

  let urlSearch = nowOrLater((url: string) => {
    openUrl(url, false, true)
  }, 500)

  let lastUrl = ''
  function inputUrl(value: string): void {
    lastUrl = value
    urlSearch.later(value)
  }

  let prevTask: DownloadTask | undefined
  let searched: string | undefined
  let unbindUrl = $url.subscribe(url => {
    lastUrl = url ?? ''
    // Skips the URL normalization below
    if (url === searched) return
    reset()
    searched = url
    if (!url) return
    prevTask = createDownloadTask({ cache: 'write' })
    void addLink(prevTask, url)
    searched = Object.keys($links.get())[0] ?? ''
    if (searched !== url) openUrl(searched, true, false)
  })

  /**
   * Removes duplicated feed links differing only by protocol.
   */
  function dedupeLinks(links: string[]): string[] {
    let seen = new Set<string>()
    return links.filter(link => {
      let key = toLinkKey(link)
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }

  /**
   * Extracts links to all known feed types from the HTTP response containing
   * the HTML document.
   */
  function getLinksFromText(response: TextResponse): string[] {
    let names = Object.keys(loaders) as LoaderName[]
    return dedupeLinks(
      names.reduce<string[]>((links, name) => {
        /* node:coverage ignore next 5 */
        try {
          return links.concat(loaders[name].getMineLinksFromText(response))
        } catch {
          return links
        }
      }, [])
    )
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

    if (url.startsWith('@')) {
      await addHandle(task, url)
      return
    }

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
      getEnvironment().warn(e)
      if (httpsGuest && isValidDomain(url) && lastUrl === url) {
        httpsTest = true
        openUrl(url.replace(/^https:\/\//, 'http://'), true, false)
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
      let byText = await getLoaderForText(response, task, url)
      if (byText) {
        let worse = byText.loader.getWorseLinksFromText?.(response) ?? []
        $worse.set([...$worse.get(), ...worse.map(toLinkKey)])
      }
      if (!deep) {
        let links = getLinksFromText(response).filter(
          i => !$worse.get().includes(toLinkKey(i))
        )
        if (links.length > 0) {
          await Promise.all(links.map(i => addLink(task, i, true)))
        } else if (!byText && $candidates.get().length === 0) {
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

  async function addHandle(task: DownloadTask, handle: string): Promise<void> {
    $links.setKey(handle, { state: 'loading' })
    let names = Object.keys(loaders) as LoaderName[]
    let profiles = await Promise.all(
      names.map(name => {
        return (
          loaders[name].getProfilesByHandle?.(task, handle) ??
          Promise.resolve([])
        )
      })
    )
    if (task !== prevTask) return
    let links = profiles.flat()
    if (links.length === 0) {
      $links.setKey(handle, { error: 'unknownHandle', state: 'invalid' })
    } else {
      await Promise.all(links.map(i => addLink(task, i)))
      if (task === prevTask) $links.setKey(handle, { state: 'processed' })
    }
  }

  let unbindSearching = $searching.listen(searching => {
    if (!searching) {
      unbindSearching()
      let found = $sortedCandidates.get()
      if (
        layoutType.get() !== 'mobile' &&
        !openedFeedMixin.opened.get() &&
        found[0]
      ) {
        setPopups([['feed', found[0].url]])
      }
    }
  })

  return {
    ...openedFeedMixin,
    avatars: $avatars,
    candidates: $sortedCandidates,
    mixed: $mixed,
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
    search: urlSearch.now,
    searching: $searching
  }
})

export type AddPage = ReturnType<typeof addPage>
