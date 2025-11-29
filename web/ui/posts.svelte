<script lang="ts">
  import {
    getPostTitle,
    type OriginPost,
    type PostValue,
    router
  } from '@slowreader/core'

  import { getPostPopupParam } from '../../core/popups/post.ts'
  import { getPopupHash } from '../stores/url-router.ts'
  import Links from './links.svelte'

  type PostLike = OriginPost | PostValue

  let { autoread, list }: { autoread?: boolean; list: readonly PostLike[] } =
    $props()

  let current = $derived.by(() => {
    if (!list[0] || !('id' in list[0])) return undefined
    let ids = $router.popups.filter(i => i.popup === 'post').map(i => i.param)
    return list.find(i => ids.includes(getPostPopupParam(i, autoread)))
  })

  let links = $derived(
    list.map(post => {
      return {
        href: getPopupHash($router, 'post', getPostPopupParam(post, autoread)),
        id: 'id' in post ? post.id : post.originId,
        item: post,
        variant: 'id' in post && post.read ? ('read' as const) : undefined
      }
    })
  )
</script>

<Links {current} {links}>
  {#snippet item(post)}
    {getPostTitle(post)}
  {/snippet}
</Links>
