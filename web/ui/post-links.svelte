<script lang="ts">
  import {
    getPopupId,
    getPostPopupParam,
    getPostTitle,
    isOpenedPost,
    openedPost,
    type ReaderPost
  } from '@slowreader/core'

  import { getPopupHash } from '../stores/url-router.ts'
  import Links from './links.svelte'

  let {
    autoread,
    list
  }: {
    autoread?: boolean
    list: readonly ReaderPost[]
  } = $props()

  let links = $derived(
    list.map(post => {
      let param = getPostPopupParam(post, autoread)
      return {
        controls: getPopupId('post', param),
        href: getPopupHash(undefined, 'post', param),
        id: post.id,
        item: post,
        variant: post.read ? ('read' as const) : undefined
      }
    })
  )
</script>

<Links
  anchor="post"
  current={list.find(post => isOpenedPost($openedPost, post))?.id}
  {links}
>
  {#snippet item(post)}
    {getPostTitle(post)}
  {/snippet}
</Links>
