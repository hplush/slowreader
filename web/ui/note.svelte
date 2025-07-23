<script lang="ts">
  import type { Snippet } from 'svelte'

  import Icon from './icon.svelte'

  let {
    children,
    icon,
    title,
    variant
  }: {
    children: Snippet
    icon: string
    title?: string
    variant: 'dangerous' | 'good' | 'neutral'
  } = $props()
</script>

<section
  class="note"
  class:is-dangerous={variant === 'dangerous'}
  class:is-good={variant === 'good'}
>
  <div class="note_icon">
    <Icon path={icon} />
  </div>
  {#if title}
    <string class="note_title">{title}</string>
  {/if}
  {@render children()}
</section>

<style>
  :global {
    .note {
      position: relative;
      display: flex;
      flex-direction: column;
      gap: 0.312rem;
      align-items: flex-start;
      padding: 0.625rem 0.625rem 0.625rem calc(2rem + 0.312rem + 0.312rem);
      font: var(--secondary-font);
      background: var(--current-background);
      border: 2px solid;
      border-color: oklch(
        from var(--current-background) calc(l + var(--note-l))
          calc(c + var(--note-c)) h
      );
      border-radius: var(--base-radius);

      &.is-dangerous {
        --current-background: var(--note-dangerous-background);
      }

      &.is-good {
        --current-background: var(--note-good-background);
      }

      & + & {
        margin-top: 0.625rem;
      }
    }

    .note_icon {
      --icon-size: 2rem;

      position: absolute;
      inset-inline-start: 0.312rem;
      top: 0.312rem;
      color: oklch(
        from var(--current-background) calc(l + var(--note-l))
          calc(c + var(--note-c)) h
      );
    }

    .note_title {
      display: block;
      font: var(--secondary-title-font);
    }
  }
</style>
