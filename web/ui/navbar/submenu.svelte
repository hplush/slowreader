<script lang="ts">
  import { tick } from 'svelte'

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
    children[0]?.focus()
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
    if (!element.contains(document.activeElement)) {
      onExit()
    }
  }
</script>

<div
  bind:this={element}
  role="menu"
  tabindex="-1"
  on:keyup={keyUp}
  on:focusout={onBlur}
>
  <slot />
</div>
