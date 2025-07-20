<script lang="ts">
  import {
    type BaseRoute,
    Category,
    client,
    currentPage,
    Feed,
    Filter,
    type ParamlessRouteName,
    Post,
    signOut,
    theme,
    useCredentials
  } from '@slowreader/core'
  import { addHashToBaseRoute, testCredentials } from '@slowreader/core/test'
  import { cleanStores } from 'nanostores'
  import { onDestroy, type Snippet } from 'svelte'

  import {
    baseRouter,
    type PreparedResponse,
    prepareResponses
  } from './environment.ts'

  let {
    children,
    oninit = () => {},
    responses = {},
    route,
    user = true
  }: {
    children: Snippet
    oninit?: () => void
    responses?: Record<string, PreparedResponse | string>
    route?: BaseRoute | Omit<BaseRoute, 'hash'> | ParamlessRouteName
    user?: boolean
  } = $props()

  function cleanLogux(): void {
    client.get()?.clean()
    cleanStores(Feed, Filter, Category, Post)
  }

  $effect.pre(() => {
    currentPage.get().destroy()
    if (user) {
      useCredentials(testCredentials())
    } else if (client.get()) {
      signOut()
    }
    cleanLogux()
    prepareResponses(responses)

    if (typeof route === 'string') {
      baseRouter.set({ hash: '', params: {}, route })
    } else {
      baseRouter.set(
        addHashToBaseRoute(route) ?? { hash: '', params: {}, route: 'slow' }
      )
    }

    function updateTheme(): void {
      let classes = document.documentElement.classList
      if (classes.contains('is-light-theme')) {
        theme.set('light')
      } else if (classes.contains('is-dark-theme')) {
        theme.set('dark')
      }
    }

    updateTheme()

    let htmlObserver = new MutationObserver(() => {
      updateTheme()
    })

    htmlObserver.observe(document.documentElement, {
      attributeFilter: ['class'],
      attributes: true
    })

    onDestroy(() => {
      htmlObserver.disconnect()
    })

    oninit()
  })

  onDestroy(() => {
    baseRouter.set({ hash: '', params: {}, route: 'slow' })
    cleanLogux()
  })
</script>

{@render children()}
