<script lang="ts">
  import { onMount, tick } from 'svelte'

  export let height: number | undefined = undefined
  export let width: number | undefined = undefined
  export let hover: boolean | string = false
  export let focus: boolean | string = false
  export let blur: boolean | string = false
  export let active: boolean | string = false
  export let border: boolean = false
  export let hotkeys: boolean = true
  export let pressKey: string | undefined = undefined

  const INTERACTIVE_ELEMENTS = 'button, a, input, select'

  let section: HTMLElement

  function addClass(option: string | true, cls: string): void {
    let selector: string
    if (option === true) {
      selector = INTERACTIVE_ELEMENTS
    } else {
      selector = option
    }
    for (let el of section.querySelectorAll(selector)) {
      el.classList.add(cls)
    }
  }

  onMount(() => {
    if (hover) addClass(hover, 'is-pseudo-hover')
    if (focus) addClass(focus, 'is-pseudo-focus-visible')
    if (active) addClass(active, 'is-pseudo-active')
    if (!hotkeys) section.classList.add('is-hotkey-disabled')
    if (blur) {
      let selector: string
      if (blur === true) {
        selector = INTERACTIVE_ELEMENTS
      } else {
        selector = blur
      }
      for (let el of section.querySelectorAll<HTMLInputElement>(selector)) {
        el.focus()
        tick().then(() => {
          el.blur()
        })
      }
    }
    if (pressKey) {
      tick().then(() => {
        window.dispatchEvent(new KeyboardEvent('keyup', { key: pressKey }))
      })
    }
  })
</script>

<section
  bind:this={section}
  style="width: {width}px; height: {height}px"
  class:is-bordered={border}
  class:is-sized={width !== undefined || height !== undefined}
>
  <slot />
</section>

<style>
  section {
    position: relative;
    margin-top: 1rem;

    &:first-child {
      margin-top: 0;
    }

    &.is-sized {
      margin-inline: auto;
      transform: scale(1);
    }

    &.is-bordered {
      outline: 1px solid var(--border-color);
    }
  }
</style>
