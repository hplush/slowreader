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
  import { onMount, tick } from 'svelte'
  import { on } from 'svelte/events'

  import {
    getHashWithoutLastPopup,
    getPopupHash,
    getURL
  } from '../../stores/url-router.ts'
  import NavbarButton from '../navbar/button.svelte'
  import NavbarFireplace from '../navbar/fireplace.svelte'
  import NavbarOther from '../navbar/other.svelte'
  import NavbarProgress from '../navbar/progress.svelte'
  import NavbarSync from '../navbar/sync.svelte'

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

  function moveFocusBack(): void {
    tick().then(() => {
      let button = document.querySelector<HTMLAnchorElement>(
        '.navbar-button[aria-current="page"]'
      )
      if (button) button.tabIndex = 0
    })
  }

  let nothingCurrent = $derived(
    !isOtherRoute($router) &&
      $router.route !== 'slow' &&
      $router.route !== 'fast'
  )
</script>

<nav
  class="navbar"
  class:is-fast={$router.route === 'fast'}
  class:is-other={isOtherRoute($router)}
  class:is-slow={$router.route === 'slow'}
>
  <div class="navbar_main" aria-orientation="horizontal" role="menu">
    {#if $openedPopups.length > 0}
      <div class="navbar_back-button">
        <NavbarButton
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
        <NavbarButton
          name={$t.refresh}
          href={getPopupHash($router, 'refresh', '1')}
          size="icon"
        >
          <NavbarProgress value={$refreshProgress} />
        </NavbarButton>
      {:else}
        <NavbarButton
          name={$t.refresh}
          icon={mdiRefresh}
          onclick={() => {
            refreshPosts()
            moveFocusBack()
          }}
          size="icon"
        />
      {/if}
    </div>
    <div class="navbar_switcher">
      <div class="navbar_gutter"></div>
      <div class="navbar_current"></div>
      <NavbarButton
        name={$t.slow}
        current={$router.route === 'slow'}
        focusable={nothingCurrent || $router.route === 'slow'}
        hasSubmenu="navbar_submenu"
        href={getURL('slow')}
        onclick={openMenu}
      >
        <NavbarFireplace />
      </NavbarButton>
      <NavbarButton
        name={$t.fast}
        current={$router.route === 'fast'}
        hasSubmenu="navbar_submenu"
        href={getURL('fast')}
        icon={mdiFood}
        onclick={openMenu}
      />
    </div>
    <NavbarButton
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
    }

    :root.has-navbar {
      --navbar-width: 16rem;
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
        align-items: center;
        width: 100vw;
        box-shadow: var(--float-shadow);

        @mixin background var(--main-land-color);
      }
    }

    .navbar_main {
      display: flex;
      gap: 0.125rem;
      justify-content: stretch;
      padding: 0.25rem 0 0 0.125rem;

      @media (width <= 64rem) {
        justify-content: space-between;
        width: 20rem;
        max-width: 100%;
        padding: 0.25rem;
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

    .navbar_switcher {
      position: relative;
      display: flex;
      flex-grow: 1;

      @media (width <= 64rem) {
        max-width: 33rem;
      }
    }

    .navbar_gutter {
      position: absolute;
      inset: -0;
      z-index: 1;
      background: --tune-background(--secondary);
      border-radius: calc(var(--base-radius) + 0.125rem);
      box-shadow: var(--gutter-shadow);
      transition: right 150ms;
      corner-shape: squircle;

      .navbar.is-other & {
        inset-inline-end: calc(-0.125rem - var(--control-height));
      }
    }

    .navbar_current {
      position: absolute;
      inset-inline-start: 0.125rem;
      top: 0.125rem;
      bottom: 0.125rem;
      z-index: 2;
      display: none;
      width: calc(50% - 0.25rem);
      background: --tune-background(--current);
      border-radius: var(--base-radius);
      box-shadow: var(--current-shadow);
      transition:
        left 150ms,
        width 150ms;
      corner-shape: squircle;

      .navbar.is-slow & {
        display: block;
      }

      .navbar.is-fast & {
        inset-inline-start: calc(50% + 0.125rem);
        display: block;
      }

      .navbar.is-other & {
        inset-inline-start: calc(100% + 0.25rem);
        display: block;
        width: calc(var(--control-height) - 0.25rem);
      }
    }

    .navbar_submenu {
      position: relative;
      box-sizing: border-box;
      display: flex;
      flex-grow: 1;
      flex-shrink: 1;
      flex-direction: column;
      gap: 0.125rem;
      padding: 0.125rem 0.25rem 0;
      margin-inline-end: -0.5rem;
      overflow-y: auto;

      @media (width <= 64rem) {
        display: none;
        order: -1;
        width: 100%;
        max-height: calc(100vh - var(--control-height) - 0.5rem);
        margin-inline-end: 0;
      }

      &.is-opened {
        display: flex;
      }
    }
  }
</style>
