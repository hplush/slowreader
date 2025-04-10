import debounce from 'just-debounce-it'
import { atom, computed, map } from 'nanostores'

import {
  createDownloadTask,
  type DownloadTask,
  ignoreAbortError,
  type TextResponse
} from '../download.ts'
import { getEnvironment, isMobile } from '../environment.ts'
import {
  type FeedLoader,
  getLoaderForText,
  type LoaderName,
  loaders
} from '../loader/index.ts'
import { closeAllPopups, openPopup, router } from '../router.ts'
import { createPage } from './common.ts'

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

export const add = createPage('add', () => {
  let $url = atom<string | undefined>()

  let $links = map<AddLinksValue>({})

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
    inputUrl.cancel()
    $links.set({})
    $candidates.set([])
    prevTask?.destroy()
    closeAllPopups()
  }

  let inputUrl = debounce((value: string) => {
    if (value === '') {
      $url.set(undefined)
    } else {
      $url.set(value)
    }
  }, 500)

  let prevTask: DownloadTask | undefined
  let prevUrl: string | undefined
  let unbindUrl = $url.listen(url => {
    if (url === prevUrl) return
    prevUrl = url
    reset()
    if (!url) return
    prevTask = createDownloadTask({ cache: 'write' })
    addLink(prevTask, url)
    let normalizedUrl = Object.keys($links.get())[0] ?? ''
    prevUrl = normalizedUrl
    $url.set(normalizedUrl)
  })

  function getLinksFromText(response: TextResponse): string[] {
    let names = Object.keys(loaders) as LoaderName[]
    return names.reduce<string[]>((links, name) => {
      return links.concat(loaders[name].getMineLinksFromText(response))
    }, [])
  }

  function getSuggestedLinksFromText(response: TextResponse): string[] {
    let names = Object.keys(loaders) as LoaderName[]
    return names.reduce<string[]>((links, name) => {
      return links.concat(loaders[name].getSuggestedLinksFromText(response))
    }, [])
  }

  function addCandidate(url: string, candidate: FeedLoader): void {
    if ($candidates.get().some(i => i.url === url)) return

    $links.setKey(url, { state: 'processed' })
    $candidates.set([...$candidates.get(), candidate])
  }

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
      if (httpsGuest) {
        httpsTest = true
        $url.set(url.replace(/^https:\/\//, 'http://'))
        httpsTest = false
      } else {
        $links.setKey(url, { state: 'unloadable' })
      }
    }

    if ($links.get()[url]) return

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
        /* c8 ignore next 3 */
        unloadable(e)
        return
      }
      if (!response.ok) {
        unloadable(new Error(`${url}: ${response.status}`))
      } else {
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
      }
    } catch (error) {
      /* c8 ignore next 2 */
      ignoreAbortError(error)
    }
  }

  let unbindCandidates = $candidates.listen(candidates => {
    if (candidates[0] && !isMobile.get()) {
      let url = candidates[0].url
      let popups = router.get().popups
      if (!popups.some(i => i.popup === 'feedUrl' && i.param === url)) {
        openPopup('feedUrl', url)
      }
    }
  })

  return {
    candidates: $sortedCandidates,
    error: $error,
    exit() {
      unbindUrl()
      unbindCandidates()
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

export type AddPage = ReturnType<typeof add>
