import {
  type ConfigFromRouter,
  createRouter,
  getPagePath,
  type ParamsFromConfig
} from '@nanostores/router'
import {
  type ParamlessRouteName,
  type Route,
  type Routes,
  stringifyPopups
} from '@slowreader/core'
import { computed } from 'nanostores'

export const pathRouter = createRouter({
  about: '/settings/about',
  add: '/feeds/add/:url?',
  download: '/settings/download',
  export: '/feeds/export/:format?',
  fast: '/fast/:category?',
  feeds: '/feeds',
  feedsByCategories: '/feeds/categories',
  home: '/',
  import: '/feeds/import',
  interface: '/settings/ui',
  notFound: '/404',
  profile: '/settings/profile',
  refresh: '/refresh',
  settings: '/settings',
  signin: '/signin',
  slow: '/slow/:feed?',
  start: '/start',
  welcome: '/welcome'
})

type PathParams = ParamsFromConfig<ConfigFromRouter<typeof pathRouter>>

export const urlRouter = computed(pathRouter, path => {
  if (!path) {
    return undefined
  } else if (path.route === 'add') {
    return {
      hash: path.hash,
      params: path.params,
      route: path.route
    }
  } else if (path.route === 'fast') {
    let params: Routes['fast'] = path.params
    if ('since' in path.search) params.since = Number(path.search.since)
    if ('post' in path.search) params.post = path.search.post
    return {
      hash: path.hash,
      params,
      route: path.route
    }
  } else if (path.route === 'slow') {
    let params: Routes['slow'] = path.params
    if ('page' in path.search) {
      params.page = Number(path.search.page)
    }
    if ('post' in path.search) params.post = path.search.post
    return {
      hash: path.hash,
      params,
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
  if (page.route === 'fast') {
    url = moveToSearch(page, { post: true, since: true })
  } else if (page.route === 'slow') {
    url = moveToSearch(page, { page: true, post: true })
  } else {
    url = getPagePath(pathRouter, page)
  }

  return url + hash
}

export function openRoute(route: Route): void {
  pathRouter.open(getURL(route))
}
