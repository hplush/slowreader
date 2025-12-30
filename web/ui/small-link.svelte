<script lang="ts">
  import type { Snippet } from 'svelte'
  import type { HTMLAnchorAttributes } from 'svelte/elements'

  let { children, ...props }: { children: Snippet } & HTMLAnchorAttributes =
    $props()
</script>

<a {...props} class="small-link">
  {@render children()}
</a>

<style lang="postcss">
  :global {
    .small-link {
      @mixin clickable;

      font: var(--secondary-font);
      color: var(--secondary-text-color);

      &:hover:not([aria-disabled='true']),
      &:active:not([aria-disabled='true']),
      &:focus-visible {
        text-decoration: underline;
      }

      &:focus-visible {
        border-radius: var(--base-radius);
      }

      &:active:not([aria-disabled='true']) {
        translate: 0 1px;
      }
    }
  }
</style>
