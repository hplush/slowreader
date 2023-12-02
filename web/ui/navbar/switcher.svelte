<script lang="ts">
  import { mdiFireplace, mdiFood } from '@mdi/js'
  import { router } from '@slowreader/core'
  import { navbarMessages as t } from '@slowreader/core/messages'
  import { onMount } from 'svelte'

  import { addHotkey } from '../../lib/hotkeys.js'
  import { getURL } from '../../stores/router.js'
  import UiHotkey from '../hotkey.svelte'
  import UiIcon from '../icon.svelte'

  let slow: HTMLElement
  let fast: HTMLElement

  onMount(() => {
    let slowUnbind = addHotkey('s', slow, () => {
      slow.click()
    })
    let fastUnbind = addHotkey('f', fast, () => {
      fast.click()
    })
    return () => {
      slowUnbind()
      fastUnbind()
    }
  })
</script>

<div class="navbar-switcher">
  <a
    bind:this={slow}
    class="navbar-switcher_link"
    aria-current={$router.route === 'slowAll' ? 'page' : null}
    href={getURL('slowAll')}
  >
    <div class="navbar-switcher_overflow">
      <div class="navbar-switcher_button">
        <UiIcon compensate={1} path={mdiFireplace} />
        {$t.slow}
        <UiHotkey hotkey="s" />
      </div>
    </div>
  </a>
  <a
    bind:this={fast}
    class="navbar-switcher_link"
    aria-current={$router.route === 'fast' ? 'page' : null}
    href={getURL('fast')}
  >
    <div class="navbar-switcher_overflow">
      <div class="navbar-switcher_button">
        <UiIcon path={mdiFood} />
        {$t.fast}
        <UiHotkey hotkey="f" />
      </div>
    </div>
  </a>
</div>

<style>
  .navbar-switcher {
    display: flex;
    padding-bottom: var(--padding-m);
  }

  .navbar-switcher_link {
    position: relative;
    flex-grow: 1;
    border-radius: var(--inner-radius);

    &:first-child {
      border-start-end-radius: 0;
      border-end-end-radius: 0;
    }

    &:last-child {
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

    &:active .navbar-switcher_button {
      box-shadow: var(--button-active-shadow);
    }

    &[aria-current='page'] .navbar-switcher_button,
    &[aria-current='page']:hover .navbar-switcher_button {
      cursor: default;
      background: var(--card-color);
      box-shadow: var(--button-pressed-shadow);
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
