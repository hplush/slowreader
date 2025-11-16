import { atom, effect } from 'nanostores'

import { needWelcome } from '../feed.ts'
import { fastMenu, menuLoading, slowMenu } from '../menu.ts'
import { fastPostsCount, slowPostsCount } from '../post.ts'
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
import { createPage } from './common.ts'

let pages = (['slow', 'fast'] as const).map(reading => {
  return createPage(reading, () => {
    let $category = atom<string | undefined>()
    let $feed = atom<string | undefined>()
    let $reader = atom<ReaderName | undefined>()
    let $since = atom<number | undefined>()
    let $loading = atom(true)
    let $posts = atom<Reader | undefined>()

    let params = {
      category: $category,
      feed: $feed,
      reader: $reader,
      since: $since
    }

    let prevLoadingUnbind = (): void => {}
    let prevReading: BaseReader | undefined
    let unbindPosts = effect(
      [$category, $feed, $reader, needWelcome, fastPostsCount, slowPostsCount],
      (category, feed, reader, welcome, fastCount, slowCount) => {
        if (!category && !feed) {
          if (!menuLoading.get()) {
            let id =
              reading === 'fast'
                ? fastMenu.get()[0]?.id
                : slowMenu.get()[0]?.[0].id
            if (id) {
              nextRouteIsRedirect(() => {
                $category.set(id)
              })
            }
          }
        }

        let readerBuilder: ReaderCreator
        if (welcome) {
          readerBuilder = welcomeReader
        } else if (
          (reading === 'fast' && fastCount === 0) ||
          (reading === 'slow' && slowCount === 0)
        ) {
          readerBuilder = emptyReader
        } else if (reader === 'feed') {
          readerBuilder = feedReader
        } else if (reader === 'list') {
          readerBuilder = listReader
        } else {
          readerBuilder = reading === 'fast' ? feedReader : listReader
        }

        let instance: BaseReader | undefined
        if (category) {
          instance = readerBuilder({ categoryId: category, reading }, params)
        } else if (feed) {
          instance = readerBuilder({ feedId: feed, reading }, params)
        } else {
          instance = readerBuilder({ reading }, params)
        }

        prevLoadingUnbind()
        if (instance) {
          prevLoadingUnbind = instance.loading.subscribe(value => {
            $loading.set(value)
          })
        } else {
          prevLoadingUnbind = () => {}
          $loading.set(true)
        }

        prevReading?.exit()
        prevReading = instance
        $posts.set(instance as Reader)
      }
    )

    return {
      exit() {
        unbindPosts()
        prevReading?.exit()
        prevLoadingUnbind()
      },
      loading: $loading,
      params,
      posts: $posts,
      reading
    }
  })
})

export const slowPage = pages[0]!
export const fastPage = pages[1]!

export type FeedsPage = ReturnType<typeof fastPage>
