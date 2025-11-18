<script lang="ts">
  import {
    getPostIntro,
    type OriginPost,
    type PostValue,
    router
  } from '@slowreader/core'

  import { getPopupHash } from '../stores/url-router.ts'
  import FormattedText from './formatted-text.svelte'
  import Links from './links.svelte'

  type PostLike = OriginPost | PostValue

  let { list }: { list: readonly PostLike[] } = $props()

  let links = $derived(
    list.map(post => ({
      href: getPopupHash($router, 'post', post.originId),
      item: post
    }))
  )
</script>

<Links current={undefined} {links}>
  {#snippet item(post)}
    {#if post.title}
      {post.title}
    {:else}
      <FormattedText fakelinks html={getPostIntro(post)} />
    {/if}
  {/snippet}
</Links>
