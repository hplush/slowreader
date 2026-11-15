<script lang="ts">
  import { mdiOpenInNew } from '@mdi/js'
  import { postMessages as t } from '@slowreader/core'

  import Button from '../button.svelte'
  import Icon from '../icon.svelte'

  let {
    icon,
    text,
    url,
    variant
  }: {
    icon: string
    text: string
    url: string | undefined
    variant: 'good' | 'warning'
  } = $props()
</script>

<div
  class="post-open-note"
  class:is-good={variant === 'good'}
  class:is-warning={variant === 'warning'}
>
  <div class="post-open-note_text">
    <span class="post-open-note_icon">
      <Icon path={icon} />
    </span>
    {text}
  </div>
  {#if url}
    <div class="post-open-note_button">
      <Button href={url} icon={mdiOpenInNew} size="wide" target="_blank">
        {$t.openInApp}
      </Button>
    </div>
  {/if}
</div>

<style lang="postcss">
  :global {
    .post-open-note {
      position: relative;
      z-index: 2;
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      align-items: flex-start;
      width: stretch;
      padding: 0.25rem;
      border: 0.0625rem solid;
      border-color: --tune-background(--note);
      border-radius: calc(var(--base-radius) + 0.3125rem);

      &.is-good {
        @mixin background var(--note-good-background);
      }

      &.is-warning {
        @mixin background var(--note-warning-background);
      }
    }

    .post-open-note_text {
      display: flex;
      flex: 1 1 6rem;
      gap: 0.25rem;
      align-items: center;
      align-self: center;
      padding-inline-start: 0.25rem;
      font: var(--secondary-font);
      line-height: 1.3;
    }

    .post-open-note_icon {
      --icon-size: 1.25rem;

      color: --tune-background(--note-icon);
    }

    .post-open-note_button {
      display: flex;
      flex: 0 0 auto;
    }
  }
</style>
