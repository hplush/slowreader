import {
  type ConfigFromRouter,
  createRouter,
  getPagePath,
  type ParamsArg
} from '@nanostores/router'
import { createAppRouter } from '@slowreader/core'

let urlRouter = createRouter({
  add: '/add',
  fast: '/fast',
  home: '/',
  notFound: '/404',
  preview: '/add/:url',
  signin: '/signin',
  slowAll: '/slow',
  start: '/start',
  subscriptions: '/subscriptions'
})

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
