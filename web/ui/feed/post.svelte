<script lang="ts">
  import { mdiChevronRight, mdiOpenInNew, mdiPuzzleOutline } from '@mdi/js'
  import {
    type FeedAuthor,
    formatRelativeTime,
    getMediaOutsideText,
    getPopupId,
    getPostBadges,
    getPostIntro,
    getPostPopupParam,
    i18nFormat,
    isOpenedPost,
    openedPost,
    postMessages,
    type PreviewPost,
    type ReaderPost,
    router,
    feedsMessages as t,
    type UserPostUrl
  } from '@slowreader/core'

  import { pauseVideosWhenScrolledOut } from '../../lib/media.ts'
  import { getPopupHash } from '../../stores/url-router.ts'
  import Button from '../button.svelte'
  import FeedLink from '../feed-link.svelte'
  import FormattedText from '../formatted-text.svelte'
  import Note from '../note.svelte'
  import PostBadges from '../post/badges.svelte'
  import PostByline from '../post/byline.svelte'
  import PostMedia from '../post/media.svelte'
  import PostPoll from '../post/poll.svelte'
  import PostPreview from '../post/preview.svelte'
  import PostQuote from '../post/quote.svelte'
  import PostWarning from '../post/warning.svelte'

  let {
    author,
    feedUrl,
    highlight,
    post,
    userPostUrl
  }: {
    author: FeedAuthor | undefined
    feedUrl: string | undefined
    highlight: boolean
    post: PreviewPost | ReaderPost
    userPostUrl: UserPostUrl
  } = $props()

  let [intro, more] = $derived(getPostIntro(post))
  let param = $derived(getPostPopupParam('origin' in post ? post.origin : post))
  let current = $derived(highlight && isOpenedPost($openedPost, post))

  let url = $derived(userPostUrl(post))
  let badges = $derived(getPostBadges(post))
</script>

{#snippet byline()}
  <PostByline
    author={post.author}
    repostHref={feedUrl && getPopupHash($router, 'feed', feedUrl)}
    repostedBy={post.repostedBy}
  />
{/snippet}

<li
  class="feed-post"
  class:is-current={current}
  class:is-read={'read' in post && post.read}
  {@attach pauseVideosWhenScrolledOut}
>
  <a
    class="feed-post_link"
    aria-controls={current ? getPopupId('post', param) : null}
    aria-current={current ? 'page' : null}
    aria-labelledby={`feed-content-${post.id}`}
    href={getPopupHash($router, 'post', param)}
  ></a>
  <article id={`feed-content-${post.id}`} class="feed-post_content">
    {#if author || post.publishedAt}
      <header class="feed-post_header">
        {#if author}
          <div class="feed-post_author">
            <FeedLink
              avatar={author.avatar}
              avatarRound={author.round}
              avatarSize="medium"
              feedId={author.feedId}
              href={getPopupHash($router, 'feed', author.url)}
              title={author.title}
              url={author.url}
              variant="secondary"
            />
          </div>
        {:else}
          <div class="feed-post_byline">
            {@render byline()}
          </div>
        {/if}
        {#if post.publishedAt}
          <time
            class="feed-post_date"
            datetime={new Date(post.publishedAt * 1000).toISOString()}
            title={$i18nFormat.time(new Date(post.publishedAt * 1000), {
              dateStyle: 'medium',
              timeStyle: 'short'
            })}
          >
            {formatRelativeTime($i18nFormat, post.publishedAt)}
          </time>
        {/if}
      </header>
    {/if}
    {#if author || !post.publishedAt}
      {@render byline()}
    {/if}
    {#if post.title}
      <h2 class="feed-post_title">
        <FormattedText html={post.title} lang={post.lang} scroll={false} />
      </h2>
    {/if}
    {#if post.replied && !post.replied.missing}
      <PostQuote
        caption={$postMessages.replyingTo}
        quoted={post.replied}
        {userPostUrl}
      />
    {/if}
    <PostWarning lang={post.lang} warning={post.warning}>
      <FormattedText html={intro} lang={post.lang} simple />
      {#if post.poll}
        <PostPoll lang={post.lang} poll={post.poll} {post} {userPostUrl} />
      {/if}
      <PostMedia
        media={getMediaOutsideText(post.media, intro, post.intro === null)}
      />
      {#if post.quoted}
        <PostQuote quoted={post.quoted} {userPostUrl} />
      {/if}
      {#if post.preview}
        <PostPreview preview={post.preview} />
      {/if}
    </PostWarning>
    {#if post.unsupported}
      <Note icon={mdiPuzzleOutline} variant="neutral">
        {$postMessages.unsupported}
      </Note>
    {/if}
    <footer class="feed-post_actions">
      {#if badges.length > 0}
        <div class="feed-post_badges">
          <PostBadges {badges} />
        </div>
      {/if}
      <div class="feed-post_fill"></div>
      {#if url}
        <Button
          href={url}
          icon={mdiOpenInNew}
          size="icon"
          target="_blank"
          variant="plain"
        >
          {$t.openPostLink}
        </Button>
      {/if}
      {#if more}
        <Button
          href={getPopupHash($router, 'post', param)}
          icon={mdiChevronRight}
          size="icon"
          variant="plain"
        >
          {$t.more}
        </Button>
      {/if}
    </footer>
  </article>
</li>

<style lang="postcss">
  :global {
    .feed-post {
      --feed-post-background: var(--current-background);

      position: relative;
      padding: 0.875rem var(--control-padding) 0 var(--control-padding);
      overflow-wrap: anywhere;
      background: var(--feed-post-background);
      border: calc(var(--min-size) / 2) solid var(--flat-border-color);

      &:not(.is-read) {
        --feed-post-background: --tune-background(--field);
      }

      &.is-read {
        color: var(--secondary-text-color);
      }

      &:not(:last-child) {
        border-bottom: none;
      }

      @media (--mobile) {
        margin-inline: calc(-1 * var(--page-padding));
        border-inline: none;
      }

      @media (--no-mobile) {
        margin-top: calc(-1 * var(--min-size));

        &:first-child {
          margin-top: 0;
          border-radius: var(--base-radius) var(--base-radius) 0 0;
        }

        &:last-child {
          border-radius: 0 0 var(--base-radius) var(--base-radius);
        }

        &:last-child:first-child {
          border-radius: var(--base-radius);
        }
      }

      &:not(.is-current):has(.feed-post_link:hover),
      &:has(.feed-post_link:active),
      &:has(.feed-post_link:focus-visible) {
        --feed-post-background: --tune-background(--field --flat-button-hover);
      }

      &:has(.feed-post_link:active) {
        z-index: 1;
        box-shadow: var(--pressed-shadow);
      }

      &.is-current {
        z-index: 1;
        cursor: default;

        --feed-post-background: --tune-background(--opened-feed);

        box-shadow: var(--current-shadow);
      }
    }

    .feed-post a:not(.feed-post_link) {
      position: relative;
      z-index: 2;
    }

    .feed-post_link {
      @mixin clickable;

      position: absolute;
      inset: 0;
      z-index: 1;
      display: block;
      width: 100%;
      height: 100%;

      li:first-child & {
        border-radius: var(--base-radius) var(--base-radius) 0 0;
      }

      li:last-child & {
        border-radius: 0 0 var(--base-radius) var(--base-radius);
      }

      li:last-child:first-child & {
        border-radius: var(--base-radius);
      }
    }

    .feed-post_header {
      display: flex;
      gap: 0.5rem;
      align-items: flex-start;
      justify-content: space-between;
      margin-top: -0.125rem;
    }

    .feed-post_byline {
      min-width: 0;
    }

    .feed-post_author {
      display: flex;
      flex: 1 1 0;
      min-width: 0;
    }

    .feed-post_content {
      display: flex;
      flex-direction: column;
      gap: 0.625rem;
      font: var(--post-text-font);

      .feed-post_link:active + & {
        translate: 0 var(--min-size);
      }
    }

    .feed-post_title {
      margin-top: -0.325rem;
      font: var(--post-card-title-font);
    }

    .feed-post_actions {
      --current-background: var(--feed-post-background);

      display: flex;
      padding: 0.25rem;

      /* Actions are aligned by own padding, not by the content gap */
      margin-top: -0.625rem;
      margin-inline: calc(-1 * var(--control-padding));
    }

    .feed-post_badges {
      align-self: center;
      margin-inline-start: 0.5rem;
    }

    .feed-post_date {
      flex-shrink: 0;
      margin-inline-start: auto;
      font: var(--secondary-font);
      color: var(--secondary-text-color);
    }

    .feed-post_fill {
      flex-grow: 1;
    }

    .feed-post_more {
      position: relative;
      z-index: 2;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 1rem;
      height: var(--control-height);
      padding-inline-end: 0.5rem;
    }
  }
</style>
