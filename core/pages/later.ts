import { atom, effect } from 'nanostores'

import { getUserPostUrls } from '../account.ts'
import { getEnvironment } from '../environment.ts'
import { UserFacingError } from '../errors.ts'
import { humanizeUrl } from '../format.ts'
import { createLaterAdding, loadLaterPosts } from '../later.ts'
import { hasPersonAvatar } from '../loader/index.ts'
import { laterMessages } from '../messages/index.ts'
import type { ReaderPost } from '../post.ts'
import type { FeedAuthor } from '../readers/common.ts'
import { openedDatabase } from '../schema.ts'
import { createPage } from './common.ts'

function toFeedAuthor(post: ReaderPost): FeedAuthor | undefined {
  let author = post.author
  if (!author?.loader) return undefined
  let loader = author.loader === 'page' ? undefined : author.loader
  return {
    avatar: author.avatar ?? null,
    feedId: author.feedId ?? post.id,
    handle: humanizeUrl(author.url ?? '', loader),
    page: author.loader === 'page',
    round: hasPersonAvatar(loader),
    title: author.title,
    url: author.url ?? ''
  }
}

async function readClipboard(): Promise<string> {
  let text = await getEnvironment().clipboard.read()
  if (text === undefined) {
    throw new UserFacingError(laterMessages.get().noClipboard)
  }
  return text
}

/**
 * Post, which keeps its feed or site in the author, shows it like
 * the category reader.
 */
export const laterPage = createPage('later', () => {
  let $loading = atom(true)
  let $authors = atom<ReadonlyMap<string, FeedAuthor>>(new Map())
  let $posts = atom<ReaderPost[]>([])
  let adding = createLaterAdding()

  let unbind = effect(openedDatabase, db => {
    if (!db) return
    return loadLaterPosts().subscribe(posts => {
      if (!posts) return
      let authors = new Map<string, FeedAuthor>()
      $posts.set(
        posts.map(post => {
          let feedAuthor = toFeedAuthor(post)
          if (!feedAuthor) return post
          authors.set(feedAuthor.feedId, feedAuthor)
          return {
            ...post,
            author: null,
            feedId: feedAuthor.page ? null : feedAuthor.feedId
          }
        })
      )
      $authors.set(authors)
      $loading.set(false)
    })
  })

  return {
    async addFromClipboard() {
      await adding.add(readClipboard())
    },
    added: adding.added,
    adding: adding.adding,
    already: adding.already,
    authors: $authors,
    exit() {
      unbind()
      adding.destroy()
    },
    failure: adding.failure,
    loading: $loading,
    params: {},
    pasteable: getEnvironment().clipboard.readable,
    posts: $posts,
    userPostUrl: getUserPostUrls()
  }
})

export type LaterPage = ReturnType<typeof laterPage>
