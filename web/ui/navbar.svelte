<script lang="ts">
  import { mdiChevronLeft, mdiFood, mdiMenu, mdiRefresh } from '@mdi/js'
  import {
    closeMenu,
    isMenuOpened,
    isOtherRoute,
    isRefreshing,
    openedPopups,
    openMenu,
    refreshPosts,
    refreshProgress,
    router,
    navbarMessages as t
  } from '@slowreader/core'
  import { onMount } from 'svelte'
  import { on } from 'svelte/events'

  import {
    getHashWithoutLastPopup,
    getPopupHash,
    getURL
  } from '../stores/url-router.ts'
  import Icon from './icon.svelte'
  import NavbarFireplace from './navbar/fireplace.svelte'
  import NavbarItem from './navbar/item.svelte'
  import NavbarOther from './navbar/other.svelte'
  import NavbarProgress from './navbar/progress.svelte'
  import NavbarSync from './navbar/sync.svelte'

  let removeEvent: (() => void) | undefined
  isMenuOpened.listen((isOpened: boolean) => {
    if (isOpened) {
      setTimeout(() => {
        removeEvent = on(document, 'click', closeMenu)
      }, 1)
    } else {
      removeEvent?.()
    }
  })

  onMount(() => {
    document.documentElement.classList.add('has-navbar')
    return () => {
      removeEvent?.()
      document.documentElement.classList.remove('has-navbar')
    }
  })

  let nothingCurrent = $derived(
    !isOtherRoute($router) &&
      $router.route !== 'slow' &&
      $router.route !== 'fast'
  )
</script>

<nav class="navbar">
  <div class="navbar_main" aria-orientation="horizontal" role="menu">
    {#if $openedPopups.length > 0}
      <div class="navbar_back-button">
        <NavbarItem
          name={$t.back}
          href={getHashWithoutLastPopup($router)}
          icon={mdiChevronLeft}
          size="icon"
        />
      </div>
    {/if}
    <div
      class="navbar_refresh-button"
      class:is-hidden={$openedPopups.length > 0}
    >
      {#if $isRefreshing}
        <NavbarItem
          name={$t.refresh}
          href={getPopupHash($router, 'refresh', '1')}
          size="icon"
        >
          <NavbarProgress value={$refreshProgress} />
        </NavbarItem>
      {:else}
        <NavbarItem
          name={$t.refresh}
          icon={mdiRefresh}
          onclick={refreshPosts}
          size="icon"
        />
      {/if}
    </div>
    <div class="navbar_switcher">
      <a
        class="navbar_link"
        aria-controls="navbar_submenu"
        aria-current={$router.route === 'slow' ? 'page' : null}
        aria-haspopup="menu"
        href={getURL('slow')}
        onclick={openMenu}
        role="menuitem"
        tabindex={$router.route === 'slow' || nothingCurrent ? 0 : -1}
      >
        <span class="navbar_link-cap">
          <NavbarFireplace />
          {$t.slow}
        </span>
      </a>
      <a
        class="navbar_link"
        aria-controls="navbar_submenu"
        aria-current={$router.route === 'fast' ? 'page' : null}
        aria-haspopup="menu"
        href={getURL('fast')}
        onclick={openMenu}
        role="menuitem"
        tabindex={$router.route === 'fast' ? 0 : -1}
      >
        <span class="navbar_link-cap">
          <Icon path={mdiFood} />
          {$t.fast}
        </span>
      </a>
    </div>
    <NavbarItem
      name={$t.menu}
      current={isOtherRoute($router)}
      hasSubmenu="navbar_submenu"
      href={isOtherRoute($router)
        ? undefined
        : getURL({
            params: { candidate: undefined, url: undefined },
            route: 'add'
          })}
      icon={mdiMenu}
      onclick={openMenu}
      size="icon"
    />
  </div>
  <div
    id="navbar_submenu"
    class="navbar_submenu"
    class:is-opened={$isMenuOpened}
    aria-hidden="true"
    role="menu"
  >
    {#if isOtherRoute($router)}
      <NavbarOther />
    {/if}
  </div>
  <NavbarSync />
</nav>

<style lang="postcss">
  :global {
    :root {
      --navbar-width: 0;
      --navbar-height: 0;
      --navbar-item: 2rem;
    }

    :root.has-navbar {
      --navbar-width: 17rem;
      --navbar-height: 3.8rem;
    }

    .navbar {
      position: fixed;
      inset-block: 0;
      inset-inline-start: 0;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      width: var(--navbar-width);

      @media (width <= 64rem) {
        inset-block: unset;
        bottom: 0;
        width: 100vw;
        background-color: var(--main-land-color);
        box-shadow: var(--float-shadow);
      }
    }

    .navbar_main {
      display: flex;
      gap: 0.25rem;
      justify-content: stretch;
      padding: 0.5rem 0 0 0.25rem;

      @media (width <= 64rem) {
        justify-content: space-between;
        padding: 0.5rem;
      }
    }

    .navbar_back-button {
      display: none;

      @media (width <= 64rem) {
        display: block;
      }
    }

    .navbar_refresh-button.is-hidden {
      @media (width <= 64rem) {
        display: none;
      }
    }

    .navbar_submenu {
      position: relative;
      display: flex;
      flex-grow: 1;
      flex-shrink: 1;
      flex-direction: column;
      gap: 0.125rem;
      padding: 0.5rem 0.5rem 0 0.25rem;
      margin-inline-end: -0.5rem;
      overflow-y: auto;

      @media (width <= 64rem) {
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

      /* 1px gap on any scale */
      /* stylelint-disable-next-line unit-disallowed-list */
      gap: 1px;

      @media (width <= 64rem) {
        max-width: 33rem;
      }
    }

    .navbar_link {
      @mixin clickable;

      display: flex;
      justify-content: center;

      /* 1px gap on any scale */
      /* stylelint-disable-next-line unit-disallowed-list */
      width: calc(50% - 0.5px);
      color: var(--text-color);
      background: --tune-background(--secondary);
      corner-shape: squircle;

      &:first-child {
        border-radius: var(--base-radius) 0 0 var(--base-radius);
      }

      &:last-child {
        border-radius: 0 var(--base-radius) var(--base-radius) 0;
      }

      &[aria-current='page'] {
        color: var(--current-background);
        cursor: default;
        background: var(--text-color);
      }

      &:active:not([aria-current='page']) {
        box-shadow: var(--pressed-shadow);
      }

      &:hover:not([aria-current='page']),
      &:active:not([aria-current='page']),
      &:focus-visible:not([aria-current='page']) {
        background: --tune-background(--secondary, --secondary-hover);
      }
    }

    .navbar_link-cap {
      box-sizing: border-box;
      display: flex;
      gap: 0.375rem;
      align-items: center;
      justify-content: center;
      height: var(--navbar-item);

      .navbar_link:active:not([aria-current='page']) & {
        translate: 0 1px;
      }
    }
  }
</style>
