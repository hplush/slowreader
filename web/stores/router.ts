import './local-settings'

import { createAppRouter, Routes } from '@slowreader/core'
import { createRouter } from 'nanostores'

let urlRouter = createRouter<Routes>({
  home: '/',
  signin: '/signin',
  notFound: '/404',
  start: '/start',
  fast: '/fast',
  slowAll: '/slow'
})

export const router = createAppRouter(urlRouter)
