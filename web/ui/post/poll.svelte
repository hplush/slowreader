<script lang="ts">
  import { mdiOpenInNew, mdiRadioboxBlank } from '@mdi/js'
  import {
    type PostPoll,
    postMessages as t,
    type UserPostUrl
  } from '@slowreader/core'

  import Button from '../button.svelte'
  import FormattedText from '../formatted-text.svelte'
  import Icon from '../icon.svelte'

  let {
    lang,
    poll,
    post,
    userPostUrl
  }: {
    lang: null | string | undefined
    poll: PostPoll
    post: Parameters<UserPostUrl>[0]
    userPostUrl: UserPostUrl
  } = $props()

  let voteUrl = $derived(userPostUrl(post))
</script>

{#if voteUrl}
  <div class="post-poll">
    <a class="post-poll_link" href={voteUrl} target="_blank">
      <ul class="post-poll_options" aria-label={$t.poll}>
        {#each poll.options as option, index (index)}
          <li class="post-poll_option">
            <span class="post-poll_mark">
              <Icon path={mdiRadioboxBlank} />
            </span>
            <FormattedText html={option.title} {lang} scroll={false} simple />
          </li>
        {/each}
      </ul>
    </a>
    <Button href={voteUrl} icon={mdiOpenInNew} size="wide" target="_blank">
      {$t.vote}
    </Button>
  </div>
{/if}

<style lang="postcss">
  :global {
    .post-poll {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      padding: 0.25rem 0.625rem 0.625rem 0.625rem;
      border: calc(var(--min-size) / 2) solid var(--flat-border-color);
      border-radius: var(--base-radius);
    }

    .post-poll_link {
      @mixin clickable;

      display: block;
      padding: 0.375rem;
      margin-inline: -0.375rem;
      color: var(--text-color);
      text-decoration: none;
      border-radius: var(--base-radius);

      &:hover,
      &:active,
      &:focus-visible {
        background: --tune-background(--flat-button --flat-button-hover);
      }
    }

    .post-poll_options {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
      padding: 0;
      list-style: none;
    }

    .post-poll_option {
      display: flex;
      gap: 0.5rem;
      align-items: center;
    }

    .post-poll_mark {
      color: var(--secondary-text-color);
    }
  }
</style>
