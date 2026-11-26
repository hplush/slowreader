import { restoreAll, spyOn } from 'nanospy'
import { deepEqual, equal } from 'node:assert/strict'
import { afterEach, beforeEach, describe, test } from 'node:test'
import { setTimeout } from 'node:timers/promises'

import {
  closeLastPopup,
  laterMessages,
  type Loader,
  loaders,
  loadPosts,
  router,
  waitLoading
} from '../../index.ts'
import {
  checkAndRemoveRequestMock,
  checkLoadedPopup,
  cleanClient,
  expectRequest,
  expectWarning,
  mockRequest,
  openRoute,
  openTestPopup,
  setupNodeDom,
  startClient,
  waitUntil
} from '../utils.ts'

setupNodeDom()

async function openLater(): Promise<LaterPopupValue> {
  let popup = openTestPopup('later', '1')
  await waitLoading(popup.loading)
  return popup
}

type LaterPopupValue = ReturnType<typeof openTestPopup<'later'>>

describe('later popup', () => {
  beforeEach(() => {
    startClient()
    mockRequest()
  })

  afterEach(async () => {
    await cleanClient()
    restoreAll()
    checkAndRemoveRequestMock()
  })

  test('adds link and closes', async () => {
    openRoute({ params: {}, route: 'history' })
    let popup = checkLoadedPopup(await openLater())

    popup.url.set('ftp://a.com/2')
    await popup.add()
    equal(popup.failure.get(), laterMessages.get().notUrl)

    let page = expectRequest('https://a.com/1').andWait()
    popup.url.set('a.com/1')
    let adding = popup.add()
    equal(popup.adding.get(), true)
    expectRequest('https://a.com/').andRespond(404)
    expectRequest('https://a.com/favicon.ico').andRespond(404)
    await page(200, '<html><head><title>One</title></head></html>')
    await adding
    equal(popup.adding.get(), false)
    equal(popup.failure.get(), undefined)
    deepEqual(router.get().popups, [])
    deepEqual(
      (await loadPosts()).map(post => post.title),
      ['One']
    )

    let again = checkLoadedPopup(await openLater())
    again.url.set('a.com/1')
    await again.add()
    equal(again.already.get(), true)
  })

  test('shows unexpected errors', async () => {
    let mastodon = loaders.mastodon as Required<Loader>
    spyOn(mastodon, 'isPostUrl', () => true)
    spyOn(mastodon, 'getPostByUrl', () => Promise.reject(new Error('Bug')))
    let loaded = checkLoadedPopup(await openLater())
    loaded.url.set('https://mastodon.social/@a/1')
    await expectWarning(() => loaded.add(), ['Error: Bug'])
    equal(loaded.failure.get(), 'Bug')
  })

  test('stops adding on closing', async () => {
    let loaded = checkLoadedPopup(await openLater())
    let page = expectRequest('https://a.com/1').andWait()
    loaded.url.set('https://a.com/1')
    let adding = loaded.add()
    closeLastPopup()
    await waitUntil(() => page.aborted === true)
    await adding
    await setTimeout(10)
    deepEqual(await loadPosts(), [])
  })
})
