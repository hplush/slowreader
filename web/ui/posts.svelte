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

  let { list }: { list: (OriginPost | PostValue)[] } = $props()

  function getHref(post: OriginPost | PostValue): string {
    return getPopupHash($router, 'post', post.originId)
  }
</script>

<Links {getHref} {list}>
  {#snippet item(post)}
    {#if post.title}
      {post.title}
    {:else}
      <FormattedText fakelinks html={getPostIntro(post)} />
    {/if}
  {/snippet}
</Links>
