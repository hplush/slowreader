<script lang="ts">
  import {
    mdiCogOutline,
    mdiPlaylistEdit,
    mdiPlusCircleOutline,
    mdiRefresh
  } from '@mdi/js'
  import {
    hasFeeds,
    isRefreshing,
    isSettingsRoute,
    refreshPosts,
    refreshProgress,
    router
  } from '@slowreader/core'
  import { navbarMessages as t } from '@slowreader/core/messages'
  import { onMount } from 'svelte'

  import { getURL } from '../../stores/router.js'
  import UiLoader from '../loader.svelte'
  import UiNavbarItem from './item.svelte'
  import UiNavbarSettings from './settings.svelte'
  import UiNavbarSubmenu from './submenu.svelte'
  import UiNavbarSwitcher from './switcher.svelte'

  let submenu: UiNavbarSubmenu

  onMount(() => {
    document.documentElement.classList.add('has-navbar')
    return () => {
      document.documentElement.classList.remove('has-navbar')
    }
  })
</script>

<nav class="navbar">
  <UiNavbarSwitcher />
  <div class="navbar_submenu">
    <UiNavbarSubmenu bind:this={submenu}>
      {#if isSettingsRoute($router)}
        <UiNavbarSettings />
      {/if}
    </UiNavbarSubmenu>
  </div>
  <div class="navbar_other">
    {#if $hasFeeds}
      {#if $isRefreshing}
        <UiNavbarItem
          current={$router.route === 'refresh'}
          href={getURL('refresh')}
        >
          <UiLoader label={$t.refreshing} value={$refreshProgress} />
        </UiNavbarItem>
      {:else}
        <UiNavbarItem
          current={$router.route === 'refresh'}
          hotkey="r"
          icon={mdiRefresh}
          on:click={() => {
            refreshPosts()
          }}
        >
          {$t.refresh}
        </UiNavbarItem>
      {/if}
    {/if}
    <UiNavbarItem
      current={$router.route === 'add' || $router.route === 'preview'}
      hotkey="a"
      href={getURL('add')}
      icon={mdiPlusCircleOutline}
    >
      {$t.add}
    </UiNavbarItem>
    <UiNavbarItem
      current={$router.route === 'feeds' || $router.route === 'feed'}
      hotkey="l"
      href={getURL('feeds')}
      icon={mdiPlaylistEdit}
    >
      {$t.feeds}
    </UiNavbarItem>
    <UiNavbarItem
      current={isSettingsRoute($router)}
      hotkey="p"
      href={getURL('interface')}
      icon={mdiCogOutline}
      {submenu}
    >
      {$t.settings}
    </UiNavbarItem>
  </div>
</nav>

<style>
  :root {
    --navbar-width: 0;
  }

  :root.has-navbar {
    --navbar-width: 210px;
  }

  .navbar {
    position: fixed;
    inset-block: 0;
    inset-inline-start: 0;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    width: var(--navbar-width);
  }

  .navbar_submenu,
  .navbar_other {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: var(--padding-m);
  }

  .navbar_submenu {
    flex-grow: 1;
    overflow: scroll;
  }

  .navbar_other {
    padding-top: 0;
  }
</style>
