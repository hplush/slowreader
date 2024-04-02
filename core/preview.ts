import { loadValue } from '@logux/client'
import debounce from 'just-debounce-it'
import { atom, computed, map, onMount } from 'nanostores'

import {
  createDownloadTask,
  ignoreAbortError,
  type TextResponse
} from './download.js'
import { onEnvironment } from './environment.js'
import { addFeed, getFeeds } from './feed.js'
import { readonlyExport } from './lib/stores.js'
import { type LoaderName, loaders } from './loader/index.js'
import type { PostsPage } from './posts-page.js'
import { router } from './router.js'

const ALWAYS_HTTPS = [/^twitter\.com\//]

export type PreviewLinksValue = Record<
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

export interface PreviewCandidate {
  loader: LoaderName
  text?: TextResponse
  title: string
  url: string
}

let $links = map<PreviewLinksValue>({})

export const previewUrl = computed($links, links => Object.keys(links)[0] ?? '')

export const previewUrlError = computed<
  'invalidUrl' | 'unloadable' | undefined,
  typeof $links
>($links, links => {
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
})

export const previewCandidatesLoading = computed($links, links => {
  return Object.keys(links).some(url => links[url]!.state === 'loading')
})

let $candidates = atom<PreviewCandidate[]>([])
export const previewCandidates = computed($candidates, candidates => {
  return candidates.sort((a, b) => {
    return a.title.localeCompare(b.title)
  })
})

onMount($candidates, () => {
  return $links.listen(() => {})
})

let $candidate = atom<string | undefined>()
export const previewCandidate = readonlyExport($candidate)

let $added = atom<false | string | undefined>(false)
export const previewCandidateAdded = readonlyExport($added)

let $posts = atom<PostsPage | undefined>()
export const previewPosts = readonlyExport($posts)

export const previewNoResults = computed(
  [previewCandidatesLoading, previewUrl, $candidates, previewUrlError],
  (loading, url, candidates, error) => {
    return !loading && !!url && candidates.length === 0 && !error
  }
)

let prevHasUnbind: (() => void) | undefined

let postsCache = new Map<string, PostsPage>()

export function clearPreview(): void {
  prevHasUnbind?.()
  $links.set({})
  $candidates.set([])
  $candidate.set(undefined)
  $added.set(undefined)
  $posts.set(undefined)
  postsCache.clear()
  task.abortAll()
  task = createDownloadTask()
}

function addCandidate(url: string, candidate: PreviewCandidate): void {
  $links.setKey(url, { state: 'processed' })
  $candidates.set([...$candidates.get(), candidate])
  if ($candidates.get().length === 1) {
    setPreviewCandidate(url)
  }
}

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

export function getLoaderForText(
  response: TextResponse
): false | PreviewCandidate {
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
    return links.concat(
      loaders[name].getMineLinksFromText(response, $candidates.get())
    )
  }, [])
}

let task = createDownloadTask()

export async function addLink(url: string, deep = false): Promise<void> {
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

export async function setPreviewUrl(url: string): Promise<void> {
  if (url === previewUrl.get()) return
  onPreviewUrlType.cancel()
  clearPreview()
  await addLink(url)
}

export const onPreviewUrlType = debounce((value: string) => {
  if (value === '') {
    clearPreview()
  } else {
    setPreviewUrl(value)
  }
}, 500)

export async function setPreviewCandidate(url: string): Promise<void> {
  let candidate = $candidates.get().find(i => i.url === url)
  if (candidate) {
    $candidate.set(url)

    $added.set(undefined)
    prevHasUnbind?.()

    prevHasUnbind = getFeeds({ url }).subscribe(feeds => {
      if (feeds.isLoading) {
        $added.set(undefined)
      } else if (feeds.isEmpty) {
        $added.set(false)
      } else {
        $added.set(feeds.list[0]!.id)
      }
    })

    if (postsCache.has(url)) {
      $posts.set(postsCache.get(url))
    } else {
      let posts = loaders[candidate.loader].getPosts(task, url, candidate.text)
      $posts.set(posts)
      postsCache.set(url, posts)
    }
  }
}

export async function addPreviewCandidate(): Promise<void> {
  let url = $candidate.get()
  if (url) {
    let page = await loadValue($posts.get()!)
    let lastPost = page.list[0]
    let candidate = $candidates.get().find(i => i.url === url)!
    await addFeed({
      categoryId: 'general',
      lastOriginId: lastPost?.originId,
      lastPublishedAt: lastPost?.publishedAt ?? Date.now() / 1000,
      loader: candidate.loader,
      reading: 'fast',
      title: candidate.title,
      url
    })
  }
}

let inPreview = false

onEnvironment(({ openRoute }) => {
  return [
    previewUrl.listen(link => {
      let page = router.get()
      if (page.route === 'add' && page.params.url !== link) {
        openRoute({ params: { url: link }, route: 'add' })
      }
    }),
    router.listen(({ params, route }) => {
      if (route === 'add' && params.url !== previewUrl.get()) {
        setPreviewUrl(params.url ?? '')
      }
      if (route === 'add') {
        inPreview = true
      } else if (inPreview) {
        inPreview = false
        clearPreview()
      }
    })
  ]
})
