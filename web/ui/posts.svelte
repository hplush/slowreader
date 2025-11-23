<script lang="ts">
  import { mdiRadioboxBlank } from '@mdi/js'
  import {
    getPostTitle,
    type OriginPost,
    type PostValue,
    router
  } from '@slowreader/core'

  import { getPopupHash } from '../stores/url-router.ts'
  import Links from './links.svelte'

  type PostLike = OriginPost | PostValue

  let { list }: { list: readonly PostLike[] } = $props()

  let links = $derived(
    list.map(post => {
      // TODO: use mdiCheckboxMarkedCircle for read posts
      return {
        href: getPopupHash($router, 'post', post.originId),
        id: 'id' in post ? post.id : post.originId,
        item: post,
        mark: 'id' in post ? mdiRadioboxBlank : undefined
      }
    })
  )
</script>

<Links current={undefined} {links}>
  {#snippet item(post)}
    {getPostTitle(post)}
  {/snippet}
</Links>
