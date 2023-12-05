<footer class="card-actions">
  <slot />
</footer>

<style>
  .card-actions {
    display: flex;
    gap: var(--padding-m);
    padding-bottom: var(--card-text-fix);

    &:first-child {
      padding-top: var(--card-text-fix);
    }

    &:not(:first-child) {
      margin-top: var(--padding-l);
    }
  }
</style>
