<script lang="ts">
  import type { Snippet } from 'svelte'

  import Icon from './icon.svelte'

  let {
    children,
    icon,
    variant
  }: { children: Snippet; icon: string; variant: 'good' | 'neutral' } = $props()
</script>

<section class="note" class:is-good={variant === 'good'}>
  <div class="note_icon">
    <Icon path={icon} />
  </div>
  {@render children()}
</section>

<style>
  :global {
    .note {
      position: relative;
      padding: 10px 10px 10px calc(32px + 5px + 5px);
      font: var(--secondary-font);
      background: var(--current-background);
      border: 2px solid;
      border-color: oklch(
        from var(--current-background) calc(l + var(--note-l))
          calc(c + var(--note-c)) h
      );
      border-radius: var(--base-radius);

      &.is-good {
        --current-background: var(--note-good-background);
      }

      & + & {
        margin-top: 10px;
      }
    }

    .note_icon {
      --icon-size: 32px;

      position: absolute;
      inset-inline-start: 5px;
      top: 5px;
      color: oklch(
        from var(--current-background) calc(l + var(--note-l))
          calc(c + var(--note-c)) h
      );
    }
  }
</style>
