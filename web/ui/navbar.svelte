<script>
  import { isFastRoutes, isSlowRoutes } from '@slowreader/core'

  import { router, getURL } from '../stores/router'
</script>

<nav>
  <div class="main">
    <button aria-label="Refresh" />
    <div role="tablist">
      <label role="tab" aria-selected={isFastRoutes($router)}>
        <input type="radio" />
        Slow
      </label>
      <label role="tab" aria-selected={isSlowRoutes($router)}>
        <input type="radio" />
        Fast
      </label>
    </div>
  </div>
  <div class="common">
    <a href={getURL('add')}>Add</a>
    <button>Menu</button>
  </div>
</nav>

<style>
  nav {
    position: fixed;
    top: 0;
    left: 0;
    width: 250px;
    height: 100%;
    background: var(--navbar-background);
  }
</style>
