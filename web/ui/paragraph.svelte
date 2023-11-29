<p class="paragraph">
  <slot />
</p>

<style>
  .paragraph {
    & + & {
      margin-top: var(--padding-m);
    }
  }
</style>
