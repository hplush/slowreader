<script lang="ts">
  import { mdiFireplace, mdiFood } from '@mdi/js'
  import { router, navbarMessages as t } from '@slowreader/core'

  import { getURL } from '../../stores/router.js'
  import Hotkey from '../hotkey.svelte'
  import Icon from '../icon.svelte'
</script>

<div class="navbar-switcher">
  <a
    class="navbar-switcher_link"
    aria-controls="navbar-submenu"
    aria-current={$router.route === 'slow' ? 'page' : null}
    aria-haspopup="menu"
    aria-keyshortcuts="s"
    href={getURL('slow')}
  >
    <div class="navbar-switcher_overflow">
      <div class="navbar-switcher_button">
        <div class="navbar-switcher_fire">
          <Icon path={mdiFireplace} />
        </div>
        <Icon compensate={1} path={mdiFireplace} />
        {$t.slow}
        <Hotkey hotkey="s" />
      </div>
    </div>
  </a>
  <a
    class="navbar-switcher_link"
    aria-controls="navbar-submenu"
    aria-current={$router.route === 'fast' ? 'page' : null}
    aria-haspopup="menu"
    aria-keyshortcuts="f"
    href={getURL('fast')}
  >
    <div class="navbar-switcher_overflow">
      <div class="navbar-switcher_button">
        <Icon path={mdiFood} />
        {$t.fast}
        <Hotkey hotkey="f" />
      </div>
    </div>
  </a>
</div>

<style>
  .navbar-switcher {
    position: relative;
    display: flex;
    padding: var(--padding-m) var(--padding-m) 0 var(--padding-m);
  }

  .navbar-switcher_link {
    position: relative;
    border-radius: var(--inner-radius);

    &:first-child {
      width: 50%;
      border-start-end-radius: 0;
      border-end-end-radius: 0;
    }

    &:last-child {
      width: calc(50% + 1px);
      margin-inline-start: -1px;
      border-start-start-radius: 0;
      border-end-start-radius: 0;
    }

    & .navbar-switcher_overflow {
      padding: 5px;
      margin: -5px;
      overflow: hidden;
      background: var(--land-color);
    }

    &:first-child .navbar-switcher_overflow {
      padding-inline-end: 0;
      margin-inline-end: 0;
    }

    &:last-child .navbar-switcher_overflow {
      padding-inline-start: 0;
      margin-inline-start: 0;
    }

    & .navbar-switcher_button {
      position: relative;
      box-sizing: border-box;
      display: inline-flex;
      gap: var(--padding-m);
      align-items: center;
      justify-content: center;
      width: 100%;
      height: var(--control-height);
      padding: 0 var(--padding-l);
      font-weight: 600;
      color: var(--text-color);
      text-decoration: none;
      cursor: pointer;
      user-select: none;
      background: var(--card-color);
      border: none;
      border-radius: var(--inner-radius);
      box-shadow: var(--button-shadow);
    }

    & .navbar-switcher_fire {
      --icon-move: -7px -4.5px;

      position: absolute;
      inset-inline-start: 20px;
      z-index: 2;
      display: none;
      width: 6px;
      height: 6px;
      margin-top: 6px;
      overflow: hidden;
      color: var(--fire-color);
      background: var(--hover-color);
    }

    &:hover .navbar-switcher_fire,
    &:focus-visible .navbar-switcher_fire {
      display: block;
    }

    &[aria-current='page'] .navbar-switcher_fire {
      display: none;
    }

    &:first-child .navbar-switcher_button {
      border-start-end-radius: 0;
      border-end-end-radius: 0;
    }

    &:last-child .navbar-switcher_button {
      border-start-start-radius: 0;
      border-end-start-radius: 0;
    }

    &:hover .navbar-switcher_button,
    &:focus-visible .navbar-switcher_button,
    &:active .navbar-switcher_button {
      background: var(--hover-color);
    }

    &[aria-current='page'] .navbar-switcher_button,
    &[aria-current='page']:hover .navbar-switcher_button {
      cursor: default;
      background: var(--card-color);
      box-shadow: var(--button-pressed-shadow);
    }

    &:active .navbar-switcher_button {
      box-shadow: var(--button-active-shadow);
    }

    @media (prefers-color-scheme: light) {
      &:active .navbar-switcher_button,
      &[aria-current='page'] .navbar-switcher_button {
        height: calc(var(--control-height) - 2px);
        margin-block: 1px;
      }

      &:active .navbar-switcher_button {
        padding-top: 1px;
      }

      &[aria-current='page'] .navbar-switcher_button {
        padding-top: 0;
      }
    }

    @media (prefers-color-scheme: dark) {
      &:active .navbar-switcher_button,
      &[aria-current='page'] .navbar-switcher_button {
        height: calc(var(--control-height) - 1px);
        margin-bottom: 1px;
      }

      &:active .navbar-switcher_button {
        padding-top: 2px;
      }

      &[aria-current='page'] .navbar-switcher_button {
        padding-top: 1px;
      }
    }
  }
</style>
