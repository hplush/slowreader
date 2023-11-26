<section class="card">
  <slot />
</section>

<style>
  .card {
    padding: var(--padding-l);
    background-color: var(--card-color);
    border-top: 1px solid var(--top-edge-color);
    border-bottom: 1px solid var(--bottom-edge-color);
    border-radius: var(--radius);
  }
</style>
