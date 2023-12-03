<script lang="ts">
  import { tick } from 'svelte'

  let start = false
  let element: HTMLDivElement

  let prevFocus: HTMLAnchorElement | null = null

  function getCurrent(): HTMLAnchorElement | null {
    return document.activeElement as HTMLAnchorElement
  }

  export async function focus(): Promise<void> {
    if (!element.contains(document.activeElement)) {
      prevFocus = getCurrent()
    }
    await tick()
    let children = element.querySelectorAll<HTMLAnchorElement>('a, button')
    for (let child of children) {
      child.setAttribute('tabindex', '0')
    }
    if (children[0]) {
      children[0].focus()
      start = true
    }
  }

  function onExit(): void {
    let children = element.querySelectorAll<HTMLAnchorElement>('a, button')
    for (let child of children) {
      child.setAttribute('tabindex', '-1')
    }
  }

  function keyUp(e: KeyboardEvent): void {
    let children = element.querySelectorAll<HTMLAnchorElement>('a, button')
    if (e.key === 'Escape') {
      getCurrent()?.blur()
      prevFocus?.focus()
    } else if (e.key === 'Home') {
      e.preventDefault()
      children[0]?.focus()
    } else if (e.key === 'End') {
      e.preventDefault()
      children[children.length - 1]?.focus()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      let prev = (getCurrent()?.previousElementSibling ||
        children[children.length - 1]) as HTMLAnchorElement
      prev.focus()
    } else if (e.key === 'ArrowDown') {
      let prev = (getCurrent()?.nextElementSibling ||
        children[0]) as HTMLAnchorElement
      prev.focus()
    }
  }

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
  on:keyup={keyUp}
  on:focusout={onBlur}
>
  <slot />
</div>

<style>
  .navbar-submenu {
    position: relative;
  }

  .navbar-submenu.is-start::after {
    position: absolute;
    inset-inline-end: calc(-16px - 6px);
    top: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: var(--control-height);
    font: var(--hotkey-font);
    color: var(--hotkey-color);
    content: '↓';
  }
</style>
