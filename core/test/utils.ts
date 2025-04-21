import { cleanStores, type ReadableAtom } from 'nanostores'
import { fail } from 'node:assert'

import {
  type BasePopup,
  type BaseReader,
  type BaseRoute,
  Category,
  client,
  currentPage,
  enableTestTime,
  type EnvironmentAndStore,
  fastMenu,
  Feed,
  type FeedReader,
  Filter,
  getTestEnvironment,
  type ListReader,
  menuLoading,
  openedPopups,
  openPopup,
  type Page,
  type Popup,
  type PopupName,
  Post,
  type ReaderName,
  setBaseTestRoute,
  setupEnvironment,
  slowMenu,
  userId
} from '../index.ts'

export function enableClientTest(env: Partial<EnvironmentAndStore> = {}): void {
  setupEnvironment({ ...getTestEnvironment(), ...env })
  enableTestTime()
  userId.set('10')
  setBaseTestRoute({ params: {}, route: 'home' })
}

export async function cleanClientTest(): Promise<void> {
  cleanStores(Feed, Filter, Category, Post, fastMenu, slowMenu, menuLoading)
  await client.get()?.clean()
}

interface PromiseMock<Result> {
  next(): PromiseMock<Result>
  promise(): Promise<Result>
  resolve(result: Result): void
}

export function createPromise<Result>(): PromiseMock<Result> {
  let result: PromiseMock<Result> = {
    next() {
      return createPromise<Result>()
    },
    promise() {
      return new Promise<Result>(resolve => {
        result.resolve = resolve
      })
    },
    resolve() {
      fail()
    }
  }
  return result
}

export function openTestPopup<Name extends PopupName>(
  popup: Name,
  param: string
): Popup<Name> {
  openPopup(popup, param)
  return getPopup(popup, openedPopups.get().length - 1)
}

export function getPopup<Name extends PopupName>(
  name: Name,
  at = 0
): Popup<Name> {
  let popups = openedPopups.get()
  if (popups.length <= at) {
    throw new Error(
      `openedPopups has only ${popups.length} popups, but ${at} was requested`
    )
  }
  let popup = popups[at]!
  if (popup.name !== name) {
    throw new Error(
      `openedPopups[${at}] has name ${popup.name}, but ${name} was requested`
    )
  }
  return popup as Popup<Name>
}

export type Loaded<SomePopup extends BasePopup> = Extract<
  SomePopup,
  { loading: ReadableAtom<false>; notFound: false }
>

export function checkLoadedPopup<SomePopup extends BasePopup>(
  popup: SomePopup
): Loaded<SomePopup> {
  if (popup.loading.get()) {
    throw new Error('Popup is still loading')
  }
  if (popup.notFound) {
    throw new Error('Popup data was not found')
  }
  return popup as Loaded<SomePopup>
}

export function openPage<SomeRoute extends BaseRoute | Omit<BaseRoute, 'hash'>>(
  route: SomeRoute
): Page<SomeRoute['route']> {
  setBaseTestRoute(route)
  let page = currentPage.get()
  if (page.route !== route.route) {
    throw new Error(`Current is ${page.route}, but ${route.route} was expected`)
  }
  return page as Page<SomeRoute['route']>
}

export function ensureReader<Name extends ReaderName>(
  atom: ReadableAtom<BaseReader | undefined>,
  name: Name
): Name extends 'feed' ? FeedReader : ListReader {
  let reader = atom.get()
  if (!reader || reader.name !== name) {
    throw new Error(`Reader is ${reader?.name}, but ${name} was expected`)
  }
  return reader as Name extends 'feed' ? FeedReader : ListReader
}
