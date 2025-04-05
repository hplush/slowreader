import debounce from 'just-debounce-it'
import { atom, computed, map } from 'nanostores'

import {
  createDownloadTask,
  type DownloadTask,
  ignoreAbortError,
  type TextResponse
} from '../download.ts'
import { getEnvironment } from '../environment.ts'
import {
  type FeedLoader,
  getLoaderForText,
  type LoaderName,
  loaders
} from '../loader/index.ts'
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

  let $candidatesLoading = computed($links, links => {
    return Object.keys(links).some(url => links[url]!.state === 'loading')
  })

  let $noResults = computed(
    [$candidatesLoading, $url, $candidates, $error],
    (loading, url, candidates, error) => {
      return !loading && !!url && candidates.length === 0 && !error
    }
  )

  function exit(): void {
    $links.set({})
    $candidates.set([])
    prevTask?.destroy()
  }

  let inputUrl = debounce((value: string) => {
    if (value === '') {
      exit()
    } else {
      //TODO: currentCandidate.set(undefined)
      setUrl(value)
    }
  }, 500)

  let prevTask: DownloadTask | undefined
  async function setUrl(url: string): Promise<void> {
    if (prevTask) prevTask.destroy()
    if (url === $url.get()) return
    inputUrl.cancel()
    exit()
    prevTask = createDownloadTask({ cache: 'write' })
    await addLink(prevTask, url)
  }

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

    async function unloadable(e: unknown): Promise<void> {
      if (e instanceof Error) {
        getEnvironment().warn(e)
      }
      $links.setKey(url, { state: 'unloadable' })
      if (httpsGuest) {
        await setUrl(url.replace('https://', 'http://'))
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
        await unloadable(e)
        return
      }
      if (!response.ok) {
        await unloadable(new Error(`${url}: ${response.status}`))
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

  $links.listen(links => {
    $url.set(Object.keys(links)[0] ?? undefined)
  })

  return {
    candidate: atom<string | undefined>(), // TODO: Remove to popups
    candidatesLoading: $candidatesLoading,
    error: $error,
    exit,
    inputUrl,
    noResults: $noResults,
    setUrl,
    sortedCandidates: $sortedCandidates,
    url: $url
  }
})

export type AddPage = typeof add
