<script lang="ts">
  import { mdiChevronLeft, mdiFood, mdiMenu, mdiRefresh } from '@mdi/js'
  import {
    backRoute,
    isFastRoute,
    isOtherRoute,
    isRefreshing,
    isSlowRoute,
    refreshPosts,
    refreshProgress,
    router,
    navbarMessages as t
  } from '@slowreader/core'
  import { onMount } from 'svelte'

  import { getURL } from '../../stores/router.js'
  import Hotkey from '../hotkey.svelte'
  import Icon from '../icon.svelte'
  import NavbarFireplace from '../navbar/fireplace.svelte'
  import NavbarFast from './fast.svelte'
  import NavbarItem from './item.svelte'
  import NavbarOther from './other.svelte'
  import NavbarProgress from './progress.svelte'
  import NavbarSlow from './slow.svelte'

  let isMenuOpened = false

  function closeOnAnyClick(): void {
    if (isMenuOpened) {
      isMenuOpened = false
      document.removeEventListener('click', closeOnAnyClick)
    }
  }

  onMount(() => {
    document.documentElement.classList.add('has-navbar')
    return () => {
      document.removeEventListener('click', closeOnAnyClick)
      document.documentElement.classList.remove('has-navbar')
    }
  })

  function openMenu(): void {
    isMenuOpened = true
    setTimeout(() => {
      document.addEventListener('click', closeOnAnyClick)
    }, 1)
  }
</script>

<nav class="navbar">
  <div class="navbar_main" aria-orientation="horizontal" role="menu">
    {#if $backRoute}
      <div class="navbar_back-button">
        <NavbarItem
          name={$t.back}
          current={true}
          href={getURL($backRoute)}
          icon={mdiChevronLeft}
          small
        />
      </div>
    {/if}
    <div class={`navbar_refresh-button ${$backRoute ? 'is-hidden' : ''}`}>
      {#if $isRefreshing}
        <NavbarItem
          name={$t.refresh}
          current={$router.route === 'refresh'}
          hotkey="r"
          href={getURL('refresh')}
          small
        >
          <NavbarProgress value={$refreshProgress} />
        </NavbarItem>
      {:else}
        <NavbarItem
          name={$t.refresh}
          current={$router.route === 'refresh'}
          hotkey="r"
          icon={mdiRefresh}
          small
          on:click={() => {
            refreshPosts()
          }}
        />
      {/if}
    </div>
    <div class="navbar_switcher">
      <a
        class="navbar_link"
        aria-controls="navbar_submenu"
        aria-current={$router.route === 'slow' ? 'page' : null}
        aria-haspopup="menu"
        aria-keyshortcuts="s"
        href={getURL('slow')}
        role="menuitem"
        on:click={openMenu}
      >
        <div class="navbar_overflow">
          <div class="navbar_button">
            <NavbarFireplace />
            <span>{$t.slow}</span>
            <Hotkey hotkey="s" />
          </div>
        </div>
      </a>
      <a
        class="navbar_link"
        aria-controls="navbar_submenu"
        aria-current={$router.route === 'fast' ? 'page' : null}
        aria-haspopup="menu"
        aria-keyshortcuts="f"
        href={getURL('fast')}
        role="menuitem"
        on:click={openMenu}
      >
        <div class="navbar_overflow">
          <div class="navbar_button">
            <Icon path={mdiFood} />
            <span>{$t.fast}</span>
            <Hotkey hotkey="f" />
          </div>
        </div>
      </a>
    </div>
    <NavbarItem
      name={$t.menu}
      current={isOtherRoute($router)}
      hotkey="m"
      href={isOtherRoute($router) ? undefined : getURL('add')}
      icon={mdiMenu}
      small
      submenu
      on:click={openMenu}
    />
  </div>
  <div
    id="navbar_submenu"
    class="navbar_submenu"
    class:is-opened={isMenuOpened}
    aria-hidden="true"
    role="menu"
  >
    {#if isSlowRoute($router)}
      <NavbarSlow />
    {:else if isFastRoute($router)}
      <NavbarFast />
    {:else if isOtherRoute($router)}
      <NavbarOther />
    {/if}
  </div>
</nav>

<style>
  :root {
    --navbar-width: 0;
    --navbar-height: 0;
    --navbar-item: 40px;
  }

  :global(:root.has-navbar) {
    --navbar-width: 290px;
    --navbar-height: 56px;
  }

  .navbar {
    position: fixed;
    inset-block: 0;
    inset-inline-start: 0;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    width: var(--navbar-width);

    @media (width <= 1024px) {
      inset-block: unset;
      bottom: 0;
      width: 100%;
      background-color: var(--land-color);
      box-shadow: var(--float-shadow);
    }
  }

  .navbar_main {
    display: flex;
    gap: var(--padding-s);
    justify-content: stretch;
    padding: var(--padding-m) var(--padding-m) 0 var(--padding-m);

    @media (width <= 1024px) {
      justify-content: space-between;
      padding: var(--padding-m);
    }
  }

  .navbar_back-button {
    display: none;

    @media (width <= 1024px) {
      display: block;
    }
  }

  .navbar_refresh-button.is-hidden {
    @media (width <= 1024px) {
      display: none;
    }
  }

  .navbar_submenu {
    position: relative;
    display: flex;
    flex-direction: column;
    flex-grow: 1;
    flex-shrink: 1;
    gap: 2px;
    padding: var(--padding-m);
    overflow-y: auto;

    @media (width <= 1024px) {
      display: none;
      order: -1;
    }

    &.is-opened {
      display: flex;
    }
  }

  .navbar_switcher {
    position: relative;
    display: flex;
    flex-grow: 1;

    @media (width <= 1024px) {
      max-width: 540px;
    }
  }

  .navbar_link {
    position: relative;
    width: 50%;
    border-radius: var(--radius);

    &:first-child {
      border-start-end-radius: 0;
      border-end-end-radius: 0;
    }

    &:last-child {
      margin-inline-start: -1px;
      border-start-start-radius: 0;
      border-end-start-radius: 0;
    }

    & .navbar_overflow {
      padding: 5px;
      margin: -5px;
      overflow: hidden;
      background: var(--land-color);
    }

    &:first-child .navbar_overflow {
      padding-inline-end: 0;
      margin-inline-end: 0;
    }

    &:last-child .navbar_overflow {
      padding-inline-start: 0;
      margin-inline-start: 0;
    }

    & .navbar_button {
      position: relative;
      box-sizing: border-box;
      display: inline-flex;
      gap: var(--padding-m);
      align-items: center;
      justify-content: center;
      width: 100%;
      height: var(--navbar-item);
      padding-inline: var(--padding-l);
      font-weight: 600;
      line-height: var(--navbar-item);
      color: var(--text-color);
      text-decoration: none;
      cursor: pointer;
      user-select: none;
      background: var(--card-color);
      border: none;
      border-radius: var(--radius);
      box-shadow: var(--button-shadow);
    }

    &:first-child .navbar_button {
      border-start-end-radius: 0;
      border-end-end-radius: 0;
    }

    &:last-child .navbar_button {
      border-start-start-radius: 0;
      border-end-start-radius: 0;
    }

    &:hover .navbar_button,
    &:focus-visible .navbar_button,
    &:active .navbar_button {
      background: var(--hover-color);
    }

    &[aria-current='page'] .navbar_button,
    &[aria-current='page']:hover .navbar_button {
      cursor: default;
      background: var(--card-color);
      box-shadow: var(--button-pressed-shadow);
    }

    &:active .navbar_button {
      box-shadow: var(--button-active-shadow);

      & > * {
        transform: translateY(1px);
      }
    }

    @media (prefers-color-scheme: light) {
      &:active .navbar_button,
      &[aria-current='page'] .navbar_button {
        height: calc(var(--navbar-item) - 2px);
        margin-block: 1px;
      }
    }

    @media (prefers-color-scheme: dark) {
      &:active .navbar_button,
      &[aria-current='page'] .navbar_button {
        height: calc(var(--navbar-item) - 1px);
        margin-bottom: 1px;
      }
    }
  }
</style>
