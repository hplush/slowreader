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

  let { list }: { list: PostLike[] } = $props()

  function getHref(post: PostLike): string {
    return getPopupHash($router, 'post', post.originId)
  }

  function getCurrent(post: PostLike): boolean {
    return post.url === 'TODO'
  }
</script>

<Links {getCurrent} {getHref} {list}>
  {#snippet item(post)}
    {#if post.title}
      {post.title}
    {:else}
      <FormattedText fakelinks html={getPostIntro(post)} />
    {/if}
  {/snippet}
</Links>
