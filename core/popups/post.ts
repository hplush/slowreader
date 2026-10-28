import lz from 'lz-string'
import {
  atom,
  computed,
  type ReadableAtom,
  type WritableAtom
} from 'nanostores'

import { getUserPostUrls } from '../account.ts'
import { NotFoundError } from '../errors.ts'
import { type FeedValue, loadFeed } from '../feed.ts'
import { formatDuration, formatPublishedAt, i18nFormat } from '../format.ts'
import { createDownloadTask } from '../lib/download.ts'
import { type Loader, loaders } from '../loader/index.ts'
import { postMessages } from '../messages/index.ts'
import {
  changeRead,
  getPost,
  loadPost,
  loadPostByUrl,
  loadThreadPosts,
  type OriginPost,
  type PostValue
} from '../post.ts'
import { loadPreviewThread, loadThreadByUrl, updateThread } from '../thread.ts'
import { type CreatedLoadedPopup, definePopup } from './common.ts'

/**
 * Post with URL is opened by URL to load it from the network,
 * when the post was already deleted from the database.
 */
export function getPostPopupParam(
  post: { feedId: null | string; id: string; url?: null | string } | OriginPost,
  autoread = false
): string {
  if ('feedId' in post) {
    let url = post.url && canOpenPostUrl(post.url) ? post.url : undefined
    if (autoread) {
      return `read:${url ?? post.id}`
    } else {
      return url ?? `id:${post.id}`
    }
  } else {
    return `data:${lz.compressToEncodedURIComponent(JSON.stringify(post))}`
  }
}

function findPostLoader(url: string): Loader | undefined {
  let parsed = URL.parse(url)
  if (!parsed) return undefined
  return Object.values(loaders).find(i => i.isPostUrl?.(parsed))
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
  let read: undefined | WritableAtom<boolean>

  let target = loader.replace(/^read:/, '')
  let stored = await loadPopupPost(loader)

  let task = createDownloadTask()
  // The whole thread from its start, the shown post could be in the middle
  let $parts = atom<(OriginPost | PostValue)[]>([])
  let updating: Promise<(OriginPost | PostValue)[]> | undefined
  let unbindStored = (): void => {}
  if (stored) {
    let $stored = atom<OriginPost | PostValue>(stored)
    unbindStored = getPost(stored.id).subscribe(row => {
      if (row.status === 'ready' && row.value) $stored.set(row.value)
    })
    $post = $stored
  } else if (target.startsWith('https:')) {
    let postLoader = findPostLoader(target)
    if (!postLoader) throw new NotFoundError()
    let $byUrl = atom(
      await postLoader.getPostByUrl!(
        createDownloadTask({ cache: 'read' }),
        target
      )
    )
    updating = loadThreadByUrl(task, postLoader, {
      ...$byUrl.get(),
      url: target
    })
    $post = $byUrl
  } else if (loader.startsWith('data:')) {
    let data = loader.slice(5)
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
    let postLoader = preview.url ? findPostLoader(preview.url) : undefined
    if (postLoader) {
      // Preview has no parts of reposted threads
      updating = loadPreviewThread(task, postLoader, preview.url!).then(
        thread =>
          thread.map(part => (part.url === preview.url ? preview : part))
      )
    }
  } else {
    throw new NotFoundError()
  }

  let unbindPost = (): void => {}
  let unbindRead = (): void => {}
  if (stored && loader.startsWith('read:')) {
    let id = stored.id
    read = atom(false)
    unbindPost = $post.subscribe(value => {
      read!.set('read' in value && value.read)
    })
    unbindRead = read.listen(async value => {
      let current = $post.get()
      if ('read' in current && current.read !== value) {
        await changeRead([id], value)
      }
    })
  }

  let postValue = $post.get()
  if ('feedId' in postValue) {
    let feedValue = postValue.feedId
      ? await loadFeed(postValue.feedId)
      : undefined
    if (feedValue) $feed = atom(feedValue)
    let threadId = postValue.threadId ?? postValue.originId
    if (postValue.threadId) {
      let sourceId = postValue.feedId ?? postValue.accountId!
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
        ...withShown(part, shown),
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
      unbindStored()
      unbindPost()
      unbindRead()
    },
    feed: $feed,
    post: $start,
    publishedAt: $publishedAt,
    read,
    thread: $thread,
    userPostUrl: getUserPostUrls()
  }
})

export type PostPopup = CreatedLoadedPopup<typeof post>
