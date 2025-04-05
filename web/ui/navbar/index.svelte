<script lang="ts">
  import { mdiChevronLeft, mdiFood, mdiMenu, mdiRefresh } from '@mdi/js'
  import {
    backRoute,
    closeMenu,
    isMenuOpened,
    isOtherRoute,
    isRefreshing,
    openMenu,
    refreshPosts,
    refreshProgress,
    router,
    navbarMessages as t
  } from '@slowreader/core'
  import { onMount } from 'svelte'

  import { getURL } from '../../stores/router.ts'
  import Hotkey from '../hotkey.svelte'
  import Icon from '../icon.svelte'
  import NavbarFireplace from './fireplace.svelte'
  import NavbarFast from './fast.svelte'
  import NavbarItem from './item.svelte'
  import NavbarOther from './other.svelte'
  import NavbarProgress from './progress.svelte'
  import NavbarSlow from './slow.svelte'

  isMenuOpened.listen((isOpened: boolean) => {
    if (isOpened) {
      setTimeout(() => {
        document.addEventListener('click', closeMenu)
      }, 1)
    } else {
      document.removeEventListener('click', closeMenu)
    }
  })

  onMount(() => {
    document.documentElement.classList.add('has-navbar')
    return () => {
      document.removeEventListener('click', closeMenu)
      document.documentElement.classList.remove('has-navbar')
    }
  })
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
          onclick={refreshPosts}
          small
        />
      {/if}
    </div>
    <div class="navbar_switcher">
      <a
        class="navbar_link"
        aria-controls="navbar_submenu"
        aria-current={$router.route === 'slow' ? 'page' : null}
        aria-haspopup="menu"
        aria-keyshortcuts="u"
        href={getURL('slow')}
        onclick={openMenu}
        role="menuitem"
      >
        <div class="navbar_overflow">
          <div class="navbar_button">
            <NavbarFireplace />
            <span>{$t.slow}</span>
            <Hotkey hotkey="u" />
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
        onclick={openMenu}
        role="menuitem"
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
      href={isOtherRoute($router)
        ? undefined
        : getURL({
            params: { candidate: undefined, url: undefined },
            route: 'add'
          })}
      icon={mdiMenu}
      onclick={openMenu}
      small
      submenu
    />
  </div>
  <div
    id="navbar_submenu"
    class="navbar_submenu"
    class:is-opened={$isMenuOpened}
    aria-hidden="true"
    role="menu"
  >
    {#if $router.route === 'slow'}
      <NavbarSlow />
    {:else if $router.route === 'fast'}
      <NavbarFast />
    {:else if isOtherRoute($router)}
      <NavbarOther />
    {/if}
  </div>
</nav>

<style>
  :global {
    :root {
      --navbar-width: 0;
      --navbar-height: 0;
      --navbar-item: 36px;
      --navbar-color: var(--land-color);

      @media (width <= 1024px) {
        --navbar-color: var(--above-secondary-color);
      }
    }

    :root.has-navbar {
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
        width: 100vw;
        background-color: var(--navbar-color);
        box-shadow: var(--above-2-shadow);
      }
    }

    .navbar_main {
      display: flex;
      gap: 4px;
      justify-content: stretch;
      padding: 8px 0 0 4px;

      @media (width <= 1024px) {
        justify-content: space-between;
        padding: 8px;
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
      flex-grow: 1;
      flex-shrink: 1;
      flex-direction: column;
      gap: 2px;
      padding: 8px 0 0 4px;
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
        border-inline-start: 1px solid var(--border-color);
        border-start-start-radius: 0;
        border-end-start-radius: 0;
      }

      & .navbar_overflow {
        padding: 5px;
        margin: -5px;
        overflow: hidden;
        background: var(--navbar-color);
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
        gap: 6px;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: var(--navbar-item);
        padding-inline: 10px 16px;
        font: var(--control-font);
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

      &:focus-visible {
        outline: none;

        & .navbar_button {
          z-index: 10;
          outline: 3px solid var(--focus-color);
          outline-offset: -3px;
          transition:
            outline-width 200ms cubic-bezier(0.34, 1.56, 0.64, 1),
            outline-offset 200ms cubic-bezier(0.34, 1.56, 0.64, 1);
        }
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
  }
</style>
