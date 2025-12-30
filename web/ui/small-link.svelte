<script lang="ts">
  import type { Snippet } from 'svelte'
  import type { HTMLAnchorAttributes } from 'svelte/elements'

  let {
    children,
    shrink,
    ...props
  }: { children: Snippet; shrink?: boolean } & HTMLAnchorAttributes = $props()
</script>

<a {...props} class="small-link" class:is-shrink={shrink}>
  {@render children()}
</a>

<style lang="postcss">
  :global {
    .small-link {
      @mixin clickable;

      display: inline-block;
      overflow: hidden;
      text-overflow: ellipsis;
      font: var(--secondary-font);
      color: var(--secondary-text-color);
      white-space: nowrap;

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

      &.is-shrink {
        flex-shrink: 1;
      }
    }
  }
</style>
