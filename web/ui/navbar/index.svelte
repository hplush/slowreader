<script lang="ts">
  import {
    mdiAlertCircle,
    mdiCheckCircleOutline,
    mdiFood,
    mdiMenu,
    mdiRefresh
  } from '@mdi/js'
  import {
    closeMenu,
    isOtherRoute,
    isRefreshing,
    layoutType,
    menuSlider,
    openedMenu,
    openMenu,
    refreshPosts,
    refreshProgress,
    refreshStatus,
    router,
    navbarMessages as t
  } from '@slowreader/core'
  import { effect } from 'nanostores'
  import { onMount, tick } from 'svelte'
  import { on } from 'svelte/events'

  import { getPopupHash, getURL } from '../../stores/url-router.ts'
  import Announce from '../announce.svelte'
  import Icon from '../icon.svelte'
  import NavbarButton from '../navbar/button.svelte'
  import NavbarFast from '../navbar/fast.svelte'
  import NavbarFireplace from '../navbar/fireplace.svelte'
  import NavbarOther from '../navbar/other.svelte'
  import NavbarProgress from '../navbar/progress.svelte'
  import NavbarSlow from '../navbar/slow.svelte'
  import NavbarSync from '../navbar/sync.svelte'

  let removeEvent: (() => void) | undefined
  effect([openedMenu, layoutType], (menu, layout) => {
    removeEvent?.()
    if (layout !== 'desktop' && menu) {
      setTimeout(() => {
        removeEvent = on(document, 'click', e => {
          let clicked = e.target as HTMLElement
          if (
            !clicked.closest('.navbar') ||
            clicked.tagName === 'A' ||
            clicked.closest('a')
          ) {
            closeMenu()
          }
        })
      }, 1)
    } else {
      removeEvent = undefined
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
  class:is-comfort-mode={$openedMenu && $openedMenu !== 'fast'}
  class:is-fast={$menuSlider === 'fast'}
  class:is-non-comfort-mode={$openedMenu && $openedMenu === 'fast'}
  class:is-opened={!!$openedMenu}
  class:is-other={$menuSlider === 'other'}
  class:is-slow={$menuSlider === 'slow'}
>
  <div class="navbar_main" aria-orientation="horizontal" role="menu">
    <div class="navbar_refresh">
      {#if $isRefreshing}
        <NavbarButton
          name={$t.refresh}
          href={getPopupHash($router, 'refresh', '1')}
          size="icon"
        >
          <NavbarProgress value={$refreshProgress} />
        </NavbarButton>
      {:else if $refreshStatus === 'error'}
        <NavbarButton
          name={$t.refresh}
          href={getPopupHash($router, 'refresh', '1')}
          icon={mdiRefresh}
          size="icon"
        />
      {:else}
        <NavbarButton
          name={$t.refresh}
          icon={$refreshStatus === 'done' ? mdiCheckCircleOutline : mdiRefresh}
          onclick={() => {
            refreshPosts()
            moveFocusBack()
          }}
          size="icon"
        />
      {/if}
      {#if $refreshStatus === 'done'}
        <Announce text={$t.refreshingError} />
      {/if}
      {#if $refreshStatus === 'error' || $refreshStatus === 'refreshingError'}
        <Announce text={$t.refreshingDone} />
        <div class="navbar_error">
          <Icon path={mdiAlertCircle} />
        </div>
      {/if}
    </div>
    <div class="navbar_switcher">
      <div class="navbar_gutter"></div>
      <div class="navbar_slider"></div>
      <NavbarButton
        name={$t.slow}
        current={$router.route === 'slow'}
        focusable={nothingCurrent || $router.route === 'slow'}
        hasSubmenu="navbar_submenu"
        href={getURL('slow')}
        onclick={e => {
          if (!openMenu('slow')) e.preventDefault()
        }}
      >
        <NavbarFireplace />
      </NavbarButton>
      <NavbarButton
        name={$t.fast}
        current={$router.route === 'fast'}
        hasSubmenu="navbar_submenu"
        href={getURL('fast')}
        icon={mdiFood}
        onclick={e => {
          if (!openMenu('fast')) e.preventDefault()
        }}
      />
    </div>
    <NavbarButton
      name={$t.menu}
      current={isOtherRoute($router)}
      hasSubmenu="navbar_submenu"
      href={getURL({
        params: { candidate: undefined, url: undefined },
        route: 'add'
      })}
      icon={mdiMenu}
      onclick={e => {
        if (!openMenu('other')) e.preventDefault()
      }}
      size="icon"
    />
  </div>
  <div
    id="navbar_submenu"
    class="navbar_submenu"
    aria-hidden="true"
    role="menu"
  >
    {#if $openedMenu === 'slow'}
      <NavbarSlow />
    {:else if $openedMenu === 'fast'}
      <NavbarFast />
    {:else if $openedMenu === 'other'}
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
        inset-block: unset;
        bottom: 0;
        z-index: 10;
        align-items: center;
        width: 100vw;
      }
    }

    .navbar_main {
      box-sizing: border-box;
      display: flex;
      gap: 0.125rem;
      justify-content: stretch;
      padding: var(--navbar-padding);

      @media (--no-desktop) {
        @mixin background var(--main-land-color);

        z-index: 2;
        justify-content: center;
        width: stretch;
        height: var(--navbar-height);
        padding-inline: 1rem;

        .navbar:not(.is-opened) & {
          box-shadow: var(--bottom-panel-shadow);
        }
      }
    }

    .navbar_switcher {
      position: relative;
      display: flex;
      flex-grow: 1;

      @media (--no-desktop) {
        max-width: calc(
          var(--thin-content-width) - 2 * var(--control-height) - 0.25rem
        );
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

    .navbar_refresh {
      position: relative;
      width: var(--control-height);
      height: var(--control-height);
    }

    .navbar_error {
      position: absolute;
      inset-inline-end: 0;
      top: 0;
      z-index: 10;
      color: var(--dangerous-text-color);

      --icon-size: 0.75rem;
    }

    .navbar_submenu {
      position: relative;
      box-sizing: border-box;
      display: flex;
      flex-grow: 1;
      flex-shrink: 1;
      flex-direction: column;
      gap: 0.125rem;
      padding: 0.25rem 0.375rem 0.75rem;
      overflow-y: auto;

      @media (--desktop) {
        margin-top: -0.25rem;
      }

      @media (--no-desktop) {
        @mixin background var(--main-land-color);

        position: absolute;
        bottom: 0;
        z-index: 1;
        width: 100%;
        max-height: calc(100vh - var(--navbar-height) + var(--min-size));
        padding-block: 0.5rem;
        margin-inline-end: 0;
        margin-bottom: var(--navbar-height);
        overflow: hidden;
        overflow: auto;
        box-shadow:
          inset 0 -0.5px 0 oklch(0 0 0 / 30%),
          var(--bottom-panel-shadow);
        translate: 0 100%;
        transition: translate var(--big-time) var(--slide-easing);

        .navbar.is-opened & {
          translate: 0 0;
        }

        &:empty {
          padding: 0;
          transition: none;
        }
      }
    }
  }
</style>
