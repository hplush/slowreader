<p class="paragraph">
  <slot />
</p>

<style>
  .paragraph {
    & + & {
      margin-top: var(--padding-m);
    }
  }

  :global(.card) > .paragraph:first-child {
    margin-top: var(--card-text-fix);
  }

  :global(.card) > .paragraph:last-child {
    margin-bottom: var(--card-text-fix);
  }
</style>
