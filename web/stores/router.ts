import type { Routes } from '@slowreader/core'
import { createAppRouter } from '@slowreader/core'
import { createRouter } from '@nanostores/router'

let urlRouter = createRouter<Routes>({
  home: '/',
  signin: '/signin',
  notFound: '/404',
  start: '/start',
  fast: '/fast',
  slowAll: '/slow'
})

export const router = createAppRouter(urlRouter)
