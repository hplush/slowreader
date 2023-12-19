<footer class="card-actions">
  <slot />
</footer>

<style>
  .card-actions {
    display: flex;
    gap: var(--padding-m);

    &:not(:first-child) {
      margin-top: var(--padding-l);
    }
  }
</style>
