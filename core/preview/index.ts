import {
  atom,
  computed,
  map,
  onMount,
  onStop,
  type ReadableAtom
} from 'nanostores'

import {
  createDownloadTask,
  ignoreAbortError,
  type TextResponse
} from '../download/index.js'
import { hasFeedStore } from '../feed/index.js'
import { type LoaderName, loaders } from '../loader/index.js'
import type { Post } from '../post/index.js'

const ALWAYS_HTTPS = [/^twitter\.com\//]

export type PreviewLinksValue = Record<
  string,
  | {
      error: 'emptyUrl' | 'invalidUrl'
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

let $links = map<PreviewLinksValue>({})

onStop($links, () => {
  clearPreview()
})

export const previewUrlError = computed($links, links => {
  let first = Object.keys(links)[0]
  if (typeof first !== 'undefined') {
    let link = links[first]
    if (link.state === 'invalid') {
      return link.error
    } else if (link.state === 'unloadable') {
      return 'unloadable'
    }
  }
  return undefined
})

export const previewCandidatesLoading = computed($links, links => {
  return Object.keys(links).some(url => links[url].state === 'loading')
})

export interface PreviewCandidate {
  loader: LoaderName
  text?: TextResponse
  title: string
  url: string
}

let $candidates = atom<PreviewCandidate[]>([])

function addCandidate(url: string, candidate: PreviewCandidate): void {
  $links.setKey(url, { state: 'processed' })
  $candidates.set([...$candidates.get(), candidate])
  if ($candidates.get().length === 1) {
    setPreviewCandidate(url)
  }
}

onMount($candidates, () => {
  return $links.listen(() => {})
})

export const previewCandidates: ReadableAtom<PreviewCandidate[]> = $candidates

function getLoaderForUrl(url: string): false | PreviewCandidate {
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

function getLoaderForText(response: TextResponse): false | PreviewCandidate {
  let names = Object.keys(loaders) as LoaderName[]
  let parsed = new URL(response.url)
  for (let name of names) {
    if (loaders[name].isMineUrl(parsed) !== false) {
      let title = loaders[name].isMineText(response)
      if (title !== false) {
        return { loader: name, text: response, title, url: response.url }
      }
    }
  }
  return false
}

function getLinksFromText(response: TextResponse): string[] {
  let names = Object.keys(loaders) as LoaderName[]
  return names.reduce<string[]>((links, name) => {
    return links.concat(
      loaders[name].getMineLinksFromText(response, $candidates.get())
    )
  }, [])
}

let task = createDownloadTask()

export async function addLink(url: string, deep = false): Promise<void> {
  url = url.trim()
  if (url === '') {
    $links.setKey(url, { error: 'emptyUrl', state: 'invalid' })
    return
  }

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

  try {
    new URL(url)
  } catch {
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
      let response = await task.text(url)

      if (!response.ok) {
        $links.setKey(url, { state: 'unloadable' })
      } else {
        let byText = getLoaderForText(response)
        if (byText !== false) {
          addCandidate(url, byText)
        } else {
          $links.setKey(url, { state: 'unknown' })
        }
        if (!deep) {
          let links = getLinksFromText(response)
          await Promise.all(links.map(i => addLink(i, true)))
        }
      }
    } catch (error) {
      ignoreAbortError(error)
    }
  }
}

let $candidate = atom<string | undefined>()

export const previewCandidate: ReadableAtom<string | undefined> = $candidate

let $added = atom<boolean | undefined>(false)

export const previewAdded: ReadableAtom<boolean | undefined> = $added

let postsCache = new Map<string, Post[]>()

let $posts = atom<Post[]>([])

export const previewPosts: ReadableAtom<Post[]> = $posts

let $postsLoading = atom(false)

export const previewPostsLoading: ReadableAtom<boolean> = $postsLoading

let prevHasUnbind: (() => void) | undefined

export function clearPreview(): void {
  prevHasUnbind?.()
  $links.set({})
  $candidates.set([])
  $candidate.set(undefined)
  $added.set(undefined)
  $posts.set([])
  $postsLoading.set(false)
  postsCache.clear()
  task.abortAll()
  task = createDownloadTask()
}

export async function setPreviewUrl(dirty: string): Promise<void> {
  clearPreview()
  await addLink(dirty)
}

export async function setPreviewCandidate(url: string): Promise<void> {
  let candidate = $candidates.get().find(i => i.url === url)
  if (candidate) {
    $candidate.set(url)

    $added.set(undefined)
    prevHasUnbind?.()
    prevHasUnbind = hasFeedStore(url).subscribe(hasFeed => {
      $added.set(hasFeed)
    })

    if (postsCache.has(url)) {
      $posts.set(postsCache.get(url)!)
      $postsLoading.set(false)
    } else {
      $posts.set([])
      $postsLoading.set(true)
      try {
        let posts = await loaders[candidate.loader].getPosts(
          task,
          url,
          candidate.text
        )
        if ($candidate.get() === url) {
          $posts.set(posts)
          $postsLoading.set(false)
          postsCache.set(url, posts)
        }
      } catch (error) {
        ignoreAbortError(error)
      }
    }
  }
}
