<script lang="ts">
  import {
    isRefreshing,
    refreshPosts,
    refreshProgress,
    router
  } from '@slowreader/core'
  import { navbarMessages as t } from '@slowreader/core/messages'
  import { onMount } from 'svelte'

  import { getURL } from '../../stores/router.js'
  import UiNavbarSwitcher from './switcher.svelte'

  onMount(() => {
    document.documentElement.classList.add('has-navbar')
    return () => {
      document.documentElement.classList.remove('has-navbar')
    }
  })
</script>

<nav>
  <UiNavbarSwitcher />
  <div>
    {#if $isRefreshing}
      <a href={getURL('refresh')}>
        <progress aria-label={$t.refreshing} max="100" value={$refreshProgress}>
          {$refreshProgress}%
        </progress>
      </a>
    {:else}
      <button on:click={refreshPosts}>{$t.refresh}</button>
    {/if}
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
  <div>
    <a href={getURL('profile')}>
      {#if $router.route === 'profile'}
        <strong>{$t.profile}</strong>
      {:else}
        {$t.profile}
      {/if}
    </a>
  </div>
  <div>
    <a href={getURL('about')}>
      {#if $router.route === 'about'}
        <strong>{$t.about}</strong>
      {:else}
        {$t.about}
      {/if}
    </a>
  </div>
</nav>

<style>
  :root {
    --navbar-width: 0;
  }

  :root.has-navbar {
    --navbar-width: 200px;
  }

  nav {
    position: fixed;
    inset-block: 0;
    inset-inline-start: 0;
    box-sizing: border-box;
    width: var(--navbar-width);
    padding: var(--padding-m);
  }
</style>
