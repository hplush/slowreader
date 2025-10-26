<script lang="ts">
  import { mdiFood, mdiMenu, mdiRefresh } from '@mdi/js'
  import {
    closeMenu,
    getFastDefaultRoute,
    getSlowDefaultRoute,
    isMenuOpened,
    isOtherRoute,
    isRefreshing,
    openMenu,
    refreshPosts,
    refreshProgress,
    router,
    navbarMessages as t
  } from '@slowreader/core'
  import { onMount, tick } from 'svelte'
  import { on } from 'svelte/events'

  import { getPopupHash, getURL } from '../../stores/url-router.ts'
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
    <div class="navbar_switcher">
      <div class="navbar_gutter"></div>
      <div class="navbar_slider"></div>
      <NavbarButton
        name={$t.slow}
        current={$router.route === 'slow'}
        focusable={nothingCurrent || $router.route === 'slow'}
        hasSubmenu="navbar_submenu"
        href={getURL(getSlowDefaultRoute())}
        onclick={openMenu}
      >
        <NavbarFireplace />
      </NavbarButton>
      <NavbarButton
        name={$t.fast}
        current={$router.route === 'fast'}
        hasSubmenu="navbar_submenu"
        href={getURL(getFastDefaultRoute())}
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
    /* Change mobile Chrome bottom panel to fit with navbar */
    body {
      background: var(--land-color);

      @media (--no-desktop) {
        :root.has-navbar & {
          background: var(--main-land-color);

          /* For Safari */
          @supports (-webkit-touch-callout: none) {
            background: var(--land-color);
          }
        }
      }
    }

    .navbar {
      position: fixed;
      inset-block: 0;
      inset-inline-start: 0;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;

      @media (--desktop) {
        width: calc(var(--navbar-width) + 0.3125rem);
      }

      @media (--no-desktop) {
        @mixin background var(--main-land-color);

        inset-block: unset;
        bottom: 0;
        z-index: 10;
        align-items: center;
        width: 100vw;
        box-shadow: var(--bottom-panel-shadow);
      }
    }

    .navbar_main {
      box-sizing: border-box;
      display: flex;
      gap: 0.125rem;
      justify-content: stretch;
      padding: var(--navbar-padding);

      @media (--no-desktop) {
        justify-content: space-between;
        width: calc(var(--thin-content-width) + 2 * var(--page-padding));
        max-width: 100%;
        height: var(--navbar-height);
        padding-inline: var(--page-padding);
      }
    }

    .navbar_switcher {
      position: relative;
      display: flex;
      flex-grow: 1;

      @media (--no-desktop) {
        max-width: 33rem;
      }
    }

    .navbar_gutter {
      position: absolute;
      inset: -0;
      z-index: 1;
      background: --tune-background(--gutter);
      border-radius: calc(var(--base-radius) + var(--slider-padding));
      box-shadow: var(--field-shadow);
      transition: right var(--simple-time) var(--slide-easing);
      corner-shape: squircle;

      .navbar.is-other & {
        inset-inline-end: calc(
          -1 * var(--slider-padding) - var(--control-height)
        );
      }
    }

    .navbar_slider {
      position: absolute;
      inset-inline-start: var(--slider-padding);
      top: var(--slider-padding);
      bottom: var(--slider-padding);
      z-index: 2;
      display: none;
      width: calc(50% - 2 * var(--slider-padding));
      background: --tune-background(--current);
      border-radius: var(--base-radius);
      box-shadow: var(--button-shadow);
      transition:
        left var(--simple-time) var(--slide-easing),
        width var(--simple-time) var(--slide-easing);
      corner-shape: squircle;

      .navbar.is-slow & {
        display: block;
      }

      .navbar.is-fast & {
        inset-inline-start: calc(50% + var(--slider-padding));
        display: block;
      }

      .navbar.is-other & {
        inset-inline-start: calc(100% + 2 * var(--slider-padding));
        display: block;
        width: calc(var(--control-height) - 2 * var(--slider-padding));
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
      padding: 0.25rem 0.375rem;
      overflow-y: auto;

      @media (--desktop) {
        margin-top: -0.25rem;
      }

      @media (--no-desktop) {
        order: -1;
        width: 100%;
        max-height: 0;
        margin-inline-end: 0;
        overflow: hidden;
        box-shadow: inset 0 -0.5px 0 oklch(0 0 0 / 30%);
        transition:
          max-height var(--big-time) var(--slide-easing),
          padding var(--big-time) var(--slide-easing);

        &:not(.is-opened) {
          padding-block: 0;
        }

        &.is-opened {
          max-height: calc(100vh - var(--control-height) - 0.5rem);
          overflow: auto;
          transition-duration: var(--big-time);
        }

        &:empty {
          transition: none;
        }
      }
    }
  }
</style>
