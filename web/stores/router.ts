import {
  type ConfigFromRouter,
  type ParamsArg,
  createRouter,
  getPagePath
} from '@nanostores/router'
import { createAppRouter } from '@slowreader/core'

let urlRouter = createRouter({
  home: '/',
  signin: '/signin',
  notFound: '/404',
  start: '/start',
  fast: '/fast',
  slowAll: '/slow',
  add: '/add',
  preview: '/preview/:url'
} as const)

type UrlConfig = ConfigFromRouter<typeof urlRouter>

export const router = createAppRouter(urlRouter)

export function getURL<Name extends keyof UrlConfig>(
  name: Name,
  ...params: ParamsArg<UrlConfig, Name>
): string {
  return getPagePath(urlRouter, name, ...params)
}

export function openURL<Name extends keyof UrlConfig>(
  name: Name,
  ...params: ParamsArg<UrlConfig, Name>
): void {
  urlRouter.open(getURL(name, ...params))
}
