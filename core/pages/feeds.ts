import { atom, computed, effect } from 'nanostores'

import { type CategoryValue, changeCategory, getCategory } from '../category.ts'
import { changeFeed, type FeedValue, getFeed, needWelcome } from '../feed.ts'
import { fastMenu, menuLoading, slowMenu } from '../menu.ts'
import { deletePost, fastPostsCount, slowPostsCount } from '../post.ts'
import {
  loadReadPostIds,
  type PostFilter,
  type ReaderHelpers,
  type UsefulReaderName
} from '../readers/common.ts'
import {
  type BaseReader,
  emptyReader,
  feedReader,
  listReader,
  type Reader,
  type ReaderCreator,
  type ReaderName,
  welcomeReader
} from '../readers/index.ts'
import { nextRouteIsRedirect } from '../router.ts'
import { hasDatabase } from '../schema.ts'
import { createPage } from './common.ts'

const READERS: { [Name in ReaderName]: ReaderCreator } = {
  empty: emptyReader,
  feed: feedReader,
  list: listReader,
  welcome: welcomeReader
}

let pages = (['slow', 'fast'] as const).map(reading => {
  return createPage(reading, () => {
    let $categoryId = atom<string | undefined>()
    let $feedId = atom<string | undefined>()
    let $from = atom<number | undefined>()
    let $loading = atom(true)
    let $postsLoading = atom(true)
    let $posts = atom<Reader | undefined>()
    let $feed = atom<FeedValue | undefined>()
    let $category = atom<CategoryValue | undefined>()

    let lastFilter: PostFilter | undefined

    async function deleteRead(): Promise<void> {
      if (!lastFilter || !hasDatabase()) return
      let posts = await loadReadPostIds(lastFilter)
      if (hasDatabase()) await deletePost(posts)
    }

    let prevLoadingUnbind = (): void => {}
    let prevReading: BaseReader | undefined
    function setReader(reader: Reader | undefined): void {
      prevLoadingUnbind()
      if (reader) {
        prevLoadingUnbind = reader.loading.subscribe(value => {
          $postsLoading.set(value)
          if (!value) $loading.set(false)
        })
      } else {
        prevLoadingUnbind = () => {}
        $postsLoading.set(true)
      }

      prevReading?.exit()
      prevReading = reader
      $posts.set(reader)
    }

    let helpers: ReaderHelpers = {
      renderEmpty() {
        setReader(emptyReader({ reading }, params, helpers))
      }
    }

    let params = {
      category: $categoryId,
      feed: $feedId,
      from: $from
    }

    let unbindTarget = (): void => {}
    let unbindRedirect = effect(
      [$categoryId, $feedId],
      (categoryId, feedId) => {
        unbindTarget()
        $category.set(undefined)
        $feed.set(undefined)
        if (feedId) {
          unbindTarget = getFeed(feedId).subscribe(value => {
            if (value) $feed.set(value)
          })
        } else if (categoryId) {
          unbindTarget = getCategory(categoryId).subscribe(value => {
            if (value) $category.set(value)
          })
        } else if (!menuLoading.get()) {
          void nextRouteIsRedirect(() => {
            if (reading === 'fast') {
              let id = fastMenu.get()[0]?.id
              if (id) $categoryId.set(id)
            } else {
              let id = slowMenu.get()[0]?.[1][0]?.[0]?.id
              if (id) $feedId.set(id)
            }
          })
        }
      }
    )

    let readerProp =
      reading === 'fast' ? ('fastReader' as const) : ('slowReader' as const)

    // Only the emptiness matters here, while the count changes on every added
    // or deleted post. Without it every post of the refresh would re-create
    // the reader.
    let $noPosts = computed(
      reading === 'fast' ? fastPostsCount : slowPostsCount,
      count => count === 0
    )

    // The feed’s row changes on every refresh mark and on every action from
    // another tab or device, while the reader depends only on the target
    // and on the reader’s name.
    let lastKey: string | undefined

    let unbindPosts = effect(
      [$feed, $category, needWelcome, $noPosts],
      (feed, category, welcome, noPosts) => {
        let readerName: 'none' | ReaderName
        if (welcome) {
          readerName = 'welcome'
        } else if (noPosts) {
          readerName = 'empty'
        } else if (!feed && !category) {
          readerName = 'none'
        } else {
          readerName =
            feed?.[readerProp] ??
            category?.[readerProp] ??
            (reading === 'fast' ? 'feed' : 'list')
        }

        let filter: PostFilter
        if (category) {
          filter = { categoryId: category.id, reading }
        } else if (feed) {
          filter = { feedId: feed.id, reading }
        } else {
          filter = { reading }
        }

        let key = `${readerName} ${filter.categoryId ?? ''} ${filter.feedId ?? ''}`
        if (key === lastKey) return
        lastKey = key

        if (JSON.stringify(filter) !== JSON.stringify(lastFilter)) {
          lastFilter = filter
          void deleteRead()
        }

        let instance: BaseReader | undefined
        if (readerName !== 'none') {
          instance = READERS[readerName](filter, params, helpers)
        }

        setReader(instance as Reader)
      }
    )

    async function changeReader(reader: UsefulReaderName): Promise<void> {
      let feedId = $feedId.get()
      let categoryId = $categoryId.get()
      $from.set(undefined)
      if (feedId) {
        await changeFeed(feedId, { [readerProp]: reader })
      } else if (categoryId) {
        await changeCategory(categoryId, { [readerProp]: reader })
      }
    }

    return {
      category: $category,
      changeReader,
      async exit() {
        unbindTarget()
        unbindRedirect()
        unbindPosts()
        prevReading?.exit()
        prevLoadingUnbind()
        await deleteRead()
      },
      feed: $feed,
      loading: $loading,
      params,
      posts: $posts,
      postsLoading: $postsLoading,
      reading
    }
  })
})

export const slowPage = pages[0]!
export const fastPage = pages[1]!

export type FeedsPage = ReturnType<typeof fastPage>
