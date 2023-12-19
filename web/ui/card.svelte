<section class="card">
  <slot />
</section>

<style>
  :root {
    --card-text-fix: -3px;
  }

  .card {
    padding: var(--padding-l) var(--padding-l);
    background-color: var(--card-color);
    border-top: 1px solid var(--top-edge-color);
    border-bottom: 1px solid var(--bottom-edge-color);
    border-radius: var(--outer-radius);
    box-shadow: var(--card-shadow);
  }
</style>
