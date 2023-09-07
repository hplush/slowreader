<script lang="ts">
  import {
    isFastRoute,
    isSlowRoute,
    router,
    navbarMessages as t
  } from '@slowreader/core'

  import { getURL } from '../stores/router.js'
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
    <a href={getURL('feeds')}>
      {#if $router.route === 'feeds' || $router.route === 'feed'}
        <strong>{$t.feeds}</strong>
      {:else}
        {$t.feeds}
      {/if}
    </a>
  </div>
  <div>
    <a href={getURL('settings')}>
      {#if $router.route === 'settings'}
        <strong>{$t.settings}</strong>
      {:else}
        {$t.settings}
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
