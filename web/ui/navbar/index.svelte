<script>
  import {
    isFastRoute,
    isSlowRoute,
    router,
    navbarMessages as t
  } from '@slowreader/core'

  import { getURL } from '../../stores/router'
</script>

<nav>
  <div>
    <a href={getURL('slowAll')}>
      {#if isSlowRoute($router)}
        <strong>{$t.slow}</strong>
      {:else}
        {$t.slow}
      {/if}
    </a>
    <a href={getURL('fast')}>
      {#if isFastRoute($router)}
        <strong>{$t.fast}</strong>
      {:else}
        {$t.fast}
      {/if}
    </a>
  </div>
  <div>
    <a href={getURL('add')}>
      {#if $router.route === 'add' || $router.route === 'preview'}
        <strong>{$t.add}</strong>
      {:else}
        {$t.add}
      {/if}
    </a>
  </div>
  <div>
    <a href={getURL('subscriptions')}>
      {#if $router.route === 'subscriptions'}
        <strong>{$t.subscriptions}</strong>
      {:else}
        {$t.subscriptions}
      {/if}
    </a>
  </div>
</nav>

<style>
  nav {
    position: fixed;
    top: 0;
    bottom: 0;
    left: 0;
    width: var(--navbar-width);
    padding: var(--app-padding);
  }
</style>
