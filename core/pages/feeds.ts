import { atom, effect } from 'nanostores'

import { type CategoryValue, changeCategory, getCategory } from '../category.ts'
import { changeFeed, type FeedValue, getFeed, needWelcome } from '../feed.ts'
import { fastMenu, menuLoading, slowMenu } from '../menu.ts'
import { fastPostsCount, slowPostsCount } from '../post.ts'
import type { UsefulReaderName } from '../readers/common.ts'
import {
  type BaseReader,
  emptyReader,
  feedReader,
  listReader,
  type Reader,
  type ReaderCreator,
  welcomeReader
} from '../readers/index.ts'
import { nextRouteIsRedirect } from '../router.ts'
import { createPage } from './common.ts'

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
            if (!value.isLoading) $feed.set(value)
          })
        } else if (categoryId) {
          unbindTarget = getCategory(categoryId).subscribe(value => {
            if (!value.isLoading) $category.set(value)
          })
        } else if (!menuLoading.get()) {
          nextRouteIsRedirect(() => {
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

    let prevLoadingUnbind = (): void => {}
    let prevReading: BaseReader | undefined
    let unbindPosts = effect(
      [$feed, $category, needWelcome, fastPostsCount, slowPostsCount],
      (feed, category, welcome, fastCount, slowCount) => {
        let readerBuilder: ReaderCreator | undefined
        if (welcome) {
          readerBuilder = welcomeReader
        } else if (
          (reading === 'fast' && fastCount === 0) ||
          (reading === 'slow' && slowCount === 0)
        ) {
          readerBuilder = emptyReader
        } else if (!feed && !category) {
          readerBuilder = undefined
        } else {
          let reader: UsefulReaderName
          if (feed?.[readerProp]) {
            reader = feed[readerProp]
          } else if (category?.[readerProp]) {
            reader = category[readerProp]
          } else {
            reader = reading === 'fast' ? 'feed' : 'list'
          }
          readerBuilder = reader === 'feed' ? feedReader : listReader
        }

        let instance: BaseReader | undefined
        if (readerBuilder) {
          if (category) {
            instance = readerBuilder(
              { categoryId: category.id, reading },
              params
            )
          } else if (feed) {
            instance = readerBuilder({ feedId: feed.id, reading }, params)
          } else {
            instance = readerBuilder({ reading }, params)
          }
        }

        prevLoadingUnbind()
        if (instance) {
          prevLoadingUnbind = instance.loading.subscribe(value => {
            $postsLoading.set(value)
            if (!value) $loading.set(false)
          })
        } else {
          prevLoadingUnbind = () => {}
          $postsLoading.set(true)
        }

        prevReading?.exit()
        prevReading = instance
        $posts.set(instance as Reader)
      }
    )

    function changeReader(reader: UsefulReaderName): void {
      let feedId = $feedId.get()
      if (feedId) {
        changeFeed(feedId, { [readerProp]: reader })
        return
      }
      let categoryId = $categoryId.get()
      if (categoryId) {
        changeCategory(categoryId, { [readerProp]: reader })
      }
    }

    return {
      category: $category,
      changeReader,
      exit() {
        unbindTarget()
        unbindRedirect()
        unbindPosts()
        prevReading?.exit()
        prevLoadingUnbind()
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
