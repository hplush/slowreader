<script lang="ts">
  import {
    getPopupId,
    getPostPopupParam,
    getPostTitle,
    openedPost,
    type OriginPost,
    type ReaderPost,
    router
  } from '@slowreader/core'

  import { getPopupHash } from '../stores/url-router.ts'
  import Links from './links.svelte'

  let {
    autoread,
    list
  }: {
    autoread?: boolean
    list: readonly (OriginPost | ReaderPost)[]
  } = $props()

  let links = $derived(
    list.map(post => {
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

<Links anchor="post" current={$openedPost} {links}>
  {#snippet item(post)}
    {getPostTitle(post)}
  {/snippet}
</Links>
