import { atom, effect } from 'nanostores'

import { fastMenu, menuLoading, slowMenu } from '../menu.ts'
import {
  type BaseReader,
  feedReader,
  listReader,
  type ReaderCreator,
  type ReaderName
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
    let $empty = atom(false)

    let params = {
      category: $category,
      feed: $feed,
      reader: $reader,
      since: $since
    }

    let unbindRedirect = effect([$category, $feed], (category, feed) => {
      if (!category && !feed) {
        if (!menuLoading.get()) {
          let id: string | undefined
          if (reading === 'fast') {
            id = fastMenu.get()[0]?.id
          } else {
            id = slowMenu.get()[0]?.[0].id
            $empty.set(!id)
          }
          if (id) {
            nextRouteIsRedirect(() => {
              $category.set(id)
            })
          }
        }
      }
    })

    let prevLoadingUnbind = (): void => {}
    let prevReading: BaseReader | undefined
    let $posts = atom<BaseReader | undefined>()
    let unbindPosts = effect(
      [$category, $feed, $reader],
      (category, feed, reader) => {
        let readerBuilder: ReaderCreator
        if (reader === 'feed') {
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
        }

        prevLoadingUnbind()
        if (instance) {
          prevLoadingUnbind = instance.loading.subscribe(value => {
            $loading.set(value)
            if (!value && reading === 'fast') {
              $empty.set(instance.list.get().length === 0)
            }
          })
        } else {
          prevLoadingUnbind = () => {}
          $loading.set(false)
        }

        prevReading?.exit()
        prevReading = instance
        $posts.set(instance)
      }
    )

    return {
      empty: $empty,
      exit() {
        unbindPosts()
        prevReading?.exit()
        unbindRedirect()
        prevLoadingUnbind()
      },
      loading: $loading,
      params,
      posts: $posts
    }
  })
})

export const slowPage = pages[0]!
export type SlowPage = ReturnType<typeof slowPage>

export const fastPage = pages[1]!
export type FastPage = ReturnType<typeof fastPage>
