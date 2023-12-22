<script lang="ts">
  import { tick } from 'svelte'

  import { generateMenuListeners } from '../../lib/hotkeys.js'

  let start = false
  let element: HTMLDivElement

  export async function focus(): Promise<void> {
    await tick()
    let children = element.querySelectorAll<HTMLAnchorElement>('a, button')
    for (let child of children) {
      child.setAttribute('tabindex', '0')
    }
    if (children[0]) {
      children[0].focus()
      if (children.length > 1) {
        start = true
      }
    }
  }

  function onExit(): void {
    let children = element.querySelectorAll<HTMLAnchorElement>('a, button')
    for (let child of children) {
      child.setAttribute('tabindex', '-1')
    }
  }

  let [onKeyDown, onKeyUp] = generateMenuListeners({
    first() {
      return element.querySelector(':is(a, button):first-child')!
    },
    last() {
      return element.querySelector(':is(a, button):last-child')!
    },
    next(el) {
      return el.nextElementSibling
    },
    prev(el) {
      return el.previousElementSibling
    },
    select() {
      let main = document.querySelector('main')
      if (main) {
        let next = main.querySelector<HTMLButtonElement>(
          'button:not([tabindex="-1"]), ' +
            'a:not([tabindex="-1"]), ' +
            'input:not([tabindex="-1"]), ' +
            '[tabindex="0"]'
        )
        if (next) {
          next.focus()
        }
      }
    }
  })

  function onBlur(): void {
    start = false
    if (!element.contains(document.activeElement)) {
      onExit()
    }
  }
</script>

<div
  bind:this={element}
  class="navbar-submenu"
  class:is-start={start}
  role="menu"
  tabindex="-1"
  on:keyup={onKeyUp}
  on:keydown={onKeyDown}
  on:focusout={onBlur}
>
  <slot />
</div>

<style>
  .navbar-submenu {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .navbar-submenu.is-start::after {
    position: absolute;
    inset-inline-end: var(--padding-m);
    top: calc(var(--control-height) + 2px);
    display: flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: var(--control-height);
    font: var(--hotkey-font);
    color: var(--hotkey-color);
    content: '↓';
  }

  :global(.is-hotkey-disabled) .navbar-submenu.is-start::after {
    display: none;
  }
</style>
