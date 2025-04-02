import debounce from 'just-debounce-it'
import { atom, computed, map } from 'nanostores'

import {
  createDownloadTask,
  type DownloadTask,
  ignoreAbortError,
  type TextResponse
} from '../download.ts'
import { type LoaderName, loaders } from '../loader/index.ts'
import { createPage } from './common.ts'

const ALWAYS_HTTPS = [/^twitter\.com\//]

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

export interface AddCandidate {
  loader: LoaderName
  text?: TextResponse
  title: string
  url: string
}

export const add = createPage('add', () => {
  let $url = atom<string | undefined>()

  let $links = map<AddLinksValue>({})

  let $candidates = atom<AddCandidate[]>([])

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

  function destroy(): void {
    $links.set({})
    $candidates.set([])
    prevTask?.abortAll()
  }

  let inputUrl = debounce((value: string) => {
    if (value === '') {
      destroy()
    } else {
      //TODO: currentCandidate.set(undefined)
      setUrl(value)
    }
  }, 500)

  let prevTask: DownloadTask | undefined
  async function setUrl(url: string): Promise<void> {
    if (prevTask) prevTask.abortAll()
    if (url === $url.get()) return
    inputUrl.cancel()
    destroy()
    prevTask = createDownloadTask()
    await addLink(prevTask, url)
  }

  function getLoaderForUrl(url: string): AddCandidate | false {
    let names = Object.keys(loaders) as LoaderName[]
    let parsed = new URL(url)
    for (let name of names) {
      let title = loaders[name].isMineUrl(parsed)
      // Until we will have loader for specific domain
      /* c8 ignore start */
      if (typeof title === 'string') {
        return { loader: name, title, url }
      }
      /* c8 ignore end */
    }
    return false
  }

  function getLoaderForText(response: TextResponse): AddCandidate | false {
    let names = Object.keys(loaders) as LoaderName[]
    let parsed = new URL(response.url)
    for (let name of names) {
      if (loaders[name].isMineUrl(parsed) !== false) {
        let title = loaders[name].isMineText(response)
        if (title !== false) {
          return {
            loader: name,
            text: response,
            title: title.trim(),
            url: response.url
          }
        }
      }
    }
    return false
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

  function addCandidate(url: string, candidate: AddCandidate): void {
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

    if (url.startsWith('http://')) {
      let methodLess = url.slice('http://'.length)
      if (ALWAYS_HTTPS.some(i => i.test(methodLess))) {
        url = 'https://' + methodLess
      }
    } else if (!url.startsWith('https://')) {
      if (/^\w+:/.test(url)) {
        $links.setKey(url, { error: 'invalidUrl', state: 'invalid' })
        return
      } else if (ALWAYS_HTTPS.some(i => i.test(url))) {
        url = 'https://' + url
      } else {
        url = 'http://' + url
      }
    }

    if ($links.get()[url]) return

    if (!URL.canParse(url)) {
      $links.setKey(url, { error: 'invalidUrl', state: 'invalid' })
      return
    }

    let byUrl = getLoaderForUrl(url)

    if (byUrl !== false) {
      // Until we will have loader for specific domain
      /* c8 ignore next */

      addCandidate(url, byUrl)
    } else {
      $links.setKey(url, { state: 'loading' })
      try {
        let response
        try {
          response = await task.text(url)
        } catch {
          $links.setKey(url, { state: 'unloadable' })
          return
        }
        if (!response.ok) {
          $links.setKey(url, { state: 'unloadable' })
        } else {
          let byText = getLoaderForText(response)
          if (byText) {
            addCandidate(url, byText)
          } else {
            $links.setKey(url, { state: 'unknown' })
          }
          if (!deep) {
            let links = getLinksFromText(response)
            if (links.length > 0) {
              await Promise.all(links.map(i => addLink(task, i, true)))
            } else if ($candidates.get().length === 0) {
              let suggested = getSuggestedLinksFromText(response)
              await Promise.all(suggested.map(i => addLink(task, i, true)))
            }
          }
        }
      } catch (error) {
        ignoreAbortError(error)
      }
    }
  }

  $links.listen(links => {
    $url.set(Object.keys(links)[0] ?? undefined)
  })

  return {
    candidate: atom<string | undefined>(), // TODO: Remove to popups
    candidatesLoading: $candidatesLoading,
    destroy,
    error: $error,
    inputUrl,
    noResults: $noResults,
    setUrl,
    sortedCandidates: $sortedCandidates,
    url: $url
  }
})

export type AddPage = typeof add
