import {
  LocalStoreConstructor,
  LocalStoreClass,
  RouteParams,
  CurrentPage,
  LocalStore,
  connect
} from '@logux/state'

import { LocalSettings } from '../local-settings'

export interface Routes {
  home: void
  slowAll: void
  fast: void
  start: void
  signin: void
}

const GUEST = new Set(['start', 'signin'])

function page (
  name: string,
  params?: { [key: string]: string }
): CurrentPage<Routes> {
  return { name, params: params ?? {} }
}

function redirect<N extends keyof Routes> (
  name: N,
  ...params: RouteParams<Routes, N>
) {
  return { page: page(name, params[0]), redirect: true }
}

function open<N extends keyof Routes> (
  name: N,
  ...params: RouteParams<Routes, N>
) {
  return { page: page(name, params[0]), redirect: false }
}

export interface BaseRouter extends LocalStore {
  page: CurrentPage<Routes>
}

export class Router extends LocalStore {
  static Base: LocalStoreConstructor<BaseRouter> | undefined

  private static getBase () {
    if (!Router.Base) {
      throw new Error('Set Router.Base')
    }
    return Router.Base as LocalStoreClass<BaseRouter>
  }

  readonly page: CurrentPage<Routes> = page('home')
  readonly redirect = false

  constructor () {
    super()
    connect(
      this,
      [Router.getBase().load(), LocalSettings.load()],
      (base, settings) => {
        let name = base.page.name
        if (settings.userId) {
          if (GUEST.has(name)) {
            return redirect('slowAll')
          } else if (name === 'home') {
            return redirect('slowAll')
          }
        } else if (!GUEST.has(name)) {
          return open('start')
        }
        return { page: base.page, redirect: false }
      }
    )
  }
}
