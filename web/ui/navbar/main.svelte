<script lang="ts">
  import { mdiFireplace, mdiFood } from '@mdi/js'
  import { router, navbarMessages as t } from '@slowreader/core'

  import { getURL } from '../../stores/router.js'
  import Hotkey from '../hotkey.svelte'
  import Icon from '../icon.svelte'
</script>

<div class="navbar-main">
  <a
    class="navbar-main_link"
    aria-controls="navbar_submenu"
    aria-current={$router.route === 'slow' ? 'page' : null}
    aria-haspopup="menu"
    aria-keyshortcuts="s"
    href={getURL('slow')}
  >
    <div class="navbar-main_overflow">
      <div class="navbar-main_button">
        <div class="navbar-main_fire">
          <Icon path={mdiFireplace} />
        </div>
        <Icon compensate={1} path={mdiFireplace} />
        {$t.slow}
        <Hotkey hotkey="s" />
      </div>
    </div>
  </a>
  <a
    class="navbar-main_link"
    aria-controls="navbar_submenu"
    aria-current={$router.route === 'fast' ? 'page' : null}
    aria-haspopup="menu"
    aria-keyshortcuts="f"
    href={getURL('fast')}
  >
    <div class="navbar-main_overflow">
      <div class="navbar-main_button">
        <Icon path={mdiFood} />
        {$t.fast}
        <Hotkey hotkey="f" />
      </div>
    </div>
  </a>
</div>

<style>
  .navbar-main {
    position: relative;
    display: flex;
    padding: var(--padding-m) var(--padding-m) 0 var(--padding-m);
  }

  .navbar-main_link {
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

    & .navbar-main_overflow {
      padding: 5px;
      margin: -5px;
      overflow: hidden;
      background: var(--land-color);
    }

    &:first-child .navbar-main_overflow {
      padding-inline-end: 0;
      margin-inline-end: 0;
    }

    &:last-child .navbar-main_overflow {
      padding-inline-start: 0;
      margin-inline-start: 0;
    }

    & .navbar-main_button {
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

    & .navbar-main_fire {
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

    &:hover .navbar-main_fire,
    &:focus-visible .navbar-main_fire {
      display: block;
    }

    &[aria-current='page'] .navbar-main_fire {
      display: none;
    }

    &:first-child .navbar-main_button {
      border-start-end-radius: 0;
      border-end-end-radius: 0;
    }

    &:last-child .navbar-main_button {
      border-start-start-radius: 0;
      border-end-start-radius: 0;
    }

    &:hover .navbar-main_button,
    &:focus-visible .navbar-main_button,
    &:active .navbar-main_button {
      background: var(--hover-color);
    }

    &[aria-current='page'] .navbar-main_button,
    &[aria-current='page']:hover .navbar-main_button {
      cursor: default;
      background: var(--card-color);
      box-shadow: var(--button-pressed-shadow);
    }

    &:active .navbar-main_button {
      box-shadow: var(--button-active-shadow);
    }

    @media (prefers-color-scheme: light) {
      &:active .navbar-main_button,
      &[aria-current='page'] .navbar-main_button {
        height: calc(var(--control-height) - 2px);
        margin-block: 1px;
      }

      &:active .navbar-main_button {
        padding-top: 1px;
      }

      &[aria-current='page'] .navbar-main_button {
        padding-top: 0;
      }
    }

    @media (prefers-color-scheme: dark) {
      &:active .navbar-main_button,
      &[aria-current='page'] .navbar-main_button {
        height: calc(var(--control-height) - 1px);
        margin-bottom: 1px;
      }

      &:active .navbar-main_button {
        padding-top: 2px;
      }

      &[aria-current='page'] .navbar-main_button {
        padding-top: 1px;
      }
    }
  }
</style>
