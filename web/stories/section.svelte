<script lang="ts">
  import { onMount } from 'svelte'

  export let height: number | undefined = undefined
  export let width: number | undefined = undefined
  export let hover: boolean | string = false
  export let focus: boolean | string = false
  export let active: boolean | string = false
  export let border: boolean = false
  export let hotkeys: boolean = true

  let section: HTMLElement

  function addClass(option: string | true, cls: string): void {
    let selector: string
    if (option === true) {
      selector = 'button, a'
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
  })
</script>

<section
  bind:this={section}
  style=" width: {width}px;height: {height}px"
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
    }

    &.is-bordered {
      outline: 1px solid var(--zone-color);
    }
  }
</style>
