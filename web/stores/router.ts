import type { Routes } from '@slowreader/core'
import type { RouteParams } from '@nanostores/router'
import { createRouter, getPagePath } from '@nanostores/router'
import { createAppRouter } from '@slowreader/core'

let urlRouter = createRouter<Routes>({
  home: '/',
  signin: '/signin',
  notFound: '/404',
  start: '/start',
  fast: '/fast',
  slowAll: '/slow',
  add: '/add'
})

export const router = createAppRouter(urlRouter)

export function getURL<PageName extends keyof Routes>(
  name: PageName,
  ...params: RouteParams<Routes, PageName>
): string {
  return getPagePath(urlRouter, name, ...params)
}
