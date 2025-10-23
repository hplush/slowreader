import {
  type ConfigFromRouter,
  createRouter,
  getPagePath,
  type ParamsFromConfig
} from '@nanostores/router'
import {
  addPopup,
  type ParamlessRouteName,
  type PopupName,
  removeLastPopup,
  type Route,
  type Routes,
  stringifyPopups
} from '@slowreader/core'
import { computed } from 'nanostores'

export const pathRouter = createRouter({
  about: '/settings/about',
  add: '/feeds/add/:url?',
  download: '/settings/download',
  export: '/feeds/export',
  fast: '/fast/:category?',
  feeds: '/feeds',
  feedsByCategories: '/feeds/categories',
  home: '/',
  import: '/feeds/import',
  interface: '/settings/ui',
  notFound: '/404',
  profile: '/settings/profile',
  settings: '/settings',
  signin: '/signin',
  signup: '/signup',
  slow: '/slow/:feed?',
  start: '/start',
  welcome: '/welcome'
})

type PathParams = ParamsFromConfig<ConfigFromRouter<typeof pathRouter>>

function moveFromSearch<Params extends Record<string, number | string>>(
  params: Partial<Record<keyof Params, string>>,
  search: Record<string, string>,
  move: {
    [key in keyof Params]: Params[key] extends number | undefined
      ? 'number'
      : true
  }
): Params {
  let copy = { ...params } as Params
  for (let name in move) {
    if (name in search) {
      if (move[name] === 'number') {
        // @ts-expect-error Too complex to type
        copy[name] = Number(search[name])
      } else {
        // @ts-expect-error Too complex to type
        copy[name] = search[name]
      }
    }
  }
  return copy
}

export const urlRouter = computed(pathRouter, path => {
  if (!path) {
    return undefined
  } else if (path.route === 'slow') {
    return {
      hash: path.hash,
      params: moveFromSearch<Routes['slow']>(path.params, path.search, {
        feed: true,
        reader: true,
        since: 'number'
      }),
      route: path.route
    }
  } else if (path.route === 'fast') {
    return {
      hash: path.hash,
      params: moveFromSearch<Routes['fast']>(path.params, path.search, {
        category: true,
        reader: true,
        since: 'number'
      }),
      route: path.route
    }
  } else {
    return path
  }
})

function moveToSearch<Page extends Route>(
  page: Page,
  move: {
    [key in Exclude<
      keyof Page['params'],
      keyof PathParams[Page['route']]
    >]: true
  }
): string {
  let search = {}
  let rest = {}
  for (let key in page.params) {
    // @ts-expect-error Too complex to type
    if (move[key]) {
      // @ts-expect-error Too complex to type
      if (typeof page.params[key] !== 'undefined') {
        // @ts-expect-error Too complex to type
        search[key] = page.params[key]
      }
    } else {
      // @ts-expect-error Too complex to type
      rest[key] = page.params[key]
    }
  }
  return getPagePath(pathRouter, page.route, rest, search)
}

export function getURL(
  to: Omit<Route, 'popups'> | ParamlessRouteName | Route
): string {
  let hash = ''
  if (typeof to === 'object' && 'popups' in to) {
    hash = stringifyPopups(to.popups)
  }
  if (hash !== '') hash = '#' + hash

  let page: Route
  if (typeof to === 'string') {
    page = { params: {}, popups: [], route: to }
  } else if (!('popups' in to)) {
    page = { ...to, popups: [] } as Route
  } else {
    page = to
  }

  let url
  if (page.route === 'slow') {
    url = moveToSearch(page, {
      category: true,
      reader: true,
      since: true
    })
  } else if (page.route === 'fast') {
    url = moveToSearch(page, {
      feed: true,
      reader: true,
      since: true
    })
  } else {
    url = getPagePath(pathRouter, page)
  }

  return url + hash
}

export function openRoute(route: Route, redirect?: boolean): void {
  pathRouter.open(getURL(route), redirect)
}

export function getPopupHash(
  currentRoute: Route | undefined,
  popup: PopupName,
  param: string
): string {
  return (
    `#` +
    addPopup(
      currentRoute ? stringifyPopups(currentRoute.popups) : '',
      popup,
      param
    )
  )
}

export function getHashWithoutLastPopup(currentRoute: Route): string {
  let hash = removeLastPopup(stringifyPopups(currentRoute.popups))
  return hash ? `#${hash}` : ''
}
