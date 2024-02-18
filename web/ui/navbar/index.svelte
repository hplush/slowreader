<script lang="ts">
  import { mdiCogOutline, mdiPlaylistEdit, mdiRefresh } from '@mdi/js'
  import {
    hasFeeds,
    isFastRoute,
    isOrganizeRoute,
    isRefreshing,
    isSettingsRoute,
    isSlowRoute,
    refreshPosts,
    refreshProgress,
    router,
    navbarMessages as t
  } from '@slowreader/core'
  import { onMount } from 'svelte'

  import { getURL } from '../../stores/router.js'
  import Loader from '../loader.svelte'
  import NavbarFast from './fast.svelte'
  import NavbarFeeds from './feeds.svelte'
  import NavbarItem from './item.svelte'
  import NavbarSettings from './settings.svelte'
  import NavbarSlow from './slow.svelte'
  import NavbarSubmenu from './submenu.svelte'
  import NavbarSwitcher from './switcher.svelte'

  onMount(() => {
    document.documentElement.classList.add('has-navbar')
    return () => {
      document.documentElement.classList.remove('has-navbar')
    }
  })
</script>

<nav class="navbar">
  <NavbarSwitcher />
  <div class="navbar_submenu">
    <NavbarSubmenu>
      {#if isSlowRoute($router)}
        <NavbarSlow />
      {:else if isFastRoute($router)}
        <NavbarFast />
      {:else if isSettingsRoute($router)}
        <NavbarSettings />
      {:else if isOrganizeRoute($router)}
        <NavbarFeeds />
      {/if}
    </NavbarSubmenu>
  </div>
  <div class="navbar_other">
    {#if $hasFeeds}
      {#if $isRefreshing}
        <NavbarItem
          current={$router.route === 'refresh'}
          href={getURL('refresh')}
        >
          <Loader label={$t.refreshing} value={$refreshProgress} />
        </NavbarItem>
      {:else}
        <NavbarItem
          name={$t.refresh}
          current={$router.route === 'refresh'}
          hotkey="r"
          icon={mdiRefresh}
          on:click={() => {
            refreshPosts()
          }}
        />
      {/if}
    {/if}
    <NavbarItem
      name={$t.feeds}
      current={isOrganizeRoute($router)}
      hotkey="l"
      href={getURL('add')}
      icon={mdiPlaylistEdit}
      submenu
    />
    <NavbarItem
      name={$t.settings}
      current={isSettingsRoute($router)}
      hotkey="p"
      href={getURL('interface')}
      icon={mdiCogOutline}
      submenu
    />
  </div>
</nav>

<style>
  :root {
    --navbar-width: 0;
  }

  :global(:root.has-navbar) {
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
