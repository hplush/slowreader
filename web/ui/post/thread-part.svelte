<script lang="ts">
  import type { OriginPost, PostValue, UserPostUrl } from '@slowreader/core'

  import SmallLink from '../small-link.svelte'
  import Post from './index.svelte'

  let {
    afterFirst,
    post,
    publishedAt,
    userPostUrl
  }: {
    afterFirst: string | undefined
    post: OriginPost | PostValue
    publishedAt: string | undefined
    userPostUrl: UserPostUrl
  } = $props()
</script>

<article class="post-thread-part">
  <div class="post-thread-part_header">
    <hr class="post-thread-part_separator" />
    {#if afterFirst ?? publishedAt}
      <SmallLink
        href={userPostUrl(post)}
        target="_blank"
        title={afterFirst ? publishedAt : undefined}
      >
        {afterFirst ?? publishedAt}
      </SmallLink>
    {/if}
  </div>
  <Post {post} {userPostUrl} />
</article>

<style lang="postcss">
  :global {
    .post-thread-part {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
      align-self: stretch;
    }

    .post-thread-part_header {
      display: flex;
      gap: 0.5rem;
      align-items: center;
    }

    .post-thread-part_separator {
      flex-grow: 1;
      margin: 0;
      border: none;
      border-top: calc(var(--min-size) / 2) solid var(--flat-border-color);
    }
  }
</style>
