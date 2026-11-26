import lz from 'lz-string'
import {
  atom,
  computed,
  type ReadableAtom,
  type WritableAtom
} from 'nanostores'

import { getUserPostUrls, loadAccount } from '../account.ts'
import { NotFoundError } from '../errors.ts'
import { type FeedValue, loadFeed } from '../feed.ts'
import { formatDuration, formatPublishedAt, i18nFormat } from '../format.ts'
import {
  canReturnFromLater,
  deleteFromLater,
  getPageAuthor,
  moveToLater,
  returnFromLater,
  saveOriginForLater,
  withoutFeedAuthor
} from '../later.ts'
import { createDownloadTask } from '../lib/download.ts'
import { storeFromQuery, viewOf } from '../lib/stores.ts'
import {
  findPostLoader,
  isLoaderName,
  isWebFeed,
  type Loader,
  type LoaderName,
  loaders
} from '../loader/index.ts'
import { postMessages } from '../messages/index.ts'
import {
  addHandles,
  changeRead,
  getPost,
  loadPost,
  loadPostByUrl,
  loadThreadPosts,
  type OriginPost,
  type PostValue,
  type PreviewPost
} from '../post.ts'
import {
  getPostReaction,
  getReaction,
  loadReactedByUrl,
  type PostReaction,
  type ReactedPost,
  trackInterest
} from '../reactions.ts'
import { closeLastPopup } from '../router.ts'
import { loadPreviewThread, loadThreadByUrl, updateThread } from '../thread.ts'
import { type CreatedLoadedPopup, definePopup } from './common.ts'

/**
 * Post with URL is opened by URL to load it from the network,
 * when the post was already deleted from the database.
 */
export function getPostPopupParam(
  post:
    | { feedId: null | string; id: string; url?: null | string }
    | Pick<PreviewPost, 'loader' | 'origin'>,
  autoread = false
): string {
  if ('origin' in post) {
    let data = lz.compressToEncodedURIComponent(JSON.stringify(post.origin))
    return `data:${post.loader}:${data}`
  } else {
    let url = post.url && canOpenPostUrl(post.url) ? post.url : undefined
    if (autoread) {
      return `read:${url ?? post.id}`
    } else {
      return url ?? `id:${post.id}`
    }
  }
}

export function canOpenPostUrl(url: string): boolean {
  return url.startsWith('https:') && !!findPostLoader(url)
}

export function loadPopupPost(param: string): Promise<PostValue | undefined> {
  let target = param.replace(/^read:/, '')
  if (target.startsWith('https:')) {
    return loadPostByUrl(target)
  } else if (target.startsWith('id:') || target !== param) {
    return loadPost(target.replace(/^id:/, ''))
  } else {
    return Promise.resolve(undefined)
  }
}

/**
 * Reposts from old versions have the repost’s date in `publishedAt`,
 * so the thread start can be after its parts.
 */
function startFirst(posts: PostValue[], threadId: string): PostValue[] {
  return posts.toSorted(
    (a, b) => Number(b.originId === threadId) - Number(a.originId === threadId)
  )
}

export const post = definePopup('post', async loader => {
  let $post: ReadableAtom<OriginPost | PostValue>
  let $feed: ReadableAtom<FeedValue> | undefined
  let service: LoaderName | undefined
  let read: undefined | WritableAtom<boolean>

  let target = loader.replace(/^read:/, '')
  let stored = await loadPopupPost(loader)

  let task = createDownloadTask()
  // The whole thread from its start, the shown post could be in the middle
  let $parts = atom<(OriginPost | PostValue)[]>([])
  let updating: Promise<(OriginPost | PostValue)[]> | undefined
  let reacted: ReactedPost | undefined
  if (stored) {
    $post = storeFromQuery(getPost(stored.id), stored, row => row)
    if (stored.feedId) {
      reacted = { feedId: stored.feedId, id: stored.id, url: stored.url }
      trackInterest(reacted, 'open')
    }
  } else if (target.startsWith('https:')) {
    service = findPostLoader(target)
    if (!service) throw new NotFoundError()
    reacted = await loadReactedByUrl(target)
    let postLoader: Loader = loaders[service]
    let $byUrl = atom(await postLoader.getPostByUrl!(task, target))
    updating = loadThreadByUrl(task, postLoader, {
      ...$byUrl.get(),
      url: target
    })
    $post = $byUrl
  } else if (loader.startsWith('data:')) {
    let [, name = '', data = ''] = loader.split(':')
    if (!isLoaderName(name)) throw new NotFoundError()
    service = name
    let preview: OriginPost
    try {
      preview = JSON.parse(
        lz.decompressFromEncodedURIComponent(data)
      ) as OriginPost
    } catch {
      throw new NotFoundError()
    }
    $post = atom(preview)
    $parts.set([preview, ...(preview.threadParts ?? [])])
    if (preview.url) reacted = await loadReactedByUrl(preview.url)
    let postLoader: Loader = loaders[service]
    if (preview.url && postLoader.getPostByUrl) {
      // Preview has no parts of reposted threads
      updating = loadPreviewThread(task, postLoader, preview.url).then(thread =>
        thread.map(part => (part.url === preview.url ? preview : part))
      )
    }
  } else {
    throw new NotFoundError()
  }

  let unbindPost = (): void => {}
  let unbindRead = (): void => {}
  if (stored && !stored.later && loader.startsWith('read:')) {
    let id = stored.id
    read = atom(false)
    unbindPost = $post.subscribe(value => {
      read!.set('read' in value && value.read > 0)
    })
    unbindRead = read.listen(async value => {
      let current = $post.get()
      if ('read' in current && current.read > 0 !== value) {
        await changeRead([id], value)
      }
    })
  }

  let later: WritableAtom<boolean>
  let $laterLocked: ReadableAtom<boolean>
  let $laterSaving = atom(false)
  function saveLater(job: () => Promise<void>): void {
    $laterSaving.set(true)
    void job().finally(() => {
      $laterSaving.set(false)
    })
  }
  if (stored) {
    let $stored = $post as ReadableAtom<PostValue>
    later = viewOf(
      $stored,
      value => !!value.later,
      value => {
        let current = $stored.get()
        if ($laterSaving.get() || value === !!current.later) return
        saveLater(() => {
          return value ? moveToLater(current) : returnFromLater(current)
        })
      }
    )
    // Post, which was added by a link, has no feed to move back
    $laterLocked = computed($stored, value => {
      return !!value.later && !canReturnFromLater(value)
    })
  } else {
    let $saved = atom(false)
    later = viewOf(
      $saved,
      saved => saved,
      value => {
        if (!value || $saved.get()) return
        $saved.set(true)
        saveLater(() => saveOriginForLater($post.get() as OriginPost))
      }
    )
    $laterLocked = $saved
  }

  let $reaction: ReadableAtom<PostReaction> = reacted
    ? storeFromQuery(getReaction(reacted.id), 'none', getPostReaction)
    : atom('none')

  let postValue = $post.get()
  if ('feedId' in postValue) {
    // Post in Read later keeps its source in the author
    let feedId = postValue.feedId ?? postValue.author?.feedId
    let accountId = postValue.accountId ?? postValue.author?.accountId
    let feedValue = feedId ? await loadFeed(feedId) : undefined
    if (feedValue) $feed = atom(feedValue)
    let account = accountId ? await loadAccount(accountId) : undefined
    service = feedValue?.loader ?? account?.service
    let threadId = postValue.threadId ?? postValue.originId
    let sourceId = feedId ?? accountId
    if (postValue.threadId && sourceId) {
      $parts.set(
        startFirst(await loadThreadPosts(sourceId, threadId), threadId)
      )
    }
    // Refresh could save the reposted thread start without its parts
    if (
      feedValue &&
      (postValue.threadId || (postValue.repostedBy && !postValue.replied))
    ) {
      updating = updateThread(task, feedValue, postValue).then(posts =>
        startFirst(posts, threadId)
      )
    }
  }
  updating
    ?.then(parts => {
      $parts.set(parts)
    })
    // Offline or closed popup still shows saved parts
    .catch(() => {})

  function withShown(
    part: OriginPost | PostValue,
    shown: OriginPost | PostValue
  ): OriginPost | PostValue {
    return part.id === shown.id ? shown : part
  }

  let $start = computed([$parts, $post], (parts, shown) => {
    return withShown(parts[0] ?? shown, shown)
  })

  let $publishedAt = computed([$start, i18nFormat], (value, format) => {
    return value.publishedAt
      ? formatPublishedAt(format, value.publishedAt)
      : undefined
  })

  let $thread = computed(
    [$parts, $post, $start, i18nFormat, postMessages],
    (parts, shown, first, format, t) => {
      function formatAfterFirst(
        part: OriginPost | PostValue
      ): string | undefined {
        // Reposts from old versions have the repost’s date in `publishedAt`
        if (!part.publishedAt || !first.publishedAt) return undefined
        let diff = Math.round(part.publishedAt - first.publishedAt)
        if (diff < 0) return undefined
        if (diff === 0) return t.rightAfter
        return t.afterFirst({ time: formatDuration(format, diff) })
      }
      return parts.slice(1).map(part => ({
        ...addHandles(withShown(part, shown), service),
        afterFirstText: formatAfterFirst(part),
        publishedAtText: part.publishedAt
          ? formatPublishedAt(format, part.publishedAt)
          : undefined
      }))
    }
  )

  return {
    destroy() {
      task.destroy()
      unbindPost()
      unbindRead()
    },
    feed: $feed,
    later,
    laterLocked: $laterLocked,
    laterSaving: $laterSaving,
    loader: service,
    page: computed($post, getPageAuthor),
    post: computed($start, value => {
      let feedRow = $feed || getPageAuthor(value)
      return addHandles(feedRow ? withoutFeedAuthor(value) : value, service)
    }),
    publishedAt: $publishedAt,
    reacted,
    reaction: $reaction,
    read,
    async remove() {
      let current = $post.get() as PostValue
      closeLastPopup()
      await deleteFromLater(current)
    },
    thread: $thread,
    userPostUrl: getUserPostUrls(),
    whole: !!service && !isWebFeed(service)
  }
})

export type PostPopup = CreatedLoadedPopup<typeof post>
