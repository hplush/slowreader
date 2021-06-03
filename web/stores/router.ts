import './local-settings'

import { setBaseRouter, Routes } from '@slowreader/core'
import { createRouter } from 'nanostores'

let urlRouter = createRouter<Routes>({
  home: '/',
  signin: '/signin',
  notFound: '/404',
  start: '/start',
  fast: '/fast',
  slowAll: '/slow'
})

setBaseRouter(urlRouter)

export { router } from '@slowreader/core'
