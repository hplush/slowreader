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
    userId
  } from '@slowreader/core'
  import { addHashToBaseRoute } from '@slowreader/core/test'
  import { cleanStores, type ReadableAtom, type WritableAtom } from 'nanostores'
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
    user = '10'
  }: {
    children: Snippet
    oninit?: () => void
    responses?: Record<string, PreparedResponse | string>
    route?: BaseRoute | Omit<BaseRoute, 'hash'> | ParamlessRouteName
    user?: false | string
  } = $props()

  export function forceSet<Value>(
    store: ReadableAtom<Value>,
    value: Value
  ): void {
    ;(store as WritableAtom<Value>).set(value)
  }

  function cleanLogux(): void {
    client.get()?.clean()
    cleanStores(Feed, Filter, Category, Post)
  }

  $effect.pre(() => {
    currentPage.get().destroy()
    userId.set(user || undefined)
    cleanLogux()
    prepareResponses(responses)

    if (typeof route === 'string') {
      baseRouter.set({ hash: '', params: {}, route })
    } else {
      baseRouter.set(
        addHashToBaseRoute(route) ?? { hash: '', params: {}, route: 'slow' }
      )
    }

    oninit()
  })

  onDestroy(() => {
    baseRouter.set({ hash: '', params: {}, route: 'slow' })
    cleanLogux()
  })
</script>

{@render children()}
