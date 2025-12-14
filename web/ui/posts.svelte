<script lang="ts">
  import type { LoadedSyncMap, SyncMapStore } from '@logux/client'
  import {
    getPopupId,
    getPostPopupParam,
    getPostTitle,
    openedPost,
    type OriginPost,
    type PostValue,
    router
  } from '@slowreader/core'

  import { getPopupHash } from '../stores/url-router.ts'
  import Links from './links.svelte'

  let {
    autoread,
    list
  }: {
    autoread?: boolean
    list: readonly (LoadedSyncMap<SyncMapStore<PostValue>> | OriginPost)[]
  } = $props()

  let links = $derived(
    list.map(i => {
      let post = ('get' in i ? i.get() : i) as OriginPost | PostValue
      let param = getPostPopupParam(post, autoread)
      return {
        controls: getPopupId('post', param),
        href: getPopupHash($router, 'post', param),
        id: 'id' in post ? post.id : post.originId,
        item: post,
        variant: 'id' in post && post.read ? ('read' as const) : undefined
      }
    })
  )
</script>

<Links current={$openedPost} {links}>
  {#snippet item(post)}
    {getPostTitle(post)}
  {/snippet}
</Links>
