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

<style lang="postcss">
  :global {
    .note {
      position: relative;
      display: flex;
      flex-direction: column;
      gap: 0.312rem;
      align-items: flex-start;
      padding: 0.625rem 0.625rem 0.625rem calc(2rem + 0.312rem + 0.312rem);
      font: var(--secondary-font);
      border: 2px solid;
      border-color: --tune-background(--note);
      border-radius: var(--base-radius);
      corner-shape: squircle;

      &.is-dangerous {
        @mixin background var(--note-dangerous-background);
      }

      &.is-good {
        @mixin background var(--note-good-background);
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
      color: --tune-background(--note);
    }

    .note_title {
      display: block;
      font: var(--secondary-title-font);
    }
  }
</style>
